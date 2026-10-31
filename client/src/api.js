// Client API helpers for talking to the Solli Express backend with offline fallbacks
import { BUILTIN_SCHEMAS, getActiveCustomSchema } from './forms/index.js'

export const API_BASE =
  typeof window !== 'undefined' && window.chrome?.runtime?.id
    ? (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:5000'
    : (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || ''

export async function getHealth() {
  const response = await fetch(`${API_BASE}/api/health`)
  if (!response.ok) throw new Error('Health check failed')
  return response.json()
}

export async function getStats() {
  const response = await fetch(`${API_BASE}/api/stats`)
  if (!response.ok) throw new Error('Failed to fetch stats')
  return response.json()
}

/**
 * Transcribe recorded audio
 */
export async function transcribeAudio(audioBlob, language = 'ta-IN', { signal } = {}) {
  const formData = new FormData()
  formData.append('audio_file', audioBlob, 'recording.wav')
  if (language) {
    formData.append('language', language)
  }

  try {
    const response = await fetch(`${API_BASE}/api/transcribe`, {
      method: 'POST',
      body: formData,
      signal,
    })

    if (!response.ok) {
      let errMsg = 'Transcription failed'
      try {
        const errData = await response.json()
        errMsg = errData.error || errMsg
      } catch (_) {}
      const error = new Error(errMsg)
      error.status = response.status
      throw error
    }

    return await response.json()
  } catch (err) {
    if (err.name === 'AbortError') throw err
    // If backend is offline, return fallback message so session continues
    return {
      text: '',
      latencyMs: 10,
      offline: true,
    }
  }
}

/**
 * Synthesize speech from text with browser Web Speech API fallback
 */
export async function synthesizeSpeech(
  text,
  { voice, language, sensitive = false, noCache = false, isReadback = false, signal } = {}
) {
  const startTime = Date.now()

  try {
    const response = await fetch(`${API_BASE}/api/speak`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, voice, language, sensitive, noCache, isReadback }),
      signal,
    })

    if (response.ok) {
      const latencyMs = Number(response.headers.get('X-Latency-Ms')) || Date.now() - startTime
      const cacheHit = response.headers.get('X-Cache') === 'HIT'
      const audioBlob = await response.blob()
      return { audioBlob, latencyMs, cacheHit }
    }
  } catch (err) {
    if (err.name === 'AbortError') throw err
  }

  // Fallback: Use browser native SpeechSynthesis when backend is offline
  if (typeof window !== 'undefined' && 'speechSynthesis' in window && text) {
    try {
      const utter = new SpeechSynthesisUtterance(text.replace(/\{value\}/g, ''))
      utter.lang = /[\u0B80-\u0BFF]/.test(text) ? 'ta-IN' : 'en-IN'
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(utter)
    } catch (_) {}
  }

  // Return minimal 100ms silent audio blob so Audio player completes naturally
  const silentWav = createSilentWavBlob(0.4)
  return { audioBlob: silentWav, latencyMs: 15, cacheHit: false }
}

/**
 * Create a minimal silent WAV blob for browser fallback
 */
function createSilentWavBlob(durationSeconds = 0.5) {
  const sampleRate = 16000
  const numChannels = 1
  const bitsPerSample = 16
  const numSamples = Math.floor(sampleRate * durationSeconds)
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8
  const blockAlign = (numChannels * bitsPerSample) / 8
  const dataSize = numSamples * blockAlign
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  // RIFF identifier
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(view, 8, 'WAVE')
  // fmt sub-chunk
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)
  // data sub-chunk
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  return new Blob([buffer], { type: 'audio/wav' })
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

/**
 * Fetch form definition by id with built-in schema fallbacks
 */
export async function fetchForm(formId = 'pension', { signal } = {}) {
  // If custom live webpage schema is active
  if (formId === 'live_web_form') {
    const custom = getActiveCustomSchema()
    if (custom) return custom
  }

  try {
    const response = await fetch(`${API_BASE}/api/form/${formId}`, { signal })
    if (response.ok) {
      return await response.json()
    }
  } catch (err) {
    if (err.name === 'AbortError') throw err
  }

  // Fallback to bundled local schema (Never crashes with "Failed to fetch")
  const fallback = BUILTIN_SCHEMAS[formId] || BUILTIN_SCHEMAS.pension
  if (fallback) {
    return JSON.parse(JSON.stringify(fallback))
  }

  throw new Error(`Form definition not found for "${formId}"`)
}

/**
 * Submit spoken transcript or typed value for extraction & validation
 */
