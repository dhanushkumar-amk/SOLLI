// Stateless form engine for Solli voice form flows

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  maskValue,
  validateAadhaar,
  validateAddress,
  validateBankAccount,
  validateChoice,
  validateDate,
  validateIfsc,
  validateName,
  validateNumber,
  validatePhone,
  validateYesNo,
} from './validators.js'
import { buildDigitReadback } from '../llm/numbers/chunk.js'
import { READBACK_SPEAK_FULL_SENSITIVE } from '../config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const formCache = new Map()

const ALLOWED_TYPES = new Set([
  'text',
  'name',
  'date',
  'number',
  'phone',
  'aadhaar',
  'bank_account',
  'ifsc',
  'yes_no',
  'choice',
  'address',
])

/**
 * Validates a form definition against the Solli schema rules.
 * Throws a comprehensive error listing every violation found.
 */
export function validateFormSchema(form) {
  const errors = []

  if (!form || typeof form !== 'object') {
    throw new Error('Form definition must be a valid JSON object')
  }

  const requiredTopKeys = ['id', 'title', 'titleTa', 'language', 'version', 'source', 'disclaimer', 'fields']
  for (const k of requiredTopKeys) {
    if (!form[k]) {
      errors.push(`Missing required top-level property: "${k}"`)
    }
  }

  if (!Array.isArray(form.fields)) {
    errors.push('Top-level "fields" must be an array')
    throw new Error(`Schema validation failed:\n- ${errors.join('\n- ')}`)
  }

  const seenIds = new Set()
  const seenOrders = new Set()
  const fieldIdSet = new Set(form.fields.map((f) => f?.id).filter(Boolean))

  for (let i = 0; i < form.fields.length; i++) {
    const f = form.fields[i]
    const idx = `Field #${i + 1} (${f?.id || 'unnamed'})`

    if (!f || typeof f !== 'object') {
      errors.push(`${idx}: Field definition is not an object`)
      continue
    }

    // ID validation
    if (!f.id || typeof f.id !== 'string') {
      errors.push(`${idx}: Missing or invalid "id"`)
    } else {
      if (seenIds.has(f.id)) {
        errors.push(`${idx}: Duplicate field id "${f.id}"`)
      }
      seenIds.add(f.id)
    }

    // Order validation
    if (typeof f.order !== 'number' || f.order < 1) {
      errors.push(`${idx}: "order" must be a positive integer`)
    } else {
      if (seenOrders.has(f.order)) {
        errors.push(`${idx}: Duplicate order number "${f.order}"`)
      }
      seenOrders.add(f.order)
    }

    // Type validation
    if (!ALLOWED_TYPES.has(f.type)) {
      errors.push(`${idx}: Invalid field type "${f.type}". Allowed: ${[...ALLOWED_TYPES].join(', ')}`)
    }

    // Labels validation
    if (!f.labels || typeof f.labels !== 'object' || !f.labels.en || !f.labels.ta) {
      errors.push(`${idx}: Missing English or Tamil labels`)
    }

    // Spoken vs Unspoken rules
    if (f.spoken === true) {
      if (!f.question || typeof f.question !== 'object' || !f.question.ta || !f.question.en) {
        errors.push(`${idx}: Spoken field must have question in Tamil and English`)
      }
      if (!f.helpPrompt || typeof f.helpPrompt !== 'object' || !f.helpPrompt.ta || !f.helpPrompt.en) {
        errors.push(`${idx}: Spoken field must have helpPrompt in Tamil and English`)
      }
      if (!f.readback || typeof f.readback !== 'object' || !f.readback.ta || !f.readback.en) {
        errors.push(`${idx}: Spoken field must have readback in Tamil and English`)
      } else {
        if (!f.readback.ta.includes('{value}') || !f.readback.en.includes('{value}')) {
          errors.push(`${idx}: Readback text must contain "{value}" placeholder`)
        }
      }
    } else if (f.spoken === false) {
      if (!f.skipReason || typeof f.skipReason !== 'string' || f.skipReason.trim() === '') {
        errors.push(`${idx}: Unspoken field (spoken: false) must provide a "skipReason"`)
      }
    } else {
      errors.push(`${idx}: Field "spoken" must be boolean (true or false)`)
    }

    // dependsOn validation
    if (f.dependsOn) {
      if (!f.dependsOn.field || !fieldIdSet.has(f.dependsOn.field)) {
        errors.push(`${idx}: dependsOn references non-existent field "${f.dependsOn.field}"`)
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Schema validation failed for form "${form.id}":\n- ${errors.join('\n- ')}`)
  }
}

/**
 * Loads a form JSON from server/forms/${id}.json, validates it, and caches it in memory.
 */
export function loadForm(id) {
  if (formCache.has(id)) {
    return formCache.get(id)
  }

  const filePath = path.resolve(__dirname, `${id}.json`)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Form "${id}" not found at ${filePath}`)
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  let parsed
  try {
    parsed = JSON.parse(content)
  } catch (err) {
    throw new Error(`Failed to parse form JSON for "${id}": ${err.message}`)
  }

  validateFormSchema(parsed)
  // Sort fields by order
  parsed.fields.sort((a, b) => a.order - b.order)

  formCache.set(id, parsed)
  return parsed
}

/**
 * Returns all spoken fields in the form (spoken: true)
 */
export function getSpokenFields(form) {
  return form.fields.filter((f) => f.spoken === true)
}

/**
 * Evaluates whether a field's condition is satisfied given current answers
 */
function isFieldEligible(field, answers) {
  if (!field.dependsOn) return true
  const parentAnswer = answers[field.dependsOn.field]?.value
  return parentAnswer === field.dependsOn.equals
}

/**
 * Determines the next spoken field to ask given current answers and optional current field ID
 */
export function getNextField(form, answers = {}, currentId = null) {
  const spoken = getSpokenFields(form)

  // If a currentId is given, find its index and continue sequentially
  let startIndex = 0
  if (currentId) {
    const curIdx = spoken.findIndex((f) => f.id === currentId)
    if (curIdx !== -1) {
      startIndex = curIdx + 1
    }
  }

  for (let i = startIndex; i < spoken.length; i++) {
    const field = spoken[i]
    if (!isFieldEligible(field, answers)) {
      continue
    }

    const ans = answers[field.id]
    // A field is done if answered with non-null value and confirmed/valid
    if (!ans || ans.value === null || ans.value === undefined) {
      return field
    }
  }

  // If startIndex was > 0, check if earlier unanswered eligible fields exist
  if (startIndex > 0) {
    for (let i = 0; i < startIndex; i++) {
      const field = spoken[i]
      if (isFieldEligible(field, answers)) {
        const ans = answers[field.id]
        if (!ans || ans.value === null || ans.value === undefined) {
          return field
        }
      }
    }
  }

  return null
}

/**
 * Returns progress counts { done, total } for all eligible spoken fields
 */
export function getProgress(form, answers = {}) {
  const spoken = getSpokenFields(form)
  let total = 0
  let done = 0

  for (const field of spoken) {
    if (!isFieldEligible(field, answers)) {
      continue
    }
    total++
    const ans = answers[field.id]
    if (ans && ans.value !== null && ans.value !== undefined) {
      done++
    }
  }

  return { done, total }
}

/**
 * Dispatches an answer to its appropriate type validator
 */
export function validateAnswer(field, rawValue) {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    if (field.required) {
      return {
        ok: false,
        value: null,
        error: 'REQUIRED',
        message: field.errorMessage || { ta: 'இந்த விவரம் தேவை.', en: 'This field is required.' },
      }
    }
    return { ok: true, value: null, error: null, message: null }
  }

  const vConfig = field.validation || {}

  switch (field.type) {
    case 'name':
      return validateName(rawValue)

    case 'date':
      return validateDate(rawValue, {
        minAge: vConfig.minAge ?? 60,
        maxAge: vConfig.maxAge ?? 120,
      })

    case 'phone':
      return validatePhone(rawValue)

    case 'aadhaar':
      return validateAadhaar(rawValue)

    case 'bank_account':
      return validateBankAccount(rawValue, {
        minLength: vConfig.min ?? 9,
        maxLength: vConfig.max ?? 18,
      })

    case 'ifsc':
      return validateIfsc(rawValue)

    case 'choice':
      return validateChoice(rawValue, { choices: vConfig.choices || [] })

    case 'yes_no':
      return validateYesNo(rawValue)

    case 'number':
      return validateNumber(rawValue, { min: vConfig.min, max: vConfig.max })

    case 'address':
      return validateAddress(rawValue, { min: vConfig.min ?? 3, max: vConfig.max ?? 200 })

    case 'text':
    default: {
      const trimmed = String(rawValue).trim()
      const min = vConfig.min ?? 1
      const max = vConfig.max ?? 200
      if (trimmed.length < min || trimmed.length > max) {
        return {
          ok: false,
          value: null,
          error: 'INVALID_LENGTH',
          message: field.errorMessage || {
            ta: `உரை ${min} முதல் ${max} எழுத்துகள் வரை இருக்க வேண்டும்.`,
            en: `Text must be between ${min} and ${max} characters.`,
          },
        }
      }
      return { ok: true, value: trimmed, error: null, message: null }
    }
  }
}

const MONTH_NAMES_EN = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const MONTH_NAMES_TA = [
  '',
  'ஜனவரி',
  'பிப்ரவரி',
  'மார்ச்',
  'ஏப்ரல்',
  'மே',
  'ஜூன்',
  'ஜூலை',
  'ஆகஸ்ட்',
  'செப்டம்பர்',
  'அக்டோபர்',
  'நவம்பர்',
  'டிசம்பர்',
]

export const STATIC_CONFIRM_PROMPT = {
  ta: 'இது சரியா? ஆம் அல்லது இல்லை என்று சொல்லுங்கள்.',
  en: 'Is this correct? Please say yes or no.',
}

/**
 * Formats ISO date (YYYY-MM-DD) into natural spoken date: Day, Month Name, Year.
 * E.g., '1958-05-05' -> '5 மே 1958' (ta) / '5 May 1958' (en).
 */
export function formatDateForReadback(dateStr, lang = 'ta') {
  if (!dateStr) return ''
  const str = String(dateStr).trim()
  const match = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (!match) return str

  const year = match[1]
  const monthNum = parseInt(match[2], 10)
  const day = parseInt(match[3], 10)

  if (monthNum < 1 || monthNum > 12) return str

  const monthName = lang === 'en' ? MONTH_NAMES_EN[monthNum] : MONTH_NAMES_TA[monthNum]
  return `${day} ${monthName} ${year}`
}

/**
 * Formats field value for spoken read-back.
 * Trade-off: On screen, sensitive fields (Phone, Aadhaar, Bank Account) are masked to prevent
 * shoulder-surfing (last 4 digits visible). But for spoken read-back, the speaker must say all
 * digits so the applicant or operator can verify the exact value captured by speech recognition.
 * Config flag READBACK_SPEAK_FULL_SENSITIVE defaults to true for private/operator contexts.
 */
export function formatValueForReadback(field, rawValue, lang = 'ta') {
  if (rawValue === null || rawValue === undefined || rawValue === '') return ''
  if (!field) return String(rawValue)

  if (field.type === 'date') {
    return formatDateForReadback(rawValue, lang)
  }

  if (field.type === 'phone' || field.type === 'aadhaar' || field.type === 'bank_account') {
    if (field.sensitive && !READBACK_SPEAK_FULL_SENSITIVE) {
      // If full sensitive speech is explicitly disabled in config, speak masked form
      const masked = maskValue(rawValue, field.type)
      return masked
    }
    // Speak all digits grouped naturally with pauses
    return buildDigitReadback(rawValue, lang, field.type)
  }

  if (field.type === 'choice') {
    const val = String(rawValue).trim()
    if (lang === 'ta') {
      if (val === 'Female') return 'பெண்'
      if (val === 'Male') return 'ஆண்'
      if (val === 'Other') return 'மற்றவை'
    }
    return val
  }

  return String(rawValue)
}

/**
 * Builds per-field read-back text in Tamil or English from the field's readback template.
 * - Always stays under 200 characters.
 * - Never includes more than one field.
 */
export function buildReadback(field, value, lang = 'ta') {
  if (!field?.readback) return ''
  const template = field.readback[lang] || field.readback.ta || field.readback.en || ''
  const formattedVal = formatValueForReadback(field, value, lang)
  let text = template.replace('{value}', formattedVal)
  if (text.length > 200) {
    text = text.slice(0, 197) + '...'
  }
  return text
}

/**
 * Splits read-back into two parts for optimal TTS caching:
 * 1. dynamic value read-back (never cached, costs credits)
 * 2. static question (cached, zero credits on HIT)
 */
export function getReadbackAudioParts(field, value, lang = 'ta') {
  const fullText = buildReadback(field, value, lang)
  const staticPrompt = STATIC_CONFIRM_PROMPT[lang] || STATIC_CONFIRM_PROMPT.ta

  if (!field?.readback) {
    return {
      valuePrompt: fullText,
      staticConfirmPrompt: staticPrompt,
      fullText,
    }
  }

  const template = field.readback[lang] || field.readback.ta || field.readback.en || ''
  // Strip trailing "சரியா?" or "Is this correct?" to isolate the dynamic statement
  const cleanedTemplate = template
    .replace(/\s*(?:\.\s*)?(?:சரியா\?|Is this correct\?)\s*$/i, '')
    .trim()

  const formattedVal = formatValueForReadback(field, value, lang)
  let valuePrompt = cleanedTemplate.replace('{value}', formattedVal)
  if (valuePrompt && !valuePrompt.endsWith('.')) {
    valuePrompt += '.'
  }

  if (valuePrompt.length > 150) {
    valuePrompt = valuePrompt.slice(0, 147) + '...'
  }

  return {
    valuePrompt,
    staticConfirmPrompt: staticPrompt,
    fullText,
  }
}

/**
 * Builds review summary of answers, strictly masking sensitive fields
 */
export function buildFullSummary(form, answers = {}, lang = 'en') {
  const summary = []

  for (const field of form.fields) {
    const ans = answers[field.id]
    const rawVal = ans?.value ?? null
    const label = field.labels?.[lang] || field.labels?.en || field.id

    let displayVal = ''
    if (rawVal !== null && rawVal !== undefined) {
      if (field.sensitive) {
        displayVal = maskValue(rawVal, field.type)
      } else {
        displayVal = String(rawVal)
      }
    } else {
      displayVal = field.spoken ? (ans?.skipped ? '(Skipped)' : '(Not provided)') : `[${field.skipReason || 'Unspoken'}]`
    }

    summary.push({
      id: field.id,
      label,
      value: rawVal,
      display: displayVal,
      sensitive: Boolean(field.sensitive),
      spoken: Boolean(field.spoken),
      confirmed: Boolean(ans?.confirmed),
      needsOperatorHelp: Boolean(ans?.needsOperatorHelp),
      skipped: Boolean(ans?.skipped),
    })
  }

  return summary
}

/**
 * Returns true if all required spoken fields have valid, confirmed values
 */
export function isComplete(form, answers = {}) {
  const spoken = getSpokenFields(form)
  for (const field of spoken) {
    if (!isFieldEligible(field, answers)) {
      continue
    }
    if (field.required) {
      const ans = answers[field.id]
      if (!ans || ans.value === null || ans.value === undefined) {
        return false
      }
    }
  }
  return true
}
