// Configuration for Gnani AI APIs (Prisma v2.5 STT & Timbre v3.0 TTS)

export const GNANI_CONFIG = {
  baseUrl: 'https://api.vachana.ai',
  endpoints: {
    stt: '/stt/v3',
    tts: '/api/v1/tts/inference',
  },
  // Language code for Tamil-English code-mixed speech
  defaultLanguage: 'ta-IN',
  // Prisma STT options
  prismaDefaults: {
    format: 'transcribe',
    itnNativeNumerals: false,
  },
  // Timbre TTS options (Timbre v3.0 supports 10 Indian languages for every voice)
  timbreDefaults: {
    model: 'timbre-v3.0',
    voice: 'Shivani',
    language: 'ta-IN',
    speed: 1.0,
    audioConfig: {
      sample_rate: 24000,
      num_channels: 1,
      sample_width: 2,
      encoding: 'linear_pcm',
      container: 'wav',
    },
  },
  audioFormats: ['wav', 'mp3', 'ogg', 'flac', 'aac', 'm4a'],
  timeoutMs: 20000,
  maxAudioSeconds: 15,
  maxTtsChars: 300,
}

// Extraction confidence threshold below which user confirmation is required
export const CONFIRM_THRESHOLD = Number(process.env.CONFIRM_THRESHOLD) || 0.8

export function getApiKey() {
  const key = process.env.GNANI_API_KEY
  if (!key || typeof key !== 'string' || key.trim() === '') {
    throw new Error('GNANI_API_KEY environment variable is missing or empty')
  }
  return key.trim()
}
