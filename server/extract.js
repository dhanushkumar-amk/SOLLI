import { loadForm, validateAnswer } from './forms/formEngine.js'
import { extractWithProvider } from './llm/index.js'

/**
 * Extracts a structured field value from a spoken transcript using the active LLM provider (or rules fallback)
 * and lightly validates the result against the form schema.
 * @param {string} field - field id (e.g., 'date_of_birth', 'applicant_name')
 * @param {string} transcript - raw spoken transcript from STT
 * @param {Object} [context] - additional field metadata or conversation context
 * @returns {Promise<{ value: any, confidence: number, needsConfirmation: boolean, isCorrection: boolean, command: string|null, reason: string, latencyMs: number, provider: string, valid: boolean, validationError: string|null }>}
 */
export async function extractField(field, transcript, context = {}) {
  const result = await extractWithProvider({ field, transcript, context })

  let valid = true
  let validationError = null

  try {
    const form = loadForm('pension')
    const fieldDef = form.fields.find((f) => f.id === field)
    if (fieldDef) {
      if (result.value !== null && result.value !== undefined) {
        const vResult = validateAnswer(fieldDef, result.value)
        valid = vResult.ok
        validationError = vResult.ok ? null : vResult.error
      } else if (typeof transcript === 'string' && transcript.trim().length > 0) {
        // Spoken or typed input was provided, but could not be parsed into a valid value
        valid = false
        validationError = 'INVALID_FORMAT'
      } else if (fieldDef.required) {
        valid = false
        validationError = 'REQUIRED'
      }
    }
  } catch (_) {
    // Graceful fallback if form definition is unavailable
  }

  return {
    ...result,
    valid,
    validationError,
  }
}
