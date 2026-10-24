import { parseSpokenNumbers } from '../numbers/parse.js'
import { validateIfsc } from '../../forms/validators.js'

/**
 * IFSC code extractor for Solli forms.
 * Handles spoken letter-by-letter branch prefixes ("S B I N") combined with
 * spoken digits ("zero zero zero one two three four").
 */
export function extractIfsc(arg1, arg2, arg3) {
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
      raw: transcript,
    }
  }

  // 1. Clean transcript and strip verbal lead-in ("ifsc", "ifsc code")
  let clean = transcript
    .normalize('NFC')
    .replace(/\b(ifsc(?:\s+code)?|ஐஎப்எஸ்சி)\b/gi, '')
    .trim()

  // 2. Extract leading bank letters (e.g. S B I N -> SBIN, H D F C -> HDFC)
  // Split into tokens
  const tokens = clean.split(/\s+/).filter(Boolean)
  let bankLetters = ''
  let remainderTokens = []

  let collectingLetters = true
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]
    if (collectingLetters && /^[a-zA-Z]{1,4}$/.test(tok)) {
      bankLetters += tok.toUpperCase()
      if (bankLetters.length >= 4) {
        collectingLetters = false
        remainderTokens = tokens.slice(i + 1)
        break
      }
    } else {
      collectingLetters = false
      remainderTokens = tokens.slice(i)
      break
    }
  }

  // If no separate letters, check if the first token is already a 4-letter bank code
  if (bankLetters.length < 4 && tokens.length > 0 && /^[a-zA-Z]{4}/.test(tokens[0])) {
    const m = tokens[0].match(/^([a-zA-Z]{4})(.*)/)
    bankLetters = m[1].toUpperCase()
    remainderTokens = [m[2], ...tokens.slice(1)].filter(Boolean)
  }

  // 3. Parse remaining tokens for branch digits / alphanumeric characters
  const remainderText = remainderTokens.join(' ')
  const parsed = parseSpokenNumbers(remainderText)
  let branchCode = parsed.digits || ''

  // In standard Indian IFSC, the 5th character is always '0' followed by 6 characters (digits or letters)
  // If user said "zero zero zero one two three four" -> "0001234" (7 digits)
  // Join bank letters + branch digits
  let candidate = bankLetters + branchCode

  // Validate format
  const valResult = validateIfsc(candidate)

  return {
    value: valResult.ok ? valResult.value : candidate || null,
    valid: valResult.ok,
    validationError: valResult.error || null,
    confidence: valResult.ok ? 0.9 : 0.4,
    needsConfirmation: true,
    notes: valResult.ok ? 'Valid 11-character IFSC' : valResult.error,
    raw: transcript,
  }
}
