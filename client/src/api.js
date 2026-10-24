// Client API helpers for talking to the Solli Express backend

export async function getHealth() {
  const response = await fetch('/api/health')
  if (!response.ok) throw new Error('Health check failed')
  return response.json()
}

export async function getStats() {
  const response = await fetch('/api/stats')
  if (!response.ok) throw new Error('Failed to fetch stats')
  return response.json()
}

/**
 * Transcribe recorded audio
 * @param {Blob} audioBlob - WAV audio blob
 * @param {string} [language] - optional language code
 * @param {Object} [options] - { signal }
 * @returns {Promise<{ text: string, latencyMs: number }>}
 */
export async function transcribeAudio(audioBlob, language = 'ta-IN', { signal } = {}) {
  const formData = new FormData()
  formData.append('audio_file', audioBlob, 'recording.wav')
  if (language) {
    formData.append('language', language)
  }

  const response = await fetch('/api/transcribe', {
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

  return response.json()
}

/**
 * Synthesize speech from text
 * @param {string} text - text to speak
 * @param {Object} [options] - { voice, language, sensitive, noCache, isReadback, signal }
 * @returns {Promise<{ audioBlob: Blob, latencyMs: number, cacheHit: boolean }>}
 */
export async function synthesizeSpeech(
  text,
  { voice, language, sensitive = false, noCache = false, isReadback = false, signal } = {}
) {
  const startTime = Date.now()
  const response = await fetch('/api/speak', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, voice, language, sensitive, noCache, isReadback }),
    signal,
  })

  const latencyMs = Number(response.headers.get('X-Latency-Ms')) || (Date.now() - startTime)
  const cacheHit = response.headers.get('X-Cache') === 'HIT'

  if (!response.ok) {
    let errMsg = 'Speech synthesis failed'
    try {
      const errData = await response.json()
      errMsg = errData.error || errMsg
    } catch (_) {}
    const error = new Error(errMsg)
    error.status = response.status
    throw error
  }

  const audioBlob = await response.blob()
  return { audioBlob, latencyMs, cacheHit }
}

/**
 * Fetch form definition by id
 * @param {string} formId
 * @param {Object} [options] - { signal }
 */
export async function fetchForm(formId = 'pension', { signal } = {}) {
  const response = await fetch(`/api/form/${formId}`, { signal })
  if (!response.ok) {
    const error = new Error(`Failed to load form: ${response.status}`)
    error.status = response.status
    throw error
  }
  return response.json()
}

/**
 * Submit spoken transcript or typed value for extraction & validation
 * @param {Object} params - { formId, fieldId, transcript, context, signal }
 */
export async function submitAnswer({ formId = 'pension', fieldId, transcript, context = {}, signal } = {}) {
  const response = await fetch(`/api/form/${formId}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fieldId, transcript, context }),
    signal,
  })

  if (!response.ok) {
    let errMsg = 'Failed to process answer'
    try {
      const errData = await response.json()
      errMsg = errData.error || errMsg
    } catch (_) {}
    const error = new Error(errMsg)
    error.status = response.status
    throw error
  }

  return response.json()
}

/**
 * Submit spoken or typed confirmation for a field
 * @param {Object} params - { formId, fieldId, transcript, signal }
 * @returns {Promise<{ answer: "yes"|"no"|"unclear", confidence: number, provider: string }>}
 */
export async function submitConfirm({ formId = 'pension', fieldId, transcript, signal } = {}) {
  const response = await fetch(`/api/form/${formId}/confirm-input`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fieldId, transcript }),
    signal,
  })

  if (!response.ok) {
    let errMsg = 'Failed to process confirmation'
    try {
      const errData = await response.json()
      errMsg = errData.error || errMsg
    } catch (_) {}
    const error = new Error(errMsg)
    error.status = response.status
    throw error
  }

  return response.json()
}

/**
 * Query next question based on current answers
 * @param {Object} params - { formId, answers, currentId, signal }
 */
export async function fetchNextField({ formId = 'pension', answers = {}, currentId = null, signal } = {}) {
  const response = await fetch(`/api/form/${formId}/next`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers, currentId }),
    signal,
  })

  if (!response.ok) {
    const error = new Error(`Failed to get next question: ${response.status}`)
    error.status = response.status
    throw error
  }

  return response.json()
}

/**
 * Fetch masked summary of completed form
 * @param {Object} params - { formId, answers, lang, signal }
 */
export async function fetchSummary({ formId = 'pension', answers = {}, lang = 'ta', signal } = {}) {
  const response = await fetch(`/api/form/${formId}/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers, lang }),
    signal,
  })

  if (!response.ok) {
    const error = new Error(`Failed to get summary: ${response.status}`)
    error.status = response.status
    throw error
  }

  return response.json()
}
