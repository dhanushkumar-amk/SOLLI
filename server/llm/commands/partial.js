import { cleanUnicodeAndWhitespace } from '../normalize.js'
import { parseSpokenNumbers } from '../numbers/parse.js'

const ORDINAL_MAP = {
  first: 0,
  '1st': 0,
  one: 0,
  modhal: 0,
  mudhal: 0,
  முதல்: 0,

  second: 1,
  '2nd': 1,
  two: 1,
  rendaavadhu: 1,
  இரண்டாவது: 1,

  third: 2,
  '3rd': 2,
  three: 2,
  moonavadhu: 2,
  மூன்றாவது: 2,

  fourth: 3,
  '4th': 3,
  four: 3,
  naalaavadhu: 3,
  நான்காவது: 3,

  fifth: 4,
  '5th': 4,
  five: 4,
  ainjaavadhu: 4,
  ஐந்தாவது: 4,

  sixth: 5,
  '6th': 5,
  six: 5,
  aaraavadhu: 5,
  ஆறாவது: 5,

  seventh: 6,
  '7th': 6,
  seven: 6,
  ezhaavadhu: 6,
  ஏழாவது: 6,

  eighth: 7,
  '8th': 7,
  eight: 7,
  ettaavadhu: 7,
  எட்டாவது: 7,

  ninth: 8,
  '9th': 8,
  nine: 8,
  onbathaavadhu: 8,
  ஒன்பதாவது: 8,

  tenth: 9,
  '10th': 9,
  ten: 9,
  pathaavadhu: 9,
  பத்தாவது: 9,
}

function extractDigit(token) {
  if (!token) return null
  const clean = String(token).trim().toLowerCase()
  if (/^[0-9]$/.test(clean)) return clean
  const parsed = parseSpokenNumbers(clean)
  if (parsed?.digits && parsed.digits.length > 0) {
    return String(parsed.digits).slice(-1)
  }
  if (parsed?.value !== undefined && !isNaN(parsed.value)) {
    return String(parsed.value).slice(-1)
  }
  return null
}

function sliceFromOriginal(raw, substring) {
  if (!raw || !substring) return substring
  const idx = raw.toLowerCase().indexOf(substring.toLowerCase())
  if (idx !== -1) {
    return raw.slice(idx, idx + substring.length).trim()
  }
  return substring
}

/**
 * Handles in-answer partial and digit-level corrections safely.
 *
 * Rules:
 * 1. Digit-level edits ("last digit is 7", "third digit is 5") apply ONLY to numeric fields
 *    and ONLY when an existing currentValue is available.
 * 2. Digit-level edits ALWAYS trigger confirmation (needsConfirmation: true).
 * 3. Whole-value corrections ("the village is X not Y", "three kilo-la illai, two") resolve
 *    to the revised target value.
 * 4. Anything ambiguous or unparseable returns { handled: false }, triggering a clean re-ask.
 *
 * @param {string} transcript - spoken correction transcript
 * @param {Object} params - { currentValue, field }
 * @returns {{ handled: boolean, value?: string, needsConfirmation?: boolean, reason?: string }}
 */
