import { CONFIRM_THRESHOLD } from '../config.js'

/**
 * Pure confirmation policy evaluator for Solli form fields.
 *
 * Rules:
 * 1. field.confirm === "always" -> true
 * 2. field.confirm === "never":
 *    - false if valid and confident (confidence >= CONFIRM_THRESHOLD and no correction)
 *    - true if invalid, correction detected, or confidence < CONFIRM_THRESHOLD
 * 3. field.confirm === "if_uncertain" (default):
 *    - true if extractionResult.needsConfirmation === true
 *    - true if extractionResult.confidence < CONFIRM_THRESHOLD
 *    - true if extractionResult.isCorrection === true
 *    - true if extractionResult.valid === false
 *    - false otherwise
 *
 * @param {Object} field - field schema definition from pension.json
 * @param {Object} extractionResult - output from extractField or extractWithProvider
 * @param {number} [threshold] - override confirmation threshold (defaults to CONFIRM_THRESHOLD)
 * @returns {boolean}
 */
export function shouldConfirm(field = {}, extractionResult = {}, threshold = CONFIRM_THRESHOLD) {
  const result = extractionResult || {}
  const confirmSetting = field?.confirm || 'if_uncertain'
  const confidence = typeof result.confidence === 'number' ? result.confidence : 0
  const isCorrection = Boolean(result.isCorrection)
  const needsConfirmation = Boolean(result.needsConfirmation)
  const isValid = result.valid !== false

  // Rule 1: "always" requires explicit confirmation
  if (confirmSetting === 'always') {
    return true
  }

  // Rule 2: "never" skips confirmation ONLY when result is valid, confident, and no correction occurred
  if (confirmSetting === 'never') {
    if (isValid && confidence >= threshold && !isCorrection && !needsConfirmation) {
      return false
    }
    // If invalid or uncertain despite confirm="never", require confirmation/clarification
    return true
  }

  // Rule 3: "if_uncertain" (or default)
  if (needsConfirmation) {
    return true
  }

  if (isCorrection) {
    return true
  }

  if (confidence < threshold) {
    return true
  }

  if (!isValid) {
    return true
  }

  return false
}
