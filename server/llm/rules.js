// Baseline rule-based extractor (Route A) for Solli form fields
import { loadForm } from '../forms/formEngine.js'
import { evaluateConfidenceAndConfirmation } from './confidence.js'
import { getExtractorForType } from './extractors/index.js'
import { normalizeTranscript } from './normalize.js'

const MONTH_NAMES = {
  january: '01', jan: '01',
  february: '02', feb: '02',
  march: '03', mar: '03',
  april: '04', apr: '04',
  may: '05',
  june: '06', jun: '06',
  july: '07', jul: '07',
  august: '08', aug: '08',
  september: '09', sep: '09', sept: '09',
  october: '10', oct: '10',
  november: '11', nov: '11',
  december: '12', dec: '12',
}

const DIGIT_WORDS = {
  zero: '0', one: '1', two: '2', three: '3', four: '4',
  five: '5', six: '6', seven: '7', eight: '8', nine: '9',
}

/**
 * Converts word digits (e.g. "zero zero one") to numeric characters
 */
function wordsToDigits(text) {
  let result = text
  for (const [word, digit] of Object.entries(DIGIT_WORDS)) {
    const wordRegex = new RegExp(`\\b${word}\\b`, 'gi')
    result = result.replace(wordRegex, digit)
  }
  return result
}

/**
 * Parses year words like "nineteen fifty-eight" into "1958"
 */
function parseSpokenYear(text) {
  const match = text.match(/\bnineteen\s+(fifty|sixty|seventy|eighty|ninety)[\s-]?([a-z]+)?\b/i)
  if (!match) return text

  const tensMap = { fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 }
  const unitsMap = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 }

  const tens = tensMap[match[1].toLowerCase()] || 0
  const units = match[2] ? unitsMap[match[2].toLowerCase()] || 0 : 0
  const year = 1900 + tens + units

  return text.replace(match[0], String(year))
}

/**
 * Extract date from spoken transcript and format as YYYY-MM-DD
 */
function extractDate(text) {
  let t = parseSpokenYear(text)
  t = wordsToDigits(t)
  t = t.replace(/\bla\b/gi, '').replace(/\bth\b/gi, '').replace(/\bst\b/gi, '').replace(/\bnd\b/gi, '').replace(/\brd\b/gi, '')

  // Find 4-digit year
  const yearMatch = t.match(/\b(19\d{2}|20\d{2})\b/)
  const year = yearMatch ? yearMatch[1] : null

  // Find month
  let month = null
  for (const [name, num] of Object.entries(MONTH_NAMES)) {
    if (new RegExp(`\\b${name}\\b`, 'i').test(t)) {
      month = num
      break
    }
  }

  // Find day (1-31)
  let day = null
  const dayTokens = t.replace(year || '', '').split(/\s+/).filter(Boolean)
  for (const token of dayTokens) {
    const num = parseInt(token, 10)
    if (!isNaN(num) && num >= 1 && num <= 31) {
      day = String(num).padStart(2, '0')
      break
    }
  }

  if (year && month && day) {
    return `${year}-${month}-${day}`
  }
  return null
}

/**
 * Detect conversational intent or navigational command
 */
function detectCommand(text) {
  const lower = text.toLowerCase().trim()
  if (/^(yes|aama|aamam|sari|correct|ok)$/i.test(lower)) {
    return 'yes'
  }
  if (/^(no|illai|illa|wrong|ille)$/i.test(lower)) {
    return 'no'
  }
  if (/marubadiyum|repeat|one more time|again|enna sonneenga/i.test(lower)) {
    return 'repeat'
  }
  if (/skip|adutha kelvi|next question|vittudu|pass/i.test(lower)) {
    return 'skip'
  }
  if (/theriyadhu|therila|don't know|dont know|puriyala/i.test(lower)) {
    return 'dont_know'
  }
  if (/change|maathu|maathunga|correct pannanum/i.test(lower)) {
    return 'change_field'
  }
  return null
}

/**
 * Main baseline extraction logic
 */
