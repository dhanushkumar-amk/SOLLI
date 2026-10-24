import { extractWithProvider } from './llm/index.js'

/**
 * Extracts a structured field value from a spoken transcript using the active LLM provider (or rules fallback).
 * @param {string} field - field id (e.g., 'date_of_birth', 'applicant_name')
 * @param {string} transcript - raw spoken transcript from STT
 * @param {Object} [context] - additional field metadata or conversation context
 * @returns {Promise<{ value: any, confidence: number, needsConfirmation: boolean, isCorrection: boolean, command: string|null, reason: string, latencyMs: number, provider: string }>}
 */
export async function extractField(field, transcript, context = {}) {
  return extractWithProvider({ field, transcript, context })
}
