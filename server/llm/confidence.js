import { CONFIRM_THRESHOLD } from '../config.js'

/**
 * Computes calibrated confidence and evaluates whether confirmation is required.
 *
 * Rules:
 * 1. needsConfirmation is true when:
 *    - confidence < CONFIRM_THRESHOLD (default 0.8) OR
 *    - field's confirm setting is "always" (name, dob, aadhaar, bank, phone) OR
 *    - a conversational self-correction was detected.
 * 2. If confirm setting is explicitly "never" (non-spoken fields), needsConfirmation is false.
 *
 * @param {Object} params
 * @param {any} params.value
 * @param {number} [params.baseConfidence]
 * @param {boolean} [params.isCorrection]
 * @param {boolean} [params.valid]
 * @param {Object} [params.fieldDef]
 * @param {string} [params.rawTranscript]
 * @returns {{ confidence: number, needsConfirmation: boolean }}
 */
export function evaluateConfidenceAndConfirmation({
  value,
  baseConfidence = 0.5,
  isCorrection = false,
  valid = true,
  fieldDef = {},
  rawTranscript = '',
}) {
  if (value === null || value === undefined) {
    return {
      confidence: 0,
      needsConfirmation: false,
    }
  }

  let confidence = baseConfidence

  // Penalty if validator failed
  if (!valid) {
    confidence = Math.min(confidence, 0.4)
  }

  // Slight penalty if correction occurred (acknowledging speech uncertainty)
  if (isCorrection) {
    confidence = Math.max(0.3, confidence - 0.1)
  }

  // Penalty if significant length discrepancy
  if (typeof value === 'string' && typeof rawTranscript === 'string') {
    if (rawTranscript.length > 50 && value.length < 5) {
      confidence = Math.max(0.4, confidence - 0.15)
    }
  }

  confidence = Math.max(0, Math.min(1, Math.round(confidence * 100) / 100))

  // Confirmation policy check
  const confirmSetting = fieldDef?.confirm || 'if_uncertain'

  let needsConfirmation = false
  if (confirmSetting === 'always') {
    needsConfirmation = true
  } else if (confirmSetting === 'never') {
    needsConfirmation = false
  } else {
    // 'if_uncertain'
    needsConfirmation = confidence < CONFIRM_THRESHOLD || isCorrection
  }

  return {
    confidence,
    needsConfirmation,
  }
}
