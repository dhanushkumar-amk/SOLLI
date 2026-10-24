import { MONTHS_MAP } from '../numbers/lexicon.js'
import { parseSpokenNumbers } from '../numbers/parse.js'
import { normalizeTranscript } from '../normalize.js'
import { validateDate } from '../../forms/validators.js'

/**
 * Parses spoken year phrases like "nineteen fifty-eight", "twenty twenty", "1958".
 */
function parseSpokenYear(text) {
  if (!text) return null

  // 4-digit numeric year
  const numYear = text.match(/\b(19\d{2}|20\d{2})\b/)
  if (numYear) return { year: numYear[1], raw: numYear[0] }

  // Spoken English compound years: "nineteen [tens] [units]"
  const nineteenMatch = text.match(
    /\bnineteen\s+(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[\s-]+(one|two|three|four|five|six|seven|eight|nine))?\b/i
  )
  if (nineteenMatch) {
    const tensMap = {
      twenty: 20,
      thirty: 30,
      forty: 40,
      fifty: 50,
      sixty: 60,
      seventy: 70,
      eighty: 80,
      ninety: 90,
    }
    const unitsMap = {
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5,
      six: 6,
      seven: 7,
      eight: 8,
      nine: 9,
    }
    const tens = tensMap[nineteenMatch[1].toLowerCase()] || 0
    const units = nineteenMatch[2] ? unitsMap[nineteenMatch[2].toLowerCase()] || 0 : 0
    return { year: String(1900 + tens + units), raw: nineteenMatch[0] }
  }

  // Spoken "twenty twenty" / "twenty twenty-one" etc.
  const twentyMatch = text.match(
    /\btwenty\s+(twenty|twenty-one|twenty-two|twenty-three|twenty-four|twenty-five|twenty-six|twenty-seven|twenty-eight|twenty-nine)\b/i
  )
  if (twentyMatch) {
    const map = {
      'twenty': '2020',
      'twenty-one': '2021',
      'twenty-two': '2022',
      'twenty-three': '2023',
      'twenty-four': '2024',
      'twenty-five': '2025',
    }
    const y = map[twentyMatch[1].toLowerCase()]
    if (y) return { year: y, raw: twentyMatch[0] }
  }

  return null
}

/**
 * Checks for age-only utterances ("enakku 70 vayasu", "age 65", "68 years old").
 */
function detectAgeOnly(text) {
  const m = text.match(
    /(?:enakku|age|vayasu|வயது|years old|varudam)\s*[:=]?\s*(\d{1,3})|(\d{1,3})\s*(?:vayasu|வயது|years old|varudam)/i
  )
  if (m) {
    const ageNum = parseInt(m[1] || m[2], 10)
    if (ageNum >= 1 && ageNum <= 125) {
      return ageNum
    }
  }

  // Pure single or two digit number when prompt asked for date of birth
  const parsed = parseSpokenNumbers(text)
  if (parsed.value && parsed.value >= 18 && parsed.value <= 110) {
    if (/(vayasu|வயது|age|years)/i.test(text)) {
      return parsed.value
    }
  }

  return null
}

/**
 * Date extractor for Solli forms.
 * Handles Tamil-English code-mixed spoken dates, month-name mapping,
 * age-only detection, partial dates, and DD/MM vs MM/DD ambiguity.
 */