export function handlePartialCorrection(transcript, { currentValue, field } = {}) {
  if (!transcript || typeof transcript !== 'string') {
    return { handled: false }
  }

  const rawClean = cleanUnicodeAndWhitespace(transcript).trim()
  const cleaned = rawClean.toLowerCase()
  if (!cleaned) {
    return { handled: false }
  }

  const isNumericField =
    field &&
    (field.type === 'phone' ||
      field.type === 'aadhaar' ||
      field.type === 'bank_account' ||
      field.type === 'number')

  // --- 1. DIGIT-LEVEL EDITS (Numbers only, requires currentValue) ---
  if (isNumericField && currentValue) {
    const rawDigits = String(currentValue).replace(/\D/g, '')

    // A. "last digit is X" / "last number X" / "kadasila X" / "end number X"
    const lastDigitMatch = cleaned.match(
      /\b(?:last|end|kadasi|kadasila|kadaisi)\s*(?:digit|number|enn|ennu|la)?\s*(?:is|=|:)?\s*([0-9]|zero|one|two|three|four|five|six|seven|eight|nine|பூஜ்ஜியம்|ஒன்று|இரண்டு|மூன்று|நான்கு|ஐந்து|ஆறு|ஏழு|எட்டு|ஒன்பது)\b/i
    )

    if (lastDigitMatch && rawDigits.length > 0) {
      const replacementDigit = extractDigit(lastDigitMatch[1])
      if (replacementDigit !== null) {
        const newDigits = rawDigits.slice(0, -1) + replacementDigit
        return {
          handled: true,
          value: newDigits,
          needsConfirmation: true,
          reason: `Replaced last digit with ${replacementDigit}`,
        }
      }
    }

    // B. "first digit is X" / "first number X" / "modhal number X"
    const firstDigitMatch = cleaned.match(
      /\b(?:first|modhal|mudhal)\s*(?:digit|number|enn)?\s*(?:is|=|:)?\s*([0-9]|zero|one|two|three|four|five|six|seven|eight|nine)\b/i
    )

    if (firstDigitMatch && rawDigits.length > 0) {
      const replacementDigit = extractDigit(firstDigitMatch[1])
      if (replacementDigit !== null) {
        const newDigits = replacementDigit + rawDigits.slice(1)
        return {
          handled: true,
          value: newDigits,
          needsConfirmation: true,
          reason: `Replaced first digit with ${replacementDigit}`,
        }
      }
    }

    // C. Ordinal digit edit: e.g. "third digit is 5", "3rd digit is 5", "moonavadhu number 5"
    const ordinalMatch = cleaned.match(
      /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th|modhal|rendaavadhu|moonavadhu|naalaavadhu|ainjaavadhu)\s*(?:digit|number|enn)?\s*(?:is|=|:)?\s*([0-9]|zero|one|two|three|four|five|six|seven|eight|nine)\b/i
    )

    if (ordinalMatch && rawDigits.length > 0) {
      const ordinalWord = ordinalMatch[1].toLowerCase()
      const targetIdx = ORDINAL_MAP[ordinalWord]

      if (targetIdx !== undefined && targetIdx < rawDigits.length) {
        const replacementDigit = extractDigit(ordinalMatch[2])
        if (replacementDigit !== null) {
          const newDigits =
            rawDigits.slice(0, targetIdx) + replacementDigit + rawDigits.slice(targetIdx + 1)
          return {
            handled: true,
            value: newDigits,
            needsConfirmation: true,
            reason: `Replaced digit at position ${targetIdx + 1} with ${replacementDigit}`,
          }
        }
      }
    }
  }

  // --- 2. WHOLE-VALUE SELF-CORRECTIONS ---

  // A. English contrast: "X not Y" or "the village is X not Y" ("the village is Salem, not Madurai")
  // In English contrast, the first value X is the intended replacement value.
  const englishContrastMatch = rawClean.match(
    /\b(?:the\s+)?(?:village|name|taluk|district|field)?\s*(?:is\s+)?([^,]+?)\s*(?:,\s*|\s+)\b(?:not|instead of)\b\s+(.+)/i
  )
  if (englishContrastMatch) {
    const targetVal = englishContrastMatch[1].trim()
    if (targetVal && targetVal.length >= 1) {
      return {
        handled: true,
        value: targetVal,
        needsConfirmation: true,
        reason: 'Resolved "X not Y" contrast to target X',
      }
    }
  }

  // B. Tamil contrast: "X illa Y" / "X illai Y" / "X-la illai, Y" ("three kilola illai, two", "Madurai illa Salem")
  // In Tamil contrast, the second value Y is the replacement value.
  const tamilContrastMatch = rawClean.match(
    /(.+?)\s*(?:\b(?:la|le|oda)\b\s+)?\b(?:illa|illai|கிடையாது)\b\s*,?\s*(.+)/i
  )
  if (tamilContrastMatch) {
    const revisedVal = tamilContrastMatch[2].trim()
    if (revisedVal && revisedVal.length >= 1) {
      return {
        handled: true,
        value: revisedVal,
        needsConfirmation: true,
        reason: 'Resolved Tamil contrast "X illa Y" to revised value Y',
      }
    }
  }

  // Default: unparseable or unsafe -> return handled: false
  return { handled: false }
}
