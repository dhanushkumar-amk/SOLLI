import { useEffect, useRef, useState } from 'react'
import { getHealth, getStats, synthesizeSpeech, transcribeAudio } from '../api'
import { MAX_AUDIO_SECONDS, startRecording, stopRecording } from '../audio/recorder'
import './DevRoundtrip.css'

const SAMPLE_QUESTIONS = [
  {
    id: 'name',
    label: 'Applicant Name',
    text: 'உங்கள் பெயர் என்ன? What is your name?',
  },
  {
    id: 'dob',
    label: 'Date of Birth',
    text: 'பிறந்த தேதி என்ன? What is your date of birth?',
  },
  {
    id: 'phone',
    label: 'Phone Number',
    text: 'தொலைபேசி எண் என்ன? What is your phone number?',
  },
]

export default function DevRoundtrip() {
  const [state, setState] = useState('idle') // 'idle' | 'recording' | 'transcribing' | 'speaking'
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [recordedBlob, setRecordedBlob] = useState(null)
  const [transcript, setTranscript] = useState('')
  const [sttLatency, setSttLatency] = useState(null)
  const [ttsLatency, setTtsLatency] = useState(null)
  const [selectedQuestion, setSelectedQuestion] = useState(SAMPLE_QUESTIONS[0].text)
  const [questionLatency, setQuestionLatency] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [healthStatus, setHealthStatus] = useState(null)
  const [stats, setStats] = useState(null)

  const timerRef = useRef(null)
  const activeAudioRef = useRef(null)

  // Fetch initial health and stats
  const refreshStats = () => {
    getStats().then(setStats).catch(() => {})
    getHealth().then(setHealthStatus).catch(() => {})
  }

  useEffect(() => {
    refreshStats()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (activeAudioRef.current) {
        activeAudioRef.current.pause()
      }
    }
  }, [])

  // Start recording
  const handleStartRecording = async () => {
    setErrorMessage('')
    setRecordedBlob(null)
    setTranscript('')
    setSttLatency(null)
    setElapsedSeconds(0)

    try {
      await startRecording({
        onAutoStop: (blob) => {
          handleStopAndTranscribe(blob)
        },
      })
      setState('recording')

      const startTime = Date.now()
      timerRef.current = setInterval(() => {
        const seconds = Math.floor((Date.now() - startTime) / 1000)
        setElapsedSeconds(seconds)
        if (seconds >= MAX_AUDIO_SECONDS) {
          if (timerRef.current) clearInterval(timerRef.current)
        }
      }, 200)
    } catch (err) {
      if (timerRef.current) clearInterval(timerRef.current)
      setState('idle')
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Microphone blocked. Allow it in browser settings.')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No microphone found. Please connect an audio input device.')
      } else {
        setErrorMessage(err.message || 'Could not access microphone')
      }
    }
  }

  // Stop recording manually
  const handleStopRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    try {
      const blob = await stopRecording()
      handleStopAndTranscribe(blob)
    } catch (err) {
      setState('idle')
      setErrorMessage(err.message || 'Error stopping recording')
    }
  }

  // Send audio to transcribe
  const handleStopAndTranscribe = async (blob) => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setRecordedBlob(blob)
    setState('transcribing')

    try {
      const result = await transcribeAudio(blob, 'ta-IN')
      setTranscript(result.text || '(No speech detected)')
      setSttLatency(result.latencyMs)
      setState('idle')
      refreshStats()
    } catch (err) {
      setState('idle')
      setErrorMessage(err.message || 'Transcription error')
      refreshStats()
    }
  }

  // Play the local microphone recording
  const handlePlayRecording = () => {
    if (!recordedBlob) return
    if (activeAudioRef.current) activeAudioRef.current.pause()

    const url = URL.createObjectURL(recordedBlob)
    const audio = new Audio(url)
    activeAudioRef.current = audio
    audio.play().catch((err) => setErrorMessage('Error playing audio: ' + err.message))
  }

  // Speak back the transcript
  const handleSpeakBack = async () => {
    if (!transcript.trim()) return
    setErrorMessage('')
    setState('speaking')
    setTtsLatency(null)

    try {
      const { audioBlob, latencyMs } = await synthesizeSpeech(transcript, {
        voice: 'Shivani',
        language: 'ta-IN',
      })
      setTtsLatency(latencyMs)

      if (activeAudioRef.current) activeAudioRef.current.pause()
      const url = URL.createObjectURL(audioBlob)
      const audio = new Audio(url)
      activeAudioRef.current = audio
      audio.onended = () => setState('idle')
      audio.onerror = () => {
        setState('idle')
        setErrorMessage('Failed to play synthesized audio')
      }
      await audio.play()
      refreshStats()
    } catch (err) {
      setState('idle')
      setErrorMessage(err.message || 'TTS synthesis failed')
      refreshStats()
    }
  }

  // Speak selected question
  const handleSpeakQuestion = async () => {
    if (!selectedQuestion) return
    setErrorMessage('')
    setState('speaking')
    setQuestionLatency(null)

    try {
      const { audioBlob, latencyMs } = await synthesizeSpeech(selectedQuestion, {
        voice: 'Shivani',
        language: 'ta-IN',
      })
      setQuestionLatency(latencyMs)

      if (activeAudioRef.current) activeAudioRef.current.pause()
      const url = URL.createObjectURL(audioBlob)
      const audio = new Audio(url)
      activeAudioRef.current = audio
      audio.onended = () => setState('idle')
      audio.onerror = () => {
        setState('idle')
        setErrorMessage('Failed to play synthesized audio')
      }
      await audio.play()
      refreshStats()
    } catch (err) {
      setState('idle')
      setErrorMessage(err.message || 'Question synthesis failed')
      refreshStats()
    }
  }

  const formatTimer = (seconds) => {
    const s = Math.min(seconds, MAX_AUDIO_SECONDS)
    const sec = String(s % 60).padStart(2, '0')
    const min = String(Math.floor(s / 60)).padStart(2, '0')
    return `${min}:${sec}`
  }

  return (
    <div className="dev-roundtrip-container">
      <header className="dev-header">
        <div className="dev-badge">DEV ONLY</div>
        <h1>Prisma & Timbre Round Trip</h1>
        <p className="subtitle">
          Test Tamil-English voice input (Prisma v2.5 STT) and voice output (Timbre v3.0 TTS).
        </p>
      </header>

      {/* Backend & Credit Status */}
      <section className="status-bar" aria-label="API Status">
        <div className="status-item">
          <span className="status-label">Backend:</span>
          <span className={`status-val ${healthStatus?.gnaniConfigured ? 'ok' : 'warn'}`}>
            {healthStatus?.gnaniConfigured ? 'Gnani Configured' : 'Key Missing'}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">STT Calls:</span>
          <span className="status-val">{stats?.transcribe?.calls ?? 0}</span>
        </div>
        <div className="status-item">
          <span className="status-label">STT Audio:</span>
          <span className="status-val">{stats?.transcribe?.totalAudioSeconds ?? 0}s</span>
        </div>
        <div className="status-item">
          <span className="status-label">TTS Calls:</span>
          <span className="status-val">{stats?.speak?.calls ?? 0}</span>
        </div>
      </section>

      {/* Friendly error alert */}
      {errorMessage && (
        <div className="alert-error" role="alert">
          <span className="alert-icon">⚠️</span>
          <span className="alert-text">{errorMessage}</span>
          <button className="alert-close" onClick={() => setErrorMessage('')} aria-label="Dismiss error">
            ✕
          </button>
        </div>
      )}

      {/* Section 1: Microphone Recording & Transcription */}
      <section className="card" aria-labelledby="mic-section-title">
        <h2 id="mic-section-title">1. Record & Transcribe (Prisma v2.5)</h2>
        <div className="mic-control-area">
          <div className="state-badge-container">
            <span className={`state-badge state-${state}`}>State: {state.toUpperCase()}</span>
            {state === 'recording' && (
              <span className="timer-display">
                {formatTimer(elapsedSeconds)} / {formatTimer(MAX_AUDIO_SECONDS)}
              </span>
            )}
          </div>

          <button
            type="button"
            className={`big-mic-btn ${state === 'recording' ? 'recording' : ''}`}
            disabled={state === 'transcribing' || state === 'speaking'}
            onClick={state === 'recording' ? handleStopRecording : handleStartRecording}
            aria-label={state === 'recording' ? 'Stop recording' : 'Start recording'}
          >
            <div className="mic-icon-circle">
              {state === 'recording' ? '⏹' : '🎙️'}
            </div>
            <span className="mic-btn-label">
              {state === 'recording'
                ? 'Tap to Stop'
                : state === 'transcribing'
                ? 'Transcribing...'
                : 'Tap to Record'}
            </span>
          </button>

          <p className="mic-hint">Auto-stops after {MAX_AUDIO_SECONDS}s. Speaks Tamil-English code-mixed speech.</p>
        </div>

        {/* Post-recording actions */}
        {recordedBlob && (
          <div className="recording-actions">
            <button
              type="button"
              className="action-btn secondary"
              onClick={handlePlayRecording}
              disabled={state !== 'idle'}
            >
              ▶ Play My Recording
            </button>
            {sttLatency !== null && (
              <span className="latency-tag">STT Latency: {sttLatency} ms</span>
            )}
          </div>
        )}

        {/* Transcript Box */}
        <div className="transcript-box">
          <label htmlFor="transcript-input" className="field-label">
            Transcript (Editable):
          </label>
          <textarea
            id="transcript-input"
            rows="3"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Your spoken words will appear here..."
          />
          <div className="speak-back-bar">
            <button
              type="button"
              className="action-btn primary"
              onClick={handleSpeakBack}
              disabled={!transcript.trim() || state !== 'idle'}
            >
              🔊 Speak It Back (Timbre v3.0)
            </button>
            {ttsLatency !== null && (
              <span className="latency-tag">TTS Latency: {ttsLatency} ms</span>
            )}
          </div>
        </div>
      </section>

      {/* Section 2: Sample Questions */}
      <section className="card" aria-labelledby="sample-questions-title">
        <h2 id="sample-questions-title">2. Sample Tamil-English Questions (Timbre v3.0)</h2>
        <p className="section-desc">Test voice synthesis with standard Tamil-English question prompts.</p>

        <div className="question-selector">
          <label htmlFor="question-select" className="field-label">
            Select Question:
          </label>
          <select
            id="question-select"
            value={selectedQuestion}
            onChange={(e) => setSelectedQuestion(e.target.value)}
            disabled={state !== 'idle'}
          >
            {SAMPLE_QUESTIONS.map((q) => (
              <option key={q.id} value={q.text}>
                {q.label} - {q.text}
              </option>
            ))}
          </select>

          <div className="speak-question-bar">
            <button
              type="button"
              className="action-btn secondary"
              onClick={handleSpeakQuestion}
              disabled={!selectedQuestion || state !== 'idle'}
            >
              🔊 Speak This Question
            </button>
            {questionLatency !== null && (
              <span className="latency-tag">TTS Latency: {questionLatency} ms</span>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
