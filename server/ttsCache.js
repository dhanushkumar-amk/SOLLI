import crypto from 'node:crypto'

const MAX_CACHE_SIZE = 100

// In-memory cache map: key -> { audioBuffer, mimeType, latencyMs, createdAt }
const cache = new Map()

/**
 * Creates a deterministic SHA-256 hash key for TTS requests
 */
function createKey(text, voice = '', language = '') {
  return crypto
    .createHash('sha256')
    .update(`${text.trim()}::${voice}::${language}`)
    .digest('hex')
}

/**
 * Retrieves cached audio buffer if available and not sensitive
 * @param {string} text
 * @param {Object} options - { voice, language, sensitive }
 * @returns {{ audioBuffer: Buffer, mimeType: string, latencyMs: number } | null}
 */
export function getCachedAudio(text, { voice, language, sensitive } = {}) {
  if (sensitive || !text) return null

  const key = createKey(text, voice, language)
  const entry = cache.get(key)
  if (!entry) return null

  // Re-insert to keep LRU order
  cache.delete(key)
  cache.set(key, entry)
  return entry
}

/**
 * Caches TTS audio buffer if not sensitive
 * @param {string} text
 * @param {Object} options - { voice, language, sensitive }
 * @param {{ audioBuffer: Buffer, mimeType: string, latencyMs: number }} data
 */
export function setCachedAudio(text, { voice, language, sensitive } = {}, data) {
  if (sensitive || !text || !data?.audioBuffer) return

  const key = createKey(text, voice, language)

  // Enforce max cache size (FIFO eviction)
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value
    if (oldestKey) cache.delete(oldestKey)
  }

  cache.set(key, {
    audioBuffer: data.audioBuffer,
    mimeType: data.mimeType || 'audio/wav',
    latencyMs: data.latencyMs || 0,
    createdAt: Date.now(),
  })
}

/**
 * Clears the cache (useful for testing)
 */
export function clearTtsCache() {
  cache.clear()
}

/**
 * Returns cache size and keys (useful for diagnostics/testing)
 */
export function getTtsCacheSize() {
  return cache.size
}
