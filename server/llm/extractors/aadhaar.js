import { parseSpokenNumbers } from '../numbers/parse.js'
import { checkPartialCapture, groupDigits } from '../numbers/chunk.js'
import { validateAadhaar } from '../../forms/validators.js'

/**
 * Spoken Aadhaar number extractor for Solli forms.
 * Format check only; never claims live identity verification.
 * Verhoeff checksum disabled by default to avoid rejecting mock/fake inputs.
 */
export function extractAadhaar(arg1, arg2, arg3) {
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

  // 1. Strip common verbal prefixes ("aadhaar number", "aadhaar en")
  const cleaned = transcript
    .normalize('NFC')
    .replace(/\b(aadhaar(?:\s+number|\s+en)?|ஆதார்(?:\s+எண்)?)\b/gi, '')
    .trim()

  // 2. Parse spoken numbers into digits
  const parsed = parseSpokenNumbers(cleaned)
  const digits = parsed.digits || ''

  // 3. Check for partial capture (needs 12 digits)
  const partialInfo = checkPartialCapture(digits, 12)
  if (partialInfo.partial) {
    return {
      value: null,
      partial: true,
      have: partialInfo.have,
      need: partialInfo.need,
      partialDigits: digits,
      prompt: partialInfo.prompt,
      valid: false,
      validationError: 'PARTIAL_AADHAAR',
      confidence: 0.6,
      needsConfirmation: true,
      notes: `Captured ${partialInfo.have} of 12 digits`,
      raw: transcript,
    }
  }

  // 4. Validate Aadhaar format (12 digits, grouped 4+4+4)
  const valResult = validateAadhaar(digits, { checkVerhoeff: false })

  return {
    value: valResult.ok ? valResult.value : digits || null,
    valid: valResult.ok,
    validationError: valResult.error || null,
    confidence: valResult.ok ? (parsed.ambiguous ? 0.8 : 0.95) : 0.3,
    needsConfirmation: true, // Sensitive field: confirm "always"
    groups: groupDigits(digits, 'aadhaar'),
    notes: valResult.ok ? 'Valid 12-digit Aadhaar format' : valResult.error,
    raw: transcript,
  }
}
