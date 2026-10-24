import { GNANI_CONFIG, getApiKey } from './config.js'

/**
 * Strips any potential sensitive key references from error strings
 */
function sanitizeMessage(message, apiKey) {
  if (!message) return ''
  let sanitized = String(message)
  if (apiKey) {
    sanitized = sanitized.split(apiKey).join('[REDACTED]')
  }
  return sanitized
}

/**
 * Maps HTTP status and response payload into clear, safe error messages
 */
function handleGnaniError(status, data, apiKey) {
  let apiMsg = ''
  if (data) {
    if (typeof data === 'object') {
      apiMsg = data.error?.message || data.message || JSON.stringify(data)
    } else {
      apiMsg = String(data)
    }
  }
  apiMsg = sanitizeMessage(apiMsg, apiKey)

  if (status === 401) {
    throw new Error('Gnani API authentication failed (401): invalid or missing API key')
  }
  if (status === 402 || status === 429) {
    throw new Error(`Gnani API credit exhausted or rate limit reached (${status}): ${apiMsg || 'Too many requests or insufficient credits'}`)
  }
  if (status >= 400 && status < 500) {
    throw new Error(`Gnani API bad request (${status}): ${apiMsg || 'Invalid parameters or unsupported audio format'}`)
  }
  if (status >= 500) {
    throw new Error(`Gnani API server error (${status}): ${apiMsg || 'Service temporarily unavailable'}`)
  }
  throw new Error(`Gnani API request failed with status ${status}: ${apiMsg}`)
}

/**
 * Transcribe audio using Gnani Prisma v2.5 STT REST endpoint
 * @param {Buffer} audioBuffer - raw audio file bytes
 * @param {Object} options - { mimeType, language }
 * @returns {Promise<{ text: string, raw: Object, latencyMs: number }>}
 */
export async function transcribe(audioBuffer, { mimeType = 'audio/wav', language } = {}) {
  const apiKey = getApiKey()
  const targetLang = language || GNANI_CONFIG.defaultLanguage
  const endpointUrl = `${GNANI_CONFIG.baseUrl}${GNANI_CONFIG.endpoints.stt}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GNANI_CONFIG.timeoutMs)

  const startTime = Date.now()
  let status = null

  try {
    const formData = new FormData()
    const blob = new Blob([audioBuffer], { type: mimeType })
    formData.append('audio_file', blob, 'audio.wav')
    formData.append('language_code', targetLang)
    formData.append('format', GNANI_CONFIG.prismaDefaults.format)
    if (GNANI_CONFIG.prismaDefaults.itnNativeNumerals) {
      formData.append('itn_native_numerals', 'true')
    }

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'X-API-Key-ID': apiKey,
      },
      body: formData,
      signal: controller.signal,
    })

    status = response.status
    const latencyMs = Date.now() - startTime

    if (!response.ok) {
      let errBody
      try {
        errBody = await response.json()
      } catch {
        errBody = await response.text()
      }
      handleGnaniError(response.status, errBody, apiKey)
    }

    const data = await response.json()

    // Safe logging: function name, language, audio byte size, latencyMs, and status
    console.log(
      `[gnani.transcribe] language=${targetLang} bytes=${audioBuffer?.length ?? 0} latencyMs=${latencyMs} status=${status}`
    )

    return {
      text: data.transcript ?? '',
      raw: data,
      latencyMs,
    }
  } catch (error) {
    const latencyMs = Date.now() - startTime
    if (error.name === 'AbortError') {
      throw new Error(`Gnani STT timed out after ${GNANI_CONFIG.timeoutMs}ms`)
    }
    // Ensure key never appears in thrown errors
    const safeMsg = sanitizeMessage(error.message, apiKey)
    console.error(`[gnani.transcribe] failed language=${targetLang} bytes=${audioBuffer?.length ?? 0} latencyMs=${latencyMs} status=${status} error=${safeMsg}`)
    throw new Error(safeMsg)
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Synthesize speech using Gnani Timbre v3.0 TTS REST endpoint
 * @param {string} text - text to synthesize (<= 300 chars)
 * @param {Object} options - { voice, language }
 * @returns {Promise<{ audioBuffer: Buffer, mimeType: string, latencyMs: number }>}
 */
export async function speak(text, { voice, language } = {}) {
  const apiKey = getApiKey()
  const targetVoice = voice || GNANI_CONFIG.timbreDefaults.voice
  const targetLang = language || GNANI_CONFIG.timbreDefaults.language
  const endpointUrl = `${GNANI_CONFIG.baseUrl}${GNANI_CONFIG.endpoints.tts}`

  if (!text || typeof text !== 'string') {
    throw new Error('Text parameter is required for TTS')
  }
  if (text.length > GNANI_CONFIG.maxTtsChars) {
    throw new Error(`Text exceeds maximum allowed length of ${GNANI_CONFIG.maxTtsChars} characters`)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GNANI_CONFIG.timeoutMs)

  const startTime = Date.now()
  let status = null

  try {
    const payload = {
      text,
      voice: targetVoice,
      model: GNANI_CONFIG.timbreDefaults.model,
      language: targetLang,
      speed: GNANI_CONFIG.timbreDefaults.speed,
      audio_config: GNANI_CONFIG.timbreDefaults.audioConfig,
    }

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key-ID': apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    status = response.status
    const latencyMs = Date.now() - startTime

    if (!response.ok) {
      let errBody
      try {
        errBody = await response.json()
      } catch {
        errBody = await response.text()
      }
      handleGnaniError(response.status, errBody, apiKey)
    }

    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = Buffer.from(arrayBuffer)
    const mimeType = response.headers.get('content-type') || 'audio/wav'

    // Safe logging: function name, language, audio byte size, latencyMs, and status
    console.log(
      `[gnani.speak] language=${targetLang} bytes=${audioBuffer.length} latencyMs=${latencyMs} status=${status}`
    )

    return {
      audioBuffer,
      mimeType,
      latencyMs,
    }
  } catch (error) {
    const latencyMs = Date.now() - startTime
    if (error.name === 'AbortError') {
      throw new Error(`Gnani TTS timed out after ${GNANI_CONFIG.timeoutMs}ms`)
    }
    const safeMsg = sanitizeMessage(error.message, apiKey)
    console.error(`[gnani.speak] failed language=${targetLang} textLength=${text.length} latencyMs=${latencyMs} status=${status} error=${safeMsg}`)
    throw new Error(safeMsg)
  } finally {
    clearTimeout(timer)
  }
}
