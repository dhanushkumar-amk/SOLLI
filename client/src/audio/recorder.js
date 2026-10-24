// Browser-side audio recording and 16kHz mono WAV conversion using Web Audio API

export const MAX_AUDIO_SECONDS = 15
export const TARGET_SAMPLE_RATE = 16000

let audioContext = null
let mediaStream = null
let processorNode = null
let sourceNode = null
let recordedChunks = []
let recordingStartTime = 0
let autoStopTimer = null

/**
 * Resamples float audio buffer to target sample rate using averaging
 */
function downsampleBuffer(buffer, sampleRate, outSampleRate = TARGET_SAMPLE_RATE) {
  if (outSampleRate >= sampleRate) {
    return buffer
  }
  const sampleRateRatio = sampleRate / outSampleRate
  const newLength = Math.round(buffer.length / sampleRateRatio)
  const result = new Float32Array(newLength)
  let offsetResult = 0
  let offsetBuffer = 0
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio)
    let accum = 0
    let count = 0
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i]
      count++
    }
    result[offsetResult] = count > 0 ? accum / count : buffer[offsetBuffer]
    offsetResult++
    offsetBuffer = nextOffsetBuffer
  }
  return result
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

function floatTo16BitPCM(output, offset, input) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]))
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
}

/**
 * Encodes Float32 mono samples into a 16-bit PCM WAV Blob at the target sample rate
 */
function encodeWAV(samples, sampleRate = TARGET_SAMPLE_RATE) {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  /* RIFF chunk descriptor */
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(view, 8, 'WAVE')

  /* "fmt " sub-chunk */
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // 16 for PCM
  view.setUint16(20, 1, true) // Linear PCM
  view.setUint16(22, 1, true) // Mono (1 channel)
  view.setUint32(24, sampleRate, true) // Sample rate
  view.setUint32(28, sampleRate * 2, true) // Byte rate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true) // Block align (NumChannels * BitsPerSample/8)
  view.setUint16(34, 16, true) // Bits per sample (16-bit)

  /* "data" sub-chunk */
  writeString(view, 36, 'data')
  view.setUint32(40, samples.length * 2, true)

  floatTo16BitPCM(view, 44, samples)

  return new Blob([buffer], { type: 'audio/wav' })
}

/**
 * Starts recording audio from the user's microphone.
 * @param {Object} options - { onAutoStop: (blob) => void }
 * @returns {Promise<void>}
 */
export async function startRecording({ onAutoStop } = {}) {
  // Reset any previous state
  if (processorNode) {
    try {
      stopRecording()
    } catch (_) {}
  }

  recordedChunks = []

  // Check getUserMedia availability
  if (!navigator?.mediaDevices?.getUserMedia) {
    throw new Error('Microphone access is not supported by your browser')
  }

  // Request audio stream
  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  })

  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  audioContext = new AudioContextClass()

  // Resume context if suspended
  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }

  sourceNode = audioContext.createMediaStreamSource(mediaStream)

  // Use ScriptProcessor for maximum browser compatibility (buffer size 4096, 1 input, 1 output)
  processorNode = audioContext.createScriptProcessor(4096, 1, 1)

  recordingStartTime = Date.now()

  processorNode.onaudioprocess = (e) => {
    const inputData = e.inputBuffer.getChannelData(0)
    // Clone float samples
    recordedChunks.push(new Float32Array(inputData))
  }

  sourceNode.connect(processorNode)
  processorNode.connect(audioContext.destination)

  // Set auto-stop timer after MAX_AUDIO_SECONDS
  autoStopTimer = setTimeout(async () => {
    if (processorNode) {
      const wavBlob = await stopRecording()
      if (typeof onAutoStop === 'function') {
        onAutoStop(wavBlob)
      }
    }
  }, MAX_AUDIO_SECONDS * 1000)
}

/**
 * Stops recording, releases microphone tracks, resamples to 16kHz mono, and returns a WAV Blob.
 * @returns {Promise<Blob>}
 */
export async function stopRecording() {
  if (autoStopTimer) {
    clearTimeout(autoStopTimer)
    autoStopTimer = null
  }

  // Disconnect nodes
  if (processorNode) {
    processorNode.disconnect()
    processorNode.onaudioprocess = null
    processorNode = null
  }
  if (sourceNode) {
    sourceNode.disconnect()
    sourceNode = null
  }

  // Stop all media stream tracks to turn off the microphone indicator
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop())
    mediaStream = null
  }

  const nativeSampleRate = audioContext ? audioContext.sampleRate : 44100
  if (audioContext && audioContext.state !== 'closed') {
    try {
      await audioContext.close()
    } catch (_) {}
    audioContext = null
  }

  // Calculate total samples captured
  const totalLength = recordedChunks.reduce((acc, chunk) => acc + chunk.length, 0)
  const mergedSamples = new Float32Array(totalLength)
  let offset = 0
  for (const chunk of recordedChunks) {
    mergedSamples.set(chunk, offset)
    offset += chunk.length
  }
  recordedChunks = []

  // Downsample to 16,000 Hz mono
  const downsampled = downsampleBuffer(mergedSamples, nativeSampleRate, TARGET_SAMPLE_RATE)

  // Convert to 16-bit PCM WAV
  const wavBlob = encodeWAV(downsampled, TARGET_SAMPLE_RATE)
  return wavBlob
}
