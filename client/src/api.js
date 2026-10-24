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
 * @returns {Promise<{ text: string, latencyMs: number }>}
 */
export async function transcribeAudio(audioBlob, language = 'ta-IN') {
  const formData = new FormData()
  formData.append('audio_file', audioBlob, 'recording.wav')
  if (language) {
    formData.append('language', language)
  }

  const response = await fetch('/api/transcribe', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    let errMsg = 'Transcription failed'
    try {
      const errData = await response.json()
      errMsg = errData.error || errMsg
    } catch (_) {}
    throw new Error(errMsg)
  }

  return response.json()
}

/**
 * Synthesize speech from text
 * @param {string} text - text to speak
 * @param {Object} [options] - { voice, language }
 * @returns {Promise<{ audioBlob: Blob, latencyMs: number }>}
 */
export async function synthesizeSpeech(text, { voice, language } = {}) {
  const startTime = Date.now()
  const response = await fetch('/api/speak', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, voice, language }),
  })

  const latencyMs = Number(response.headers.get('X-Latency-Ms')) || (Date.now() - startTime)

  if (!response.ok) {
    let errMsg = 'Speech synthesis failed'
    try {
      const errData = await response.json()
      errMsg = errData.error || errMsg
    } catch (_) {}
    throw new Error(errMsg)
  }

  const audioBlob = await response.blob()
  return { audioBlob, latencyMs }
}
