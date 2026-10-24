import * as evonApi from './evonApi.js'
import * as evonSelfHost from './evonSelfHost.js'
import * as rules from './rules.js'

export const LLM_CONFIG = {
  timeoutMs: 8000,
}

/**
 * Returns currently configured EVON_PROVIDER ('rules', 'evon-api', or 'evon-selfhost')
 */
export function getSelectedProvider() {
  const envVal = process.env.EVON_PROVIDER
  if (envVal === 'evon-api' || envVal === 'evon-selfhost' || envVal === 'rules') {
    return envVal
  }
  return 'rules'
}

/**
 * Reports configuration status of Evon
 */
export function getEvonStatus() {
  const provider = getSelectedProvider()
  let isConfigured = false

  if (provider === 'rules') {
    isConfigured = true
  } else if (provider === 'evon-api') {
    isConfigured = evonApi.isConfigured()
  } else if (provider === 'evon-selfhost') {
    isConfigured = evonSelfHost.isConfigured()
  }

  return {
    evonProvider: provider,
    evonConfigured: isConfigured,
  }
}

/**
 * Executes a promise with an 8-second timeout guard
 */
function withTimeout(promise, ms = LLM_CONFIG.timeoutMs) {
  let timer
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`Extraction timed out after ${ms}ms`)
      err.name = 'TimeoutError'
      reject(err)
    }, ms)
  })

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer))
}

/**
 * Strips any credential strings from error messages
 */
function sanitizeError(msg) {
  if (!msg) return ''
  return String(msg)
    .replace(/vach_[a-zA-Z0-9_-]+/g, '[REDACTED]')
    .replace(/(Bearer\s+)[a-zA-Z0-9_\-\.]+/gi, '$1[REDACTED]')
}

/**
 * Unified extraction function using the configured provider with automatic fallback to rules
 * @param {Object} params - { field, transcript, context }
 * @returns {Promise<{ value: any, confidence: number, needsConfirmation: boolean, isCorrection: boolean, command: string|null, reason: string, latencyMs: number, provider: string }>}
 */
export async function extractWithProvider({ field, transcript, context = {} }) {
  const provider = getSelectedProvider()

  // If rules is selected directly, execute without fallback wrapping
  if (provider === 'rules') {
    return rules.extract({ field, transcript, context })
  }

  const startTime = Date.now()
  try {
    let client
    if (provider === 'evon-api') {
      client = evonApi
    } else if (provider === 'evon-selfhost') {
      client = evonSelfHost
    } else {
      client = rules
    }

    const result = await withTimeout(client.extract({ field, transcript, context }), LLM_CONFIG.timeoutMs)
    return result
  } catch (err) {
    const safeError = sanitizeError(err.message)
    console.warn(`[llm.fallback] Provider "${provider}" failed (${safeError}). Falling back to rules.`)

    // Fallback to rules baseline
    const fallbackResult = await rules.extract({ field, transcript, context })
    return {
      ...fallbackResult,
      provider: 'rules (fallback)',
      reason: `Fallback to rules: ${safeError}`,
      latencyMs: Date.now() - startTime,
    }
  }
}