export async function submitAnswer({ formId = 'pension', fieldId, transcript, context = {}, signal } = {}) {
  // Live web form or offline local evaluation
  if (formId === 'live_web_form') {
    const val = (transcript || '').trim()
    return {
      valid: Boolean(val),
      value: val,
      displayValue: val,
      confidence: 0.98,
      needsConfirmation: true,
      provider: 'web-dom-extractor',
    }
  }

  try {
    const response = await fetch(`${API_BASE}/api/form/${formId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fieldId, transcript, context }),
      signal,
    })

    if (response.ok) {
      return await response.json()
    }
  } catch (err) {
    if (err.name === 'AbortError') throw err
  }

  // Local fallback
  const cleanVal = (transcript || '').trim()
  return {
    valid: Boolean(cleanVal),
    value: cleanVal,
    displayValue: cleanVal,
    confidence: 0.95,
    needsConfirmation: true,
    provider: 'local-fallback',
  }
}

/**
 * Submit spoken or typed confirmation for a field
 */
export async function submitConfirm({ formId = 'pension', fieldId, transcript, signal } = {}) {
  try {
    const response = await fetch(`${API_BASE}/api/form/${formId}/confirm-input`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fieldId, transcript }),
      signal,
    })

    if (response.ok) {
      return await response.json()
    }
  } catch (err) {
    if (err.name === 'AbortError') throw err
  }

  // Local fallback confirmation
  const lower = (transcript || '').toLowerCase().trim()
  const isYes = /^(ஆம்|சரி|ஆமா|ஒகே|yes|yeah|yep|correct|right|ok|okay)/i.test(lower)
  const isNo = /^(இல்லை|தவறு|வேண்டாம்|no|nope|wrong|not)/i.test(lower)

  return {
    answer: isYes ? 'yes' : isNo ? 'no' : 'unclear',
    confidence: isYes || isNo ? 0.95 : 0.4,
    provider: 'local-fallback',
  }
}

/**
 * Query next question based on current answers
 */
export async function fetchNextField({ formId = 'pension', answers = {}, currentId = null, signal } = {}) {
  if (formId === 'live_web_form') {
    const schema = getActiveCustomSchema()
    if (schema) {
      const spokenFields = schema.fields.filter((f) => f.spoken)
      const unanswered = spokenFields.find((f) => !answers[f.id] || !answers[f.id].confirmed)
      const doneCount = spokenFields.filter((f) => answers[f.id]?.confirmed).length

      return {
        next: unanswered || null,
        progress: {
          done: doneCount,
          total: spokenFields.length,
          percent: Math.round((doneCount / spokenFields.length) * 100),
        },
      }
    }
  }

  try {
    const response = await fetch(`${API_BASE}/api/form/${formId}/next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, currentId }),
      signal,
    })

    if (response.ok) {
      return await response.json()
    }
  } catch (err) {
    if (err.name === 'AbortError') throw err
  }

  // Fallback using local schema
  const schema = BUILTIN_SCHEMAS[formId] || BUILTIN_SCHEMAS.pension
  const spoken = schema.fields.filter((f) => f.spoken)
  const nextField = spoken.find((f) => !answers[f.id] || !answers[f.id].confirmed)
  const done = spoken.filter((f) => answers[f.id]?.confirmed).length

  return {
    next: nextField || null,
    progress: {
      done,
      total: spoken.length,
      percent: Math.round((done / spoken.length) * 100),
    },
  }
}

/**
 * Fetch summary of completed form
 */
export async function fetchSummary({ formId = 'pension', answers = {}, lang = 'ta', signal } = {}) {
  if (formId === 'live_web_form') {
    const schema = getActiveCustomSchema()
    if (schema) {
      const summary = schema.fields
        .filter((f) => f.spoken && answers[f.id])
        .map((f) => ({
          id: f.id,
          label: f.labels?.[lang] || f.labels?.en || f.id,
          value: answers[f.id]?.value || '',
          display: answers[f.id]?.display || answers[f.id]?.value || '',
          confirmed: Boolean(answers[f.id]?.confirmed),
          spoken: true,
        }))
      return { summary }
    }
  }

  try {
    const response = await fetch(`${API_BASE}/api/form/${formId}/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, lang }),
      signal,
    })

    if (response.ok) {
      return await response.json()
    }
  } catch (err) {
    if (err.name === 'AbortError') throw err
  }

  // Local fallback summary
  const schema = BUILTIN_SCHEMAS[formId] || BUILTIN_SCHEMAS.pension
  const summary = schema.fields
    .filter((f) => f.spoken && answers[f.id])
    .map((f) => ({
      id: f.id,
      label: f.labels?.[lang] || f.labels?.en || f.id,
      value: answers[f.id]?.value || '',
      display: answers[f.id]?.display || answers[f.id]?.value || '',
      confirmed: Boolean(answers[f.id]?.confirmed),
      spoken: true,
    }))

  return { summary }
}

/**
 * Detect voice command & target field
 */
export async function detectCommandApi({ formId = 'pension', transcript, state, fieldId, signal } = {}) {
  try {
    const response = await fetch(`${API_BASE}/api/form/${formId}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, state, fieldId }),
      signal,
    })

    if (response.ok) {
      return await response.json()
    }
  } catch (err) {
    if (err.name === 'AbortError') throw err
  }

  return { command: null, targetFieldId: null }
}

/**
 * Submit partial or digit-level correction
 */
export async function submitPartialCorrection({ formId = 'pension', currentValue, fieldId, transcript, signal } = {}) {
  try {
    const response = await fetch(`${API_BASE}/api/form/${formId}/partial-correction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentValue, fieldId, transcript }),
      signal,
    })

    if (response.ok) {
      return await response.json()
    }
  } catch (err) {
    if (err.name === 'AbortError') throw err
  }

  return { applied: false, value: currentValue }
}
