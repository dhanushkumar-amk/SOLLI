import { parseSpokenNumbers } from '../numbers/parse.js'
import { checkPartialCapture, groupDigits } from '../numbers/chunk.js'
import { validatePhone } from '../../forms/validators.js'

/**
 * Spoken phone number extractor for Solli forms.
 * Handles digits, spoken English/Tamil number words, +91 prefixes,
 * partial digit captures, and enforces confirmation policy.
 */
export function extractPhone(arg1, arg2, arg3) {
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

  // 1. Strip country-code phrases ("plus nine one", "+91", "plus 91", "zero" prefix for trunk calls)
  let cleaned = transcript
    .normalize('NFC')
    .replace(/\b(plus\s+nine\s+one|\+91|plus\s+91)\b/gi, '')
    .trim()

  // 2. Parse spoken numbers into digits
  const parsed = parseSpokenNumbers(cleaned)
  let digits = parsed.digits || ''

  // If leading 0 was used (e.g. 09876543210 -> 11 digits starting with 0), strip the trunk 0
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1)
  }

  // 3. Check for partial capture
  const partialInfo = checkPartialCapture(digits, 10)
  if (partialInfo.partial) {
    return {
      value: null,
      partial: true,
      have: partialInfo.have,
      need: partialInfo.need,
      partialDigits: digits,
      prompt: partialInfo.prompt,
      valid: false,
      validationError: 'PARTIAL_PHONE',
      confidence: 0.6,
      needsConfirmation: true,
      notes: `Captured ${partialInfo.have} of 10 digits`,
      raw: transcript,
    }
  }

  // 4. Validate formatted phone number
  const valResult = validatePhone(digits)

  return {
    value: valResult.ok ? valResult.value : digits || null,
    valid: valResult.ok,
    validationError: valResult.error || null,
    confidence: valResult.ok ? (parsed.ambiguous ? 0.8 : 0.95) : 0.3,
    needsConfirmation: true, // Sensitive field: confirm "always"
    groups: groupDigits(digits, 'phone'),
    notes: valResult.ok ? 'Valid 10-digit phone number' : valResult.error,
    raw: transcript,
  }
}