export function extractDate(arg1, arg2, arg3) {
  const transcript = typeof arg1 === 'string' ? arg1 : arg2
  const options = typeof arg1 === 'object' && arg1 !== null ? arg1 : (arg2 || {})
  const field = typeof arg1 === 'object' && arg1 !== null && !options.fieldDef ? arg1 : (options.fieldDef || options)

  if (!transcript || typeof transcript !== 'string') {
    return {
      value: null,
      valid: false,
      validationError: 'EMPTY_INPUT',
      confidence: 0,
      needsConfirmation: true,
      isCorrection: false,
      raw: transcript,
    }
  }

  const norm = normalizeTranscript(transcript)
  const clean = norm.text || transcript.normalize('NFC').trim()
  const isCorrection = norm.isCorrection

  // 1. Check for age-only answers
  const ageOnly = detectAgeOnly(clean)
  if (ageOnly !== null) {
    return {
      value: null,
      type: 'age_only',
      age: ageOnly,
      valid: false,
      validationError: 'AGE_ONLY_PROVIDED',
      confidence: 0.6,
      needsConfirmation: true,
      notes: `Applicant provided age (${ageOnly}) instead of full date of birth. Do not fabricate birth date.`,
      raw: clean,
    }
  }

  // 2. Identify month (name or number)
  let month = null
  let monthNameFound = null
  for (const [name, num] of Object.entries(MONTHS_MAP)) {
    const regex = new RegExp(`(^|\\s|[.,/])${name}($|\\s|[.,/])`, 'i')
    if (regex.test(clean)) {
      month = String(num).padStart(2, '0')
      monthNameFound = name
      break
    }
  }

  // 3. Identify Year
  const yearInfo = parseSpokenYear(clean)
  let year = yearInfo ? yearInfo.year : null
  let rawYearText = yearInfo ? yearInfo.raw : null
  let twoDigitYear = null

  if (!year) {
    // Check for 2-digit year (e.g. "58", "62")
    const twoDMatch = clean.match(/\b([3-9]\d|0\d|1\d|2\d)\b/)
    if (twoDMatch && monthNameFound) {
      const val = parseInt(twoDMatch[1], 10)
      if (val >= 15 && val <= 99) {
        twoDigitYear = twoDMatch[1]
      }
    }
  }

  // 4. Numeric Slash/Dash/Dot format e.g. "05/05/1958" or "15-08-1947"
  const slashMatch = clean.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})\b/)
  if (slashMatch) {
    const p1 = parseInt(slashMatch[1], 10)
    const p2 = parseInt(slashMatch[2], 10)
    const yr = slashMatch[3]

    // Assume DD/MM (Indian convention)
    let d = p1
    let m = p2
    let isAmbiguous = false

    // If both <= 12, ambiguous between DD/MM and MM/DD
    if (p1 <= 12 && p2 <= 12) {
      isAmbiguous = true
    } else if (p1 > 12 && p2 <= 12) {
      d = p1
      m = p2
    } else if (p1 <= 12 && p2 > 12) {
      // MM/DD entered
      m = p1
      d = p2
    }

    const iso = `${yr}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const valResult = validateDate(iso, field?.validation || {})
    return {
      value: valResult.ok ? valResult.value : null,
      valid: valResult.ok,
      validationError: valResult.error || null,
      confidence: isAmbiguous ? 0.7 : valResult.ok ? 0.95 : 0.2,
      needsConfirmation: true, // Dates always need confirmation in pension flow
      ambiguous: isAmbiguous,
      isCorrection,
      notes: isAmbiguous ? 'DD/MM vs MM/DD ambiguity flagged' : 'Numeric date matched',
      raw: clean,
    }
  }

  // 5. Month name + day + year
  if (month && year) {
    // Look for day (1-31)
    let day = null
    const textWithoutYearAndMonth = clean
      .replace(rawYearText || year, '')
      .replace(new RegExp(monthNameFound, 'i'), '')
      .replace(/\b(th|st|nd|rd|la|தேதி|ஆம்)\b/gi, '')

    // Check for digits or spoken digit words
    const parsedNums = parseSpokenNumbers(textWithoutYearAndMonth)
    if (parsedNums.value && parsedNums.value >= 1 && parsedNums.value <= 31) {
      day = String(parsedNums.value).padStart(2, '0')
    } else {
      const dayMatch = textWithoutYearAndMonth.match(/\b([1-9]|[12]\d|3[01])\b/)
      if (dayMatch) {
        day = String(parseInt(dayMatch[1], 10)).padStart(2, '0')
      }
    }

    if (day) {
      const iso = `${year}-${month}-${day}`
      const valResult = validateDate(iso, field?.validation || {})
      return {
        value: valResult.ok ? valResult.value : null,
        valid: valResult.ok,
        validationError: valResult.error || null,
        confidence: valResult.ok ? 0.95 : 0.2,
        needsConfirmation: true,
        notes: valResult.ok ? 'Full date extracted from month name and year' : valResult.error,
        raw: clean,
      }
    }

    // Month + Year present, Day missing
    return {
      value: null,
      partial: true,
      missing: ['day'],
      valid: false,
      validationError: 'MISSING_DAY',
      confidence: 0.7,
      needsConfirmation: true,
      notes: `Month (${month}) and Year (${year}) detected; Day missing.`,
      raw: clean,
    }
  }

  // 6. Year only
  if (year && !month) {
    return {
      value: null,
      partial: true,
      missing: ['month', 'day'],
      valid: false,
      validationError: 'MISSING_MONTH_AND_DAY',
      confidence: 0.7,
      needsConfirmation: true,
      notes: `Year (${year}) detected; Month and Day missing.`,
      raw: clean,
    }
  }

  // 7. Two digit year handling (do not guess century silently)
  if (twoDigitYear) {
    return {
      value: null,
      partial: true,
      ambiguous: true,
      twoDigitCandidates: [`19${twoDigitYear}`, `20${twoDigitYear}`],
      valid: false,
      validationError: 'TWO_DIGIT_YEAR_AMBIGUOUS',
      confidence: 0.5,
      needsConfirmation: true,
      notes: `Two-digit year (${twoDigitYear}) requires explicit confirmation of century (19${twoDigitYear} vs 20${twoDigitYear}).`,
      raw: clean,
    }
  }

  return {
    value: null,
    valid: false,
    validationError: 'UNPARSEABLE_DATE',
    confidence: 0.1,
    needsConfirmation: true,
    raw: clean,
  }
}