export async function extract({ field, transcript, context = {} }) {
  const startTime = Date.now()

  // 1. Run normalization pipeline (Unicode NFC, noise check, self-correction, fillers)
  const norm = normalizeTranscript(transcript)
  if (norm.isNoise) {
    return {
      value: null,
      confidence: 0,
      needsConfirmation: false,
      isCorrection: false,
      command: null,
      reason: 'Noise-only or empty transcript detected',
      latencyMs: Date.now() - startTime,
      provider: 'rules',
    }
  }

  let cleaned = norm.text
  const isCorrection = norm.isCorrection
  const command = detectCommand(cleaned)

  // 2. Identify field definition and type
  let fieldDef = context.fieldDef
  if (!fieldDef) {
    if (field === 'readback_confirmation') {
      fieldDef = { id: 'readback_confirmation', type: 'yes_no', confirm: 'never' }
    } else {
      try {
        const form = loadForm('pension')
        fieldDef = form.fields.find((f) => f.id === field)
      } catch (_) {}
    }
  }

  const fieldType = fieldDef?.type || (field === 'readback_confirmation' ? 'yes_no' : 'text')

  // 3. Check for dedicated type extractor in registry (name, text, address, yes_no, choice)
  const dedicatedExtractor = getExtractorForType(fieldType)
  if (dedicatedExtractor) {
    const extResult = dedicatedExtractor(cleaned, { fieldDef, context })
    const confEval = evaluateConfidenceAndConfirmation({
      value: extResult.value,
      baseConfidence: extResult.confidence,
      isCorrection,
      valid: extResult.value !== null,
      fieldDef,
      rawTranscript: transcript,
    })

    return {
      value: extResult.value,
      confidence: confEval.confidence,
      needsConfirmation: isCorrection ? true : confEval.needsConfirmation,
      isCorrection,
      command,
      reason: extResult.reason,
      latencyMs: Date.now() - startTime,
      provider: 'rules',
    }
  }

  // 4. Fallback to specific Phase 6/7 extractors for dates, numbers, phone, aadhaar, bank_account
  let value = null
  let confidence = 0.5
  let needsConfirmation = true
  let reason = 'Extracted using baseline rules'

  switch (field) {
    case 'date_of_birth': {
      const parsedDate = extractDate(cleaned)
      if (parsedDate) {
        value = parsedDate
        confidence = isCorrection ? 0.85 : 0.9
        needsConfirmation = isCorrection
        reason = isCorrection ? 'Date parsed with self-correction' : 'Date parsed into ISO-8601'
      }
      break
    }

    case 'phone': {
      let digits = wordsToDigits(cleaned).replace(/\D/g, '')
      if (digits.length > 0) {
        value = digits.length === 10 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits
        confidence = digits.length === 10 ? 0.9 : 0.4
        needsConfirmation = true
        reason = digits.length === 10 ? '10-digit phone number formatted with space' : 'Incomplete or invalid phone digits extracted'
      }
      break
    }

    case 'bank_account': {
      let digits = wordsToDigits(cleaned).replace(/\D/g, '')
      if (digits.length > 0) {
        value = digits
        confidence = digits.length >= 9 && digits.length <= 18 ? 0.85 : 0.4
        needsConfirmation = true
        reason = 'Bank account digits extracted'
      }
      break
    }

    case 'aadhaar': {
      let digits = wordsToDigits(cleaned).replace(/\D/g, '')
      if (digits.length > 0) {
        value = digits.length === 12 ? `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}` : digits
        confidence = digits.length === 12 ? 0.9 : 0.4
        needsConfirmation = true
        reason = digits.length === 12 ? '12-digit Aadhaar formatted in 4-digit groups' : 'Invalid length Aadhaar digits extracted'
      }
      break
    }

    default: {
      if (cleaned) {
        value = cleaned
        confidence = 0.75
        needsConfirmation = true
      }
      break
    }
  }

  const confEval = evaluateConfidenceAndConfirmation({
    value,
    baseConfidence: confidence,
    isCorrection,
    valid: value !== null,
    fieldDef,
    rawTranscript: transcript,
  })

  return {
    value,
    confidence: confEval.confidence,
    needsConfirmation: isCorrection ? true : confEval.needsConfirmation,
    isCorrection,
    command,
    reason,
    latencyMs: Date.now() - startTime,
    provider: 'rules',
  }
}
