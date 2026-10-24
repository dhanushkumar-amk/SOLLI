import { useState } from 'react'
import { STATES } from '../conversation/stateMachine'
import { useConversation } from '../conversation/useConversation'

export default function VoiceApp() {
  const isDev = Boolean(import.meta.env.DEV)
  const [typedInput, setTypedInput] = useState('')

  const {
    state,
    context,
    currentField,
    progress,
    answers,
    summary,
    error,
    isRecording,
    isPlayingAudio,
    start,
    startListening,
    stopListening,
    submitTyped,
    skipCurrentField,
    repeatQuestion,
    setMode,
    setVoiceMuted,
    restart,
  } = useConversation({
    mode: isDev ? 'typed' : 'voice',
    voiceMuted: false,
  })

  const handleTypedSubmit = (e) => {
    e.preventDefault()
    if (!typedInput.trim()) return
    const text = typedInput.trim()
    setTypedInput('')
    submitTyped(text)
  }

  const renderStateBadge = () => {
    switch (state) {
      case STATES.SPEAKING_QUESTION:
        return {
          text: '🔊 கேள்வி கேட்கப்படுகிறது... / Speaking question...',
          bg: '#e0f2fe',
          color: '#0369a1',
        }
      case STATES.LISTENING:
        return {
          text: isRecording
            ? '🔴 பதிவு செய்யப்படுகிறது... பேசுங்கள் / Recording... speak now'
            : '🎙️ பேச தயாராக உள்ளது / Ready for speech',
          bg: isRecording ? '#fee2e2' : '#fef3c7',
          color: isRecording ? '#b91c1c' : '#92400e',
        }
      case STATES.TRANSCRIBING:
        return {
          text: '⏳ குரல் எழுத்தாக்கம்... / Transcribing audio...',
          bg: '#f3e8ff',
          color: '#7e22ce',
        }
      case STATES.PROCESSING:
        return {
          text: '🧠 விடை சரிபார்க்கப்படுகிறது... / Checking answer...',
          bg: '#ede9fe',
          color: '#6d28d9',
        }
      case STATES.SPEAKING_HELP:
        return {
          text: '💡 உதவி விளக்கம்... / Speaking help prompt...',
          bg: '#fef9c3',
          color: '#854d0e',
        }
      case STATES.SPEAKING_ERROR:
        return {
          text: '⚠️ மீண்டும் சொல்லவும்... / Please say it again...',
          bg: '#fee2e2',
          color: '#b91c1c',
        }
      case STATES.LOADING_FORM:
        return {
          text: '⏳ படிவம் ஏற்றப்படுகிறது... / Loading form...',
          bg: '#f1f5f9',
          color: '#475569',
        }
      default:
        return null
    }
  }

  const badge = renderStateBadge()

  return (
    <div
      style={{
        maxWidth: '640px',
        margin: '0 auto',
        padding: '1.25rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Dev Bar (Mode Toggles) */}
      {isDev && (
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '0.6rem 0.8rem',
            marginBottom: '1rem',
            fontSize: '0.9rem',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <div>
            <strong>Mode:</strong>{' '}
            <label style={{ marginRight: '0.8rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="devMode"
                value="voice"
                checked={context.mode === 'voice'}
                onChange={() => setMode('voice')}
              />{' '}
              Voice (Prisma STT)
            </label>
            <label style={{ cursor: 'pointer' }}>
              <input
                type="radio"
                name="devMode"
                value="typed"
                checked={context.mode === 'typed'}
                onChange={() => setMode('typed')}
              />{' '}
              Typed Test Mode (No STT calls)
            </label>
          </div>
          <div>
            <label style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={context.voiceMuted}
                onChange={(e) => setVoiceMuted(e.target.checked)}
              />{' '}
              Mute Voice (Skip Timbre TTS)
            </label>
          </div>
        </div>
      )}

      {/* Screen 1: Idle (Autoplay compliance start button) */}
      {state === STATES.IDLE && (
        <div style={{ textAlign: 'center', margin: 'auto 0', padding: '2rem 1rem' }}>
          <p style={{ fontSize: '1.2rem', color: '#64748b', marginBottom: '0.5rem' }}>
            முதியோர் உதவித்தொகை விண்ணப்பம்
          </p>
          <h1 style={{ fontSize: '2.2rem', margin: '0 0 1.5rem', color: '#0f172a' }}>
            Solli (சொல்லி)
          </h1>
          <p
            style={{
              fontSize: '1.2rem',
              color: '#334155',
              maxWidth: '480px',
              margin: '0 auto 2rem',
              lineHeight: 1.5,
            }}
          >
            கேள்விகளைக் கேட்டு உங்கள் குரல் மூலம் விண்ணப்பத்தை நிரப்பலாம்.
            <br />
            <span style={{ fontSize: '1rem', color: '#64748b' }}>
              Listen to questions and fill the pension form with your voice.
            </span>
          </p>
          <button
            type="button"
            onClick={start}
            style={{
              fontSize: '1.4rem',
              fontWeight: 700,
              padding: '1.2rem 2.8rem',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '9999px',
              cursor: 'pointer',
              boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)',
            }}
          >
            தொடங்கு / Start
          </button>
        </div>
      )}

      {/* Screen 2: Error screen */}
      {state === STATES.ERROR && (
        <div
          style={{
            background: '#fef2f2',
            border: '2px solid #ef4444',
            borderRadius: '12px',
            padding: '1.5rem',
            margin: 'auto 0',
          }}
        >
          <h2 style={{ color: '#b91c1c', marginTop: 0, fontSize: '1.4rem' }}>
            பிழை ஏற்பட்டது / Error Encountered
          </h2>
          <p style={{ fontSize: '1.2rem', color: '#7f1d1d', fontWeight: 600 }}>
            {error?.messageTa}
          </p>
          <p style={{ fontSize: '1rem', color: '#991b1b' }}>{error?.messageEn}</p>
          <button
            type="button"
            onClick={restart}
            style={{
              marginTop: '1.5rem',
              padding: '0.75rem 1.5rem',
              fontSize: '1.1rem',
              fontWeight: 600,
              background: '#b91c1c',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            மறுதொடக்கம் / Restart
          </button>
        </div>
      )}

      {/* Screen 3: Finished / Review Screen */}
      {state === STATES.FINISHED && (
        <div style={{ margin: '1rem 0' }}>
          <div
            style={{
              background: '#ecfdf5',
              border: '1px solid #10b981',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <h2 style={{ color: '#065f46', margin: 0, fontSize: '1.5rem' }}>
              விண்ணப்பம் முடிந்தது! / Application Complete!
            </h2>
            <p style={{ color: '#047857', margin: '0.5rem 0 0', fontSize: '1.05rem' }}>
              உங்கள் பதில்கள் கீழே சரிபார்க்கவும் (ரகசிய எண்கள் மறைக்கப்பட்டுள்ளன).
              <br />
              Please review your recorded answers (sensitive numbers are masked).
            </p>
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1rem' }}>
              <tbody>
                {(summary || []).map((row, idx) => (
                  <tr
                    key={row.id || idx}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: idx % 2 === 0 ? '#fafafa' : '#ffffff',
                    }}
                  >
                    <td
                      style={{
                        padding: '0.75rem 1rem',
                        fontWeight: 600,
                        color: '#334155',
                        width: '45%',
                      }}
                    >
                      {row.label}
                    </td>
                    <td
                      style={{
                        padding: '0.75rem 1rem',
                        color: row.sensitive ? '#0284c7' : '#0f172a',
                        fontWeight: row.sensitive ? 700 : 500,
                      }}
                    >
                      {row.display}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button
              type="button"
              onClick={restart}
              style={{
                fontSize: '1.1rem',
                fontWeight: 600,
                padding: '0.75rem 2rem',
                background: '#475569',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              புதிய விண்ணப்பம் / Start New
            </button>
          </div>
        </div>
      )}

      {/* Screen 4: Active Question Loop */}
      {state !== STATES.IDLE &&
        state !== STATES.ERROR &&
        state !== STATES.FINISHED &&
        currentField && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              justifyContent: 'space-between',
            }}
          >
            {/* Top Bar: Progress & Status */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem',
                  fontSize: '1.05rem',
                  color: '#475569',
                  fontWeight: 600,
                }}
              >
                <span>
                  கேள்வி {progress.done + 1} / {progress.total} (Question {progress.done + 1} of{' '}
                  {progress.total})
                </span>
                <button
                  type="button"
                  onClick={restart}
                  style={{
                    background: 'transparent',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    padding: '0.2rem 0.5rem',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  Stop / நிறுத்து
                </button>
              </div>

              {badge && (
                <div
                  style={{
                    background: badge.bg,
                    color: badge.color,
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    marginBottom: '1.25rem',
                  }}
                >
                  {badge.text}
                </div>
              )}

              {/* Main Question Card (Large Font: min 20px) */}
              <div
                style={{
                  background: '#ffffff',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  marginBottom: '1.5rem',
                }}
              >
                <p
                  style={{
                    fontSize: '1.45rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: '0 0 0.5rem',
                    lineHeight: 1.4,
                  }}
                >
                  {context.activePromptText?.ta || currentField.question?.ta}
                </p>
                <p
                  style={{
                    fontSize: '1.1rem',
                    color: '#475569',
                    margin: '0 0 0.5rem',
                    fontStyle: 'italic',
                  }}
                >
                  {context.activePromptText?.taRoman || currentField.question?.taRoman}
                </p>
                <p
                  style={{
                    fontSize: '1rem',
                    color: '#64748b',
                    margin: 0,
                  }}
                >
                  {context.activePromptText?.en || currentField.question?.en}
                </p>
              </div>
            </div>

            {/* Middle Section: Recording / Answering Controls */}
            <div style={{ textAlign: 'center', margin: '1rem 0 2rem' }}>
              {context.mode === 'voice' ? (
                <div>
                  {/* Very Large Mic Button */}
                  <button
                    type="button"
                    disabled={state === STATES.SPEAKING_QUESTION || state === STATES.PROCESSING}
                    onClick={isRecording ? stopListening : startListening}
                    style={{
                      width: '140px',
                      height: '140px',
                      borderRadius: '50%',
                      fontSize: '3rem',
                      background: isRecording
                        ? '#dc2626'
                        : state === STATES.LISTENING
                          ? '#2563eb'
                          : '#94a3b8',
                      color: '#ffffff',
                      border: isRecording ? '6px solid #fecaca' : 'none',
                      cursor:
                        state === STATES.SPEAKING_QUESTION || state === STATES.PROCESSING
                          ? 'not-allowed'
                          : 'pointer',
                      boxShadow: isRecording
                        ? '0 0 25px rgba(220, 38, 38, 0.6)'
                        : '0 10px 20px rgba(37, 99, 235, 0.3)',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                    }}
                    aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
                  >
                    {isRecording ? '⏹' : '🎤'}
                  </button>

                  <p
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 600,
                      color: isRecording ? '#dc2626' : '#334155',
                      marginTop: '0.8rem',
                    }}
                  >
                    {isRecording
                      ? 'தட்டி முடிக்கவும் / Tap to Stop'
                      : state === STATES.LISTENING
                        ? 'தட்டி பேசவும் / Tap to Speak'
                        : 'காத்திருக்கவும் / Please wait...'}
                  </p>
                </div>
              ) : (
                /* Typed Test Mode Input */
                <form onSubmit={handleTypedSubmit} style={{ maxWidth: '480px', margin: '0 auto' }}>
                  <p style={{ fontSize: '1rem', color: '#64748b', margin: '0 0 0.5rem' }}>
                    Type answer (Test Mode - No STT API Call):
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      value={typedInput}
                      onChange={(e) => setTypedInput(e.target.value)}
                      placeholder="Type your answer here..."
                      style={{
                        flex: 1,
                        fontSize: '1.2rem',
                        padding: '0.75rem 1rem',
                        border: '2px solid #cbd5e1',
                        borderRadius: '8px',
                      }}
                    />
                    <button
                      type="submit"
                      disabled={state !== STATES.LISTENING}
                      style={{
                        padding: '0.75rem 1.25rem',
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        background: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: state === STATES.LISTENING ? 'pointer' : 'not-allowed',
                      }}
                    >
                      Submit
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Bottom Actions Row */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '0.75rem',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '1rem',
              }}
            >
              <button
                type="button"
                onClick={repeatQuestion}
                disabled={state !== STATES.LISTENING}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  background: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  cursor: state === STATES.LISTENING ? 'pointer' : 'not-allowed',
                }}
              >
                🔄 மீண்டும் கேள் / Repeat
              </button>

              {!currentField.required && (
                <button
                  type="button"
                  onClick={skipCurrentField}
                  disabled={state !== STATES.LISTENING}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    fontSize: '1rem',
                    fontWeight: 600,
                    background: '#f8fafc',
                    color: '#64748b',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    cursor: state === STATES.LISTENING ? 'pointer' : 'not-allowed',
                  }}
                >
                  ⏭ தவிர் / Skip
                </button>
              )}
            </div>
          </div>
        )}
    </div>
  )
}
