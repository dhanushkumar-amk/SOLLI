import { parseSpokenNumbers } from '../numbers/parse.js'
import { groupDigits } from '../numbers/chunk.js'
import { validateBankAccount } from '../../forms/validators.js'

/**
 * Spoken bank account number extractor for Solli forms.
 * Parses digit sequences and word numbers, strips lead-in phrases,
 * validates length range (9-18 digits), and enforces confirmation policy.
 */
export function extractBankAccount(arg1, arg2, arg3) {
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

  // 1. Strip verbal account prefixes
  const cleaned = transcript
    .normalize('NFC')
    .replace(/\b(account(?:\s+number)?|bank(?:\s+account)?|கணக்கு(?:\s+எண்)?|வங்கி(?:\s+கணக்கு)?)\b/gi, '')
    .trim()

  // 2. Parse spoken numbers into digits
  const parsed = parseSpokenNumbers(cleaned)
  const digits = parsed.digits || ''

  // 3. Validate bank account format
  const minLength = field?.validation?.minDigits || 9
  const maxLength = field?.validation?.maxDigits || 18
  const valResult = validateBankAccount(digits, { minLength, maxLength })

  return {
    value: valResult.ok ? valResult.value : digits || null,
    valid: valResult.ok,
    validationError: valResult.error || null,
    confidence: valResult.ok ? (parsed.ambiguous ? 0.8 : 0.95) : 0.3,
    needsConfirmation: true, // Sensitive field: confirm "always"
    groups: groupDigits(digits, 'bank_account'),
    notes: valResult.ok ? `Valid ${digits.length}-digit bank account` : valResult.error,
    raw: transcript,
  }
}
