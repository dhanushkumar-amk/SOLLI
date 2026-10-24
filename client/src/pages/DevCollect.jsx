import { useEffect, useState } from 'react'
import { fetchForm, transcribeAudio } from '../api'
import { startRecording, stopRecording } from '../audio/recorder'

export default function DevCollect() {
  const [fields, setFields] = useState([])
  const [selectedFieldId, setSelectedFieldId] = useState('')
  const [expectedValue, setExpectedValue] = useState('')
  const [condition, setCondition] = useState('quiet')
  const [speaker, setSpeaker] = useState('tester')
  const [isRecording, setIsRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [savedCount, setSavedCount] = useState(null)
  const [statusMsg, setStatusMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    fetchForm('pension')
      .then((data) => {
        const spoken = data.fields.filter((f) => f.spoken)
        setFields(spoken)
        if (spoken.length > 0) setSelectedFieldId(spoken[0].id)
      })
      .catch((err) => setErrorMsg(`Failed to load form fields: ${err.message}`))
  }, [])

  const handleRecordToggle = async () => {
    setErrorMsg('')
    setStatusMsg('')

    if (isRecording) {
      setIsRecording(false)
      setTranscribing(true)
      try {
        const wavBlob = await stopRecording()
        setStatusMsg('Transcribing audio with Prisma v2.5...')
        const res = await transcribeAudio(wavBlob, 'ta-IN')
        setTranscript(res.text || '')
        setStatusMsg(`Transcription completed in ${res.latencyMs} ms`)
      } catch (err) {
        setErrorMsg(`Transcription failed: ${err.message}`)
      } finally {
        setTranscribing(false)
      }
    } else {
      try {
        setTranscript('')
        setIsRecording(true)
        setStatusMsg('Recording audio... speak now (tap again to stop)')
        await startRecording({
          onAutoStop: async (wavBlob) => {
            setIsRecording(false)
            setTranscribing(true)
            try {
              setStatusMsg('Auto-stopped (15s). Transcribing...')
              const res = await transcribeAudio(wavBlob, 'ta-IN')
              setTranscript(res.text || '')
              setStatusMsg(`Transcription completed in ${res.latencyMs} ms`)
            } catch (err) {
              setErrorMsg(`Transcription failed: ${err.message}`)
            } finally {
              setTranscribing(false)
            }
          },
        })
      } catch (err) {
        setIsRecording(false)
        setErrorMsg(`Microphone error: ${err.message}`)
      }
    }
  }

  const handleSave = async () => {
    if (!selectedFieldId || !transcript || !expectedValue) {
      setErrorMsg('Please select a field, enter expected value, and record/transcribe an answer.')
      return
    }

    try {
      const res = await fetch('/api/dev/samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_id: selectedFieldId,
          transcript,
          expected: expectedValue,
          condition,
          speaker,
          timestamp: new Date().toISOString(),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save sample')
      }

      const data = await res.json()
      setSavedCount(data.count)
      setStatusMsg(`Sample saved successfully! Total collected: ${data.count}`)
      setTranscript('')
      setExpectedValue('')
    } catch (err) {
      setErrorMsg(`Save failed: ${err.message}`)
    }
  }

  return (
    <div
      style={{
        maxWidth: '680px',
        margin: '0 auto',
        padding: '1.5rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Warning Banner */}
      <div
        style={{
          background: '#fffbeb',
          border: '2px solid #f59e0b',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem',
          color: '#92400e',
        }}
      >
        <strong style={{ fontSize: '1.1rem' }}>⚠️ DATA PRIVACY NOTICE</strong>
        <p style={{ margin: '0.4rem 0 0', fontSize: '0.95rem', lineHeight: 1.4 }}>
          Say <strong>FAKE data only</strong>. Never read real personal information, real Aadhaar numbers, real phone numbers, or real bank account numbers.
        </p>
      </div>

      <h1 style={{ fontSize: '1.8rem', color: '#0f172a', marginBottom: '0.5rem' }}>
        Real Transcript Collector (/dev/collect)
      </h1>
      <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
        Record spoken Tamil/English answers to build empirical benchmark datasets for evaluating extraction robustness.
      </p>

      {/* Field Selector */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
          Select Form Field:
        </label>
        <select
          value={selectedFieldId}
          onChange={(e) => setSelectedFieldId(e.target.value)}
          style={{ width: '100%', padding: '0.6rem', fontSize: '1rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
        >
          {fields.map((f) => (
            <option key={f.id} value={f.id}>
              {f.order}. {f.id} ({f.labels?.en})
            </option>
          ))}
        </select>
      </div>

      {/* Target Expected Value */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
          Target Expected Value (Clean Value):
        </label>
        <input
          type="text"
          value={expectedValue}
          onChange={(e) => setExpectedValue(e.target.value)}
          placeholder="e.g., K. Muthulakshmi, 1958-05-05, Female, Kaatruvilai"
          style={{ width: '100%', padding: '0.6rem', fontSize: '1rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
        />
      </div>

      {/* Condition & Speaker Metadata */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
            Acoustic Condition:
          </label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            style={{ width: '100%', padding: '0.6rem', fontSize: '1rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          >
            <option value="quiet">Quiet (Indoor room)</option>
            <option value="noisy">Noisy (Background chatter/fan)</option>
            <option value="phone">Phone / Speakerphone</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
            Speaker Label:
          </label>
          <input
            type="text"
            value={speaker}
            onChange={(e) => setSpeaker(e.target.value)}
            placeholder="e.g. speaker_1"
            style={{ width: '100%', padding: '0.6rem', fontSize: '1rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
        </div>
      </div>

      {/* Record & Transcribe */}
      <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
        <button
          type="button"
          disabled={transcribing}
          onClick={handleRecordToggle}
          style={{
            padding: '1rem 2rem',
            fontSize: '1.2rem',
            fontWeight: 700,
            borderRadius: '9999px',
            border: isRecording ? '4px solid #fecaca' : 'none',
            background: isRecording ? '#dc2626' : '#2563eb',
            color: '#fff',
            cursor: transcribing ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          }}
        >
          {isRecording ? '⏹ Stop Recording' : '🎤 Speak Answer'}
        </button>
      </div>

      {/* Status & Error Messages */}
      {statusMsg && (
        <p style={{ color: '#0369a1', background: '#e0f2fe', padding: '0.5rem', borderRadius: '4px', fontSize: '0.95rem' }}>
          {statusMsg}
        </p>
      )}
      {errorMsg && (
        <p style={{ color: '#b91c1c', background: '#fee2e2', padding: '0.5rem', borderRadius: '4px', fontSize: '0.95rem' }}>
          {errorMsg}
        </p>
      )}

      {/* Transcript Review Box */}
      {transcript && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginTop: '1rem' }}>
          <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
            Recorded Transcript (Prisma v2.5):
          </label>
          <p style={{ fontSize: '1.1rem', color: '#0f172a', background: '#fff', padding: '0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1', margin: '0 0 1rem' }}>
            {transcript}
          </p>

          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: 600,
              background: '#059669',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            💾 Save Sample to real_transcripts.json
          </button>
        </div>
      )}

      {savedCount !== null && (
        <p style={{ marginTop: '1rem', color: '#059669', fontWeight: 600 }}>
          Collected samples in file: {savedCount}
        </p>
      )}
    </div>
  )
}
