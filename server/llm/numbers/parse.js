import {
  REPETITION_WORDS,
  ENGLISH_DIGITS,
  ENGLISH_TEENS,
  ENGLISH_TENS,
  ENGLISH_SCALES,
  TAMIL_GLYPH_DIGITS,
  TAMIL_DIGITS,
  TAMIL_TEENS,
  TAMIL_TENS,
  TAMIL_SCALES,
} from './lexicon.js'

/**
 * Normalizes text and replaces Tamil numeral glyphs (௧ -> 1).
 */
export function normalizeNumberGlyphs(text) {
  if (!text) return ''
  let out = String(text).normalize('NFC')
  for (const [glyph, digit] of Object.entries(TAMIL_GLYPH_DIGITS)) {
    out = out.replaceAll(glyph, digit)
  }
  return out
}

/**
 * Checks if a token represents a single digit (0-9) via word or char.
 */
function getSingleDigit(token) {
  if (!token) return null
  const t = token.toLowerCase()
  if (/^[0-9]$/.test(t)) return t
  if (ENGLISH_DIGITS[t] !== undefined) return ENGLISH_DIGITS[t]
  if (TAMIL_DIGITS[t] !== undefined) return TAMIL_DIGITS[t]
  return null
}

/**
 * Expands "double 5" -> "5", "5" and "triple zero" -> "0", "0", "0".
 */
export function expandRepetitions(tokens) {
  const result = []
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i].toLowerCase()
    if (REPETITION_WORDS[t] && i + 1 < tokens.length) {
      const count = REPETITION_WORDS[t]
      const nextTok = tokens[i + 1]
      const digit = getSingleDigit(nextTok)
      if (digit !== null) {
        for (let c = 0; c < count; c++) {
          result.push(digit)
        }
        i++ // consume next token
        continue
      }
    }
    result.push(tokens[i])
  }
  return result
}

/**
 * Parses a cardinal token or returns null if not cardinal.
 */
function getCardinalValue(token) {
  const t = token.toLowerCase()
  if (ENGLISH_TEENS[t] !== undefined) return ENGLISH_TEENS[t]
  if (ENGLISH_TENS[t] !== undefined) return ENGLISH_TENS[t]
  if (TAMIL_TEENS[t] !== undefined) return TAMIL_TEENS[t]
  if (TAMIL_TENS[t] !== undefined) return TAMIL_TENS[t]
  if (/^[0-9]+$/.test(t)) return parseInt(t, 10)
  return null
}

/**
 * Returns scale multiplier (hundred, thousand, lakh, crore) or null.
 */
function getScaleMultiplier(token) {
  const t = token.toLowerCase()
  if (ENGLISH_SCALES[t] !== undefined) return ENGLISH_SCALES[t]
  if (TAMIL_SCALES[t] !== undefined) return TAMIL_SCALES[t]
  return null
}

/**
 * Main number parser for Tamil-English code-mixed spoken transcripts.
 * Pure function, zero external dependencies.
 * 
 * Returns: {
 *   digits: string,
 *   value: number | null,
 *   interpretation: "digit_sequence" | "cardinal" | "mixed",
 *   ambiguous: boolean,
 *   notes: string
 * }
 */
export function parseSpokenNumbers(text, options = {}) {
  if (!text || typeof text !== 'string') {
    return {
      digits: '',
      value: null,
      interpretation: null,
      ambiguous: false,
      notes: 'empty_input',
    }
  }

  // 1. Replace Tamil glyph digits and normalize
  const clean = normalizeNumberGlyphs(text)
    .replace(/[,\-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!clean) {
    return {
      digits: '',
      value: null,
      interpretation: null,
      ambiguous: false,
      notes: 'empty_input',
    }
  }

  // 2. Tokenize words and expand repetition markers
  const rawTokens = clean.split(' ').filter(Boolean)
  const tokens = expandRepetitions(rawTokens)

  // 3. Inspect tokens to detect interpretation strategy
  let hasScale = false
  let hasTensOrTeens = false
  let hasDigitsOnly = true
  let digitCount = 0
  let hasRawDigits = false

  for (const tok of tokens) {
    const t = tok.toLowerCase()
    if (getScaleMultiplier(t) !== null) {
      hasScale = true
      hasDigitsOnly = false
    } else if (
      ENGLISH_TEENS[t] !== undefined ||
      ENGLISH_TENS[t] !== undefined ||
      TAMIL_TEENS[t] !== undefined ||
      TAMIL_TENS[t] !== undefined
    ) {
      hasTensOrTeens = true
      hasDigitsOnly = false
    } else if (getSingleDigit(t) !== null) {
      digitCount++
      if (/^[0-9]$/.test(t)) hasRawDigits = true
    } else if (/^[0-9]+$/.test(t)) {
      hasRawDigits = true
      if (t.length > 1) {
        hasDigitsOnly = false
      } else {
        digitCount++
      }
    }
  }

  // Case A: Pure digit sequence (e.g. phone, aadhaar, bank account, pin, repeated digits)
  // If there are no scale words and no tens/teens, extract sequential digits.
  if (!hasScale && !hasTensOrTeens) {
    let digitStr = ''
    for (const tok of tokens) {
      const d = getSingleDigit(tok)
      if (d !== null) {
        digitStr += d
      } else if (/^[0-9]+$/.test(tok)) {
        digitStr += tok
      }
    }

    if (digitStr.length > 0) {
      return {
        digits: digitStr,
        value: Number(digitStr),
        interpretation: 'digit_sequence',
        ambiguous: false,
        notes: `Extracted ${digitStr.length} digits`,
      }
    }
  }

  // Case B: Cardinal or Mixed parsing (e.g. "twenty five", "102", "2 lakh 50 thousand", "rendu latcham")
  let total = 0
  let current = 0
  let tokensParsed = 0
  let ambiguous = false
  let isMixed = hasScale && hasRawDigits

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i].toLowerCase()
    if (tok === 'and' || tok === 'in' || tok === 'la' || tok === 'ரூபாய்' || tok === 'rs') {
      continue // ignore noise / connective words in number phrases
    }

    const scale = getScaleMultiplier(tok)
    if (scale !== null) {
      if (current === 0) current = 1
      total += current * scale
      current = 0
      tokensParsed++
      continue
    }

    const singleD = getSingleDigit(tok)
    if (singleD !== null && !/^[0-9]{2,}$/.test(tok)) {
      const val = parseInt(singleD, 10)
      if (current > 0 && current % 10 === 0 && val < 10) {
        // e.g. twenty + five = 25 or muppadhu + anju = 35
        current += val
      } else {
        current = current * 10 + val
      }
      tokensParsed++
      continue
    }

    const cardVal = getCardinalValue(tok)
    if (cardVal !== null) {
      current += cardVal
      tokensParsed++
      continue
    }
  }

  total += current

  if (tokensParsed > 0) {
    const digits = String(total)
    return {
      digits,
      value: total,
      interpretation: isMixed ? 'mixed' : hasScale || hasTensOrTeens ? 'cardinal' : 'digit_sequence',
      ambiguous,
      notes: `Parsed cardinal total: ${total}`,
    }
  }

  // Fallback: collect any raw digits found
  const rawDigits = clean.replace(/[^0-9]/g, '')
  return {
    digits: rawDigits,
    value: rawDigits ? Number(rawDigits) : null,
    interpretation: rawDigits ? 'digit_sequence' : null,
    ambiguous: true,
    notes: 'fallback_raw_digits',
  }
}
