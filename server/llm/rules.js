// Baseline rule-based extractor (Route A) for Solli form fields

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

const COMMON_FILLERS = [
  /^noise\s+/i,
  /^uh\s+/i,
  /^um\s+/i,
  /^er\s+/i,
  /^ah\s+/i,
]

/**
 * Strips leading fillers and noise tokens
 */
function cleanTranscript(raw) {
  if (!raw) return ''
  let cleaned = String(raw).trim()
  for (const regex of COMMON_FILLERS) {
    cleaned = cleaned.replace(regex, '').trim()
  }
  return cleaned
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
 * Detect explicit conversational commands
 */
function detectCommand(text) {
  const lower = text.toLowerCase()
  if (/^(aama|aamang|aamaa|aama correct|yes|sari|seri|correct|ok|okay)$/i.test(lower)) {
    return 'yes'
  }
  if (/^(illai|illa|illenga|no|wrong|thappu|not correct)$/i.test(lower)) {
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
  let cleaned = cleanTranscript(transcript)

  let isCorrection = false
  // Check for spoken self-correction (e.g. "March la... illai, May 5 1958")
  if (/\b(illai|illa|no|not)\b/i.test(cleaned) && field !== 'readback_confirmation') {
    isCorrection = true
    const parts = cleaned.split(/\b(?:illai|illa|no|not)\b/i)
    if (parts.length > 1 && parts[parts.length - 1].trim()) {
      cleaned = cleanTranscript(parts[parts.length - 1])
    }
  }

  const command = detectCommand(cleaned)
  let value = null
  let confidence = 0.5
  let needsConfirmation = true
  let reason = 'Extracted using baseline rules'

  // If this is a confirmation field (readback)
  if (field === 'readback_confirmation') {
    if (command === 'yes' || /aama|yes|sari|correct/i.test(cleaned)) {
      value = 'yes'
      confidence = 0.95
      needsConfirmation = false
      reason = 'Affirmative response detected'
    } else if (command === 'no' || /illai|illa|no|wrong/i.test(cleaned)) {
      value = 'no'
      confidence = 0.95
      needsConfirmation = false
      reason = 'Negative response detected'
    }
    return {
      value,
      confidence,
      needsConfirmation,
      isCorrection,
      command: value,
      reason,
      latencyMs: Date.now() - startTime,
      provider: 'rules',
    }
  }

  // Handle specific form fields
  switch (field) {
    case 'gender': {
      if (/female|பெண்|^f$/i.test(cleaned)) {
        value = 'Female'
        confidence = 0.95
        needsConfirmation = false
      } else if (/male|ஆண்|^m$/i.test(cleaned)) {
        value = 'Male'
        confidence = 0.95
        needsConfirmation = false
      } else if (/other|மற்றவை/i.test(cleaned)) {
        value = 'Other'
        confidence = 0.9
        needsConfirmation = false
      }
      break
    }

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

    case 'taluk': {
      let t = cleaned.replace(/^(my\s+taluk|taluk)\s+/i, '').trim()
      t = t.replace(/\s+taluk$/i, '')
      t = t.replace(/\s+/g, '') // Test taluk -> Testtaluk
      if (t) {
        value = t
        confidence = 0.85
        needsConfirmation = true
      }
      break
    }

    case 'district': {
      let d = cleaned.replace(/^(en\s+district|district)\s+/i, '').trim()
      d = d.replace(/\s+district$/i, '')
      d = d.replace(/\s+/g, '') // Sample district -> Sampledistrict
      if (d) {
        value = d
        confidence = 0.85
        needsConfirmation = true
      }
      break
    }

    case 'address': {
      let addr = wordsToDigits(cleaned).replace(/^(number|no\.?)\s+/i, '').trim()
      if (addr) {
        value = addr
        confidence = 0.8
        needsConfirmation = true
      }
      break
    }

    case 'parent_spouse_name': {
      let name = cleaned.replace(/^(appa\s+peru|father\s+name|husband\s+name)\s+/i, '').trim()
      if (name) {
        value = name
        confidence = 0.85
        needsConfirmation = true
      }
      break
    }

    case 'nominee': {
      let nom = cleaned.replace(/^(en\s+nominee|nominee)\s+/i, '').trim()
      if (nom) {
        value = nom
        confidence = 0.85
        needsConfirmation = true
      }
      break
    }

    default: {
      // General text / names
      let val = cleaned
      if (val) {
        value = val
        confidence = 0.75
        needsConfirmation = true
      }
      break
    }
  }

  const latencyMs = Date.now() - startTime

  return {
    value,
    confidence,
    needsConfirmation,
    isCorrection,
    command,
    reason,
    latencyMs,
    provider: 'rules',
  }
}
