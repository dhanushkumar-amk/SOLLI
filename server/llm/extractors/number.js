import { parseSpokenNumbers } from '../numbers/parse.js'
import { validateNumber } from '../../forms/validators.js'

/**
 * Plain number extractor for counts, ages, and income values.
 * Parses cardinal expressions with thousand/lakh/crore support.
 */
export function extractNumber(arg1, arg2, arg3) {
  const transcript = typeof arg1 === 'string' ? arg1 : arg2
  const options = typeof arg1 === 'object' && arg1 !== null ? arg1 : (arg2 || {})
  const field = typeof arg1 === 'object' && arg1 !== null && !options.fieldDef ? arg1 : (options.fieldDef || options)

  if (!transcript || typeof transcript !== 'string') {
    return {
      value: null,
      valid: false,
      validationError: 'EMPTY_INPUT',
      confidence: 0,
      needsConfirmation: false,
      raw: transcript,
    }
  }

  // 1. Parse spoken number
  const parsed = parseSpokenNumbers(transcript)

  if (parsed.value === null || isNaN(parsed.value)) {
    return {
      value: null,
      valid: false,
      validationError: 'NO_NUMBER_FOUND',
      confidence: 0,
      needsConfirmation: true,
      raw: transcript,
    }
  }

  // 2. Validate against field limits (min, max)
  const valResult = validateNumber(parsed.value, field?.validation || {})

  return {
    value: valResult.ok ? valResult.value : parsed.value,
    valid: valResult.ok,
    validationError: valResult.error || null,
    confidence: valResult.ok ? (parsed.ambiguous ? 0.75 : 0.95) : 0.3,
    needsConfirmation: !valResult.ok || field?.confirm === 'always',
    notes: valResult.ok ? `Parsed number: ${valResult.value}` : valResult.error,
    raw: transcript,
  }
}
