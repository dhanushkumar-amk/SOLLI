import { useState } from 'react'
import { STATES } from '../conversation/stateMachine'
import { useConversation } from '../conversation/useConversation'

export default function VoiceApp() {
  const isDev = Boolean(import.meta.env.DEV)
  const [typedInput, setTypedInput] = useState('')
  const [unconfirmedOnly, setUnconfirmedOnly] = useState(false)

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
    pendingConfirmation,
    showConfirmButtons,
    summaryReading,
    start,
    startListening,
    stopListening,
    startListeningConfirm,
    stopListeningConfirm,
    handleConfirmTap,
    submitTyped,
    submitTypedConfirm,
    skipCurrentField,
    repeatQuestion,
    startEditField,
    confirmFullForm,
    readFullSummary,
    stopSummary,
    setMode,
    setVoiceMuted,
    restart,
    speakChangeReview,
    resumeFromPause,
    confirmStartOver,
    chooseTargetField,
    cancelChooseField,
    executeCommand,
  } = useConversation({
    mode: isDev ? 'typed' : 'voice',
    voiceMuted: false,
  })

  const isConfirmState =
    state === STATES.SPEAKING_READBACK ||
    state === STATES.LISTENING_CONFIRM ||
    state === STATES.PROCESSING_CONFIRM

  const handleTypedSubmit = (e) => {
    e.preventDefault()
    if (!typedInput.trim()) return
    const text = typedInput.trim()
    setTypedInput('')

    if (state === STATES.LISTENING_CONFIRM) {
      submitTypedConfirm(text)
    } else {
      submitTyped(text)
    }
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
      case STATES.SPEAKING_READBACK:
        return {
          text: '🔊 விவரம் சரிபார்க்கப்படுகிறது... / Speaking read-back...',
          bg: '#fef3c7',
          color: '#92400e',
        }
      case STATES.LISTENING_CONFIRM:
        return {
          text: isRecording
            ? '🔴 "ஆம்" அல்லது "இல்லை" என்று சொல்லுங்கள் / Say Yes or No'
            : '👂 "ஆம்" அல்லது "இல்லை" என்று சொல்லுங்கள் அல்லது தட்டவும் / Say Yes or No or Tap below',
          bg: isRecording ? '#fee2e2' : '#ecfdf5',
          color: isRecording ? '#b91c1c' : '#065f46',
        }
      case STATES.PROCESSING_CONFIRM:
        return {
          text: '🧠 உறுதிப்படுத்தல் சரிபார்க்கப்படுகிறது... / Verifying confirmation...',
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
      case STATES.REVIEW:
        return {
          text: '📋 படிவ மதிப்பாய்வு / Form Review',
          bg: '#e0f2fe',
          color: '#0369a1',
        }
      case STATES.READY_FOR_PDF:
        return {
          text: '✅ PDF உருவாக்கத்திற்கு தயார் / Ready for PDF',
          bg: '#dcfce7',
          color: '#15803d',
        }
      case STATES.LOADING_FORM:
        return {
          text: '⏳ படிவம் ஏற்றப்படுகிறது... / Loading form...',
          bg: '#f1f5f9',
          color: '#475569',
        }
      case STATES.PAUSED:
        return {
          text: '⏸️ நிறுத்தி வைக்கப்பட்டுள்ளது / Conversation Paused',
          bg: '#f1f5f9',
          color: '#475569',
        }
      case STATES.OPERATOR_PAUSED:
        return {
          text: '👤 பணியாளர் உதவி தேவை / Operator Needed',
          bg: '#fee2e2',
          color: '#b91c1c',
        }
      case STATES.CONFIRM_START_OVER:
        return {
          text: '⚠️ மீண்டும் தொடங்குவதை உறுதிப்படுத்தவும் / Confirm Start Over',
          bg: '#fef3c7',
          color: '#92400e',
        }
      default:
        return null
    }
  }

  const badge = renderStateBadge()

  // Identify fields needing operator help
  const operatorHelpFields = (summary || []).filter((f) => f.needsOperatorHelp)

  return (
    <div
      style={{
        maxWidth: '680px',
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
            alignItems: 'center',
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
              Typed (Zero API Calls)
            </label>
          </div>
          <div>
            <label style={{ cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={context.voiceMuted}
                onChange={(e) => setVoiceMuted(e.target.checked)}
              />{' '}
              Mute Voice (Skip Timbre)
            </label>
          </div>

          {/* Phase 12: Quick on-screen voice command buttons in dev mode */}
          <div
            style={{
              width: '100%',
              borderTop: '1px solid #cbd5e1',
              paddingTop: '0.5rem',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.4rem',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Commands:</span>
            <button type="button" onClick={() => executeCommand('repeat')} style={{ fontSize: '0.78rem', padding: '0.2rem 0.5rem', background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '4px', cursor: 'pointer' }}>Repeat</button>
            <button type="button" onClick={() => executeCommand('skip')} style={{ fontSize: '0.78rem', padding: '0.2rem 0.5rem', background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '4px', cursor: 'pointer' }}>Skip</button>
            <button type="button" onClick={() => executeCommand('dont_know')} style={{ fontSize: '0.78rem', padding: '0.2rem 0.5rem', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '4px', cursor: 'pointer' }}>Don't Know</button>
            <button type="button" onClick={() => executeCommand('back')} style={{ fontSize: '0.78rem', padding: '0.2rem 0.5rem', background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '4px', cursor: 'pointer' }}>Back</button>
            <button type="button" onClick={() => executeCommand('change_field', { target: 'village' })} style={{ fontSize: '0.78rem', padding: '0.2rem 0.5rem', background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '4px', cursor: 'pointer' }}>Change Village</button>
            <button type="button" onClick={() => executeCommand('change_field', { target: 'phone' })} style={{ fontSize: '0.78rem', padding: '0.2rem 0.5rem', background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '4px', cursor: 'pointer' }}>Change Phone</button>
            <button type="button" onClick={() => executeCommand('help')} style={{ fontSize: '0.78rem', padding: '0.2rem 0.5rem', background: '#fef9c3', border: '1px solid #fef08a', borderRadius: '4px', cursor: 'pointer' }}>Help</button>
            <button type="button" onClick={() => executeCommand('operator')} style={{ fontSize: '0.78rem', padding: '0.2rem 0.5rem', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '4px', cursor: 'pointer' }}>Operator</button>
            <button type="button" onClick={() => executeCommand('stop')} style={{ fontSize: '0.78rem', padding: '0.2rem 0.5rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}>Stop</button>
            <button type="button" onClick={() => executeCommand('start_over')} style={{ fontSize: '0.78rem', padding: '0.2rem 0.5rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer' }}>Start Over</button>
          </div>
        </div>
      )}

      {/* Operator Needed Banner */}
      {(state === STATES.OPERATOR_PAUSED || context.sessionNeedsOperatorHelp) && (
        <div
          style={{
            background: '#fef2f2',
            border: '2px solid #ef4444',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '1.25rem',
            textAlign: 'center',
          }}
        >
          <h2 style={{ color: '#b91c1c', margin: '0 0 0.5rem', fontSize: '1.35rem' }}>
            👤 பணியாளர் உதவி தேவை / Operator Needed
          </h2>
          <p style={{ color: '#7f1d1d', margin: '0 0 1rem', fontSize: '1rem' }}>
            விண்ணப்பதாரருக்கு உதவி தேவைப்படுகிறது. தயவுசெய்து விண்ணப்பதாரரிடம் பேசி படிவத்தை தொடரவும்.
          </p>
          <button
            type="button"
            onClick={resumeFromPause}
            style={{
              padding: '0.75rem 1.75rem',
              background: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '1.05rem',
              cursor: 'pointer',
            }}
          >
            ▶️ பணியாளர் உதவினார், தொடரவும் / Resume Session
          </button>
        </div>
      )}

      {/* Paused Banner */}
      {state === STATES.PAUSED && (
        <div
          style={{
            background: '#f8fafc',
            border: '2px solid #94a3b8',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '1.25rem',
            textAlign: 'center',
          }}
        >
          <h2 style={{ color: '#334155', margin: '0 0 0.5rem', fontSize: '1.35rem' }}>
            ⏸️ உரையாடல் இடைநிறுத்தப்பட்டுள்ளது / Conversation Paused
          </h2>
          <p style={{ color: '#64748b', margin: '0 0 1rem', fontSize: '0.95rem' }}>
            மைக்ரோஃபோன் அணைக்கப்பட்டுள்ளது. / The microphone has been released.
          </p>
          <button
            type="button"
            onClick={resumeFromPause}
            style={{
              padding: '0.75rem 1.75rem',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '1.05rem',
              cursor: 'pointer',
            }}
          >
            ▶️ மீண்டும் தொடரவும் / Resume
          </button>
        </div>
      )}

      {/* Start Over Confirmation Modal */}
      {state === STATES.CONFIRM_START_OVER && (
        <div
          style={{
            background: '#fffbeb',
            border: '2px solid #f59e0b',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            textAlign: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        >
          <h2 style={{ color: '#92400e', margin: '0 0 0.5rem', fontSize: '1.4rem' }}>
            ⚠️ அனைத்தையும் அழித்து மீண்டும் தொடங்கவா? / Delete everything and start again?
          </h2>
          <p style={{ color: '#b45309', margin: '0 0 1.25rem', fontSize: '1rem' }}>
            இதுவரை உள்ளிட்ட அனைத்து விவரங்களும் நீக்கப்படும். / All entered answers will be cleared.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <button
              type="button"
              onClick={() => confirmStartOver(true)}
              style={{
                padding: '0.85rem 1.75rem',
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '1.1rem',
                cursor: 'pointer',
              }}
            >
              🗑️ ஆம், அனைத்தையும் அழி / Yes, delete all
            </button>
            <button
              type="button"
              onClick={() => confirmStartOver(false)}
              style={{
                padding: '0.85rem 1.75rem',
                background: '#e2e8f0',
                color: '#1e293b',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '1.1rem',
                cursor: 'pointer',
              }}
            >
              ❌ வேண்டாம், ரத்து செய் / No, keep answers
            </button>
          </div>
        </div>
      )}

      {/* Tappable Field Selection for Generic Change or Ambiguous Target */}
      {(context.choosingField || (context.ambiguousCandidates && context.ambiguousCandidates.length > 0)) && (
        <div
          style={{
            background: '#f0f9ff',
            border: '2px solid #0284c7',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '1.25rem',
          }}
        >
          <h3 style={{ color: '#0369a1', margin: '0 0 0.75rem', fontSize: '1.15rem' }}>
            {context.ambiguousCandidates
              ? 'எந்த விவரத்தை மாற்ற வேண்டும்? / Which field?'
              : 'மாற்ற வேண்டிய விவரத்தைத் தேர்ந்தெடுக்கவும் / Select field to change:'}
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {(context.ambiguousCandidates || context.form?.fields?.filter((f) => f.spoken).map((f) => f.id) || []).map(
              (fid) => {
                const fObj = context.form?.fields?.find((f) => f.id === fid)
                return (
                  <button
                    key={fid}
                    type="button"
                    onClick={() => chooseTargetField(fid)}
                    style={{
                      padding: '0.5rem 0.85rem',
                      background: '#ffffff',
                      border: '1px solid #0284c7',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      color: '#0369a1',
                    }}
                  >
                    ✏️ {fObj?.labels?.ta || fid} ({fObj?.labels?.en || fid})
                  </button>
                )
              }
            )}
          </div>
          <button
            type="button"
            onClick={cancelChooseField}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            ரத்து செய் / Cancel
          </button>
        </div>
      )}

      {/* Screen 1: Welcome Screen (IDLE) */}
      {state === STATES.IDLE && (
        <div
          style={{
            textAlign: 'center',
            padding: '2rem 1rem',
            background: '#ffffff',
            borderRadius: '12px',
            border: '2px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            margin: 'auto 0',
          }}
        >
          <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>👵🧓</div>
          <h1 style={{ fontSize: '1.75rem', color: '#0f172a', margin: '0 0 0.5rem' }}>
            சொல்லி / Solli
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#334155', fontWeight: 600, margin: '0 0 0.5rem' }}>
            முதியோர் உதவித்தொகை குரல் விண்ணப்பம்
          </p>
          <p style={{ fontSize: '1rem', color: '#64748b', margin: '0 0 1.5rem' }}>
            Old-Age Pension Voice Application
          </p>

          <button
            type="button"
            onClick={start}
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              padding: '1rem 2.5rem',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '50px',
              cursor: 'pointer',
              boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)',
            }}
          >
            தொடங்கு / Start Application
          </button>
        </div>
      )}

      {/* Screen 2: Error Screen */}
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

      {/* Screen 3: Ready for PDF (Post-confirmation final state) */}
      {state === STATES.READY_FOR_PDF && (
        <div
          style={{
            textAlign: 'center',
            padding: '2.5rem 1.5rem',
            background: '#f0fdf4',
            borderRadius: '12px',
            border: '2px solid #22c55e',
            margin: 'auto 0',
          }}
        >
          <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>🎉</div>
          <h2 style={{ fontSize: '1.6rem', color: '#15803d', margin: '0 0 0.5rem' }}>
            விண்ணப்பம் வெற்றிகரமாக உறுதிப்படுத்தப்பட்டது!
          </h2>
          <p style={{ fontSize: '1.2rem', color: '#166534', fontWeight: 600, margin: '0 0 1rem' }}>
            Application Verified & Ready for PDF (Phase 14)
          </p>
          <p style={{ color: '#475569', fontSize: '1rem', marginBottom: '2rem' }}>
            அனைத்து விவரங்களும் சரிபார்க்கப்பட்டுவிட்டன. அடுத்த கட்டமாக அரசு படிவ PDF உருவாக்கப்படும்.
          </p>
          <button
            type="button"
            onClick={restart}
            style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              padding: '0.75rem 2rem',
              background: '#15803d',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            புதிய விண்ணப்பம் / Start New
          </button>
        </div>
      )}

      {/* Screen 4: Final Review Screen */}
      {(state === STATES.REVIEW || state === STATES.FINISHED) && (
        <div style={{ margin: '1rem 0' }}>
          <div
            style={{
              background: '#ecfdf5',
              border: '1px solid #10b981',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
            }}
          >
            <h2 style={{ color: '#065f46', margin: 0, fontSize: '1.5rem' }}>
              விண்ணப்ப மதிப்பாய்வு / Application Review
            </h2>
            <p style={{ color: '#047857', margin: '0.5rem 0 0', fontSize: '1.05rem' }}>
              உங்கள் பதில்களை சரிபார்க்கவும். ரகசிய எண்கள் திரையில் மறைக்கப்பட்டுள்ளன.
              <br />
              Please review your recorded answers (sensitive numbers are masked).
            </p>
          </div>

          {/* Highlight fields marked needsOperatorHelp at top */}
          {operatorHelpFields.length > 0 && (
            <div
              style={{
                background: '#fffbeb',
                border: '2px solid #f59e0b',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                marginBottom: '1rem',
              }}
            >
              <h3 style={{ margin: '0 0 0.4rem', color: '#b45309', fontSize: '1.15rem' }}>
                ⚠️ பணியாளர் உதவி தேவைப்படும் விவரங்கள் / Needs Operator Help ({operatorHelpFields.length})
              </h3>
              <p style={{ margin: '0 0 0.5rem', color: '#92400e', fontSize: '0.95rem' }}>
                கீழ்கண்ட விவரங்களை பணியாளர் சரிபார்த்து உதவ வேண்டும்:
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#78350f' }}>
                {operatorHelpFields.map((f) => (
                  <li key={f.id} style={{ marginBottom: '0.25rem' }}>
                    <strong>{f.label}:</strong> {f.display}{' '}
                    <button
                      type="button"
                      onClick={() => startEditField(f.id)}
                      style={{
                        padding: '0.2rem 0.6rem',
                        fontSize: '0.85rem',
                        background: '#fef3c7',
                        border: '1px solid #d97706',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        marginLeft: '0.5rem',
                      }}
                    >
                      ✏️ Edit
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Full Summary Speech Reader Controls */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <button
                type="button"
                onClick={summaryReading?.active ? stopSummary : () => readFullSummary({ unconfirmedOnly })}
                style={{
                  padding: '0.65rem 1.25rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  background: summaryReading?.active ? '#dc2626' : '#0284c7',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                {summaryReading?.active ? '⏹ நிறுத்து / Stop Reading' : '🔊 அனைத்தையும் படிக்கவும் / Read everything'}
              </button>

              <button
                type="button"
                onClick={speakChangeReview}
                style={{
                  padding: '0.65rem 1.25rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  background: isRecording ? '#fee2e2' : '#f0fdf4',
                  color: isRecording ? '#b91c1c' : '#166534',
                  border: isRecording ? '2px solid #ef4444' : '2px solid #22c55e',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                🎙️ {isRecording ? 'பேசுங்கள் (8s)... / Listening...' : 'பேசி மாற்றவும் / Speak a change'}
              </button>

              <label style={{ fontSize: '0.95rem', color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={unconfirmedOnly}
                  onChange={(e) => setUnconfirmedOnly(e.target.checked)}
                />{' '}
                உறுதிப்படுத்தப்படாதவற்றை மட்டும் / Unconfirmed only
              </label>
            </div>

            {summaryReading?.active && (
              <div style={{ fontSize: '0.9rem', color: '#0369a1', fontWeight: 600 }}>
                படிக்கப்படுகிறது: {summaryReading.currentLabel || `Field ${summaryReading.index + 1}/${summaryReading.total}`}
                <br />
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  மதிப்பிடப்பட்ட Timbre எழுத்துகள்: ~{summaryReading.estimatedChars}
                </span>
              </div>
            )}
          </div>

          {/* Table of all fields with masked values & status badges */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              overflow: 'hidden',
              marginBottom: '1.5rem',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '0.65rem 0.85rem', color: '#475569' }}>விவரம் / Field</th>
                  <th style={{ padding: '0.65rem 0.85rem', color: '#475569' }}>பதிவு / Value</th>
                  <th style={{ padding: '0.65rem 0.85rem', color: '#475569' }}>நிலை / Status</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right', color: '#475569' }}>செயல் / Action</th>
                </tr>
              </thead>
              <tbody>
                {(summary || []).map((row, idx) => {
                  let statusBadge = {
                    text: '⏳ உறுதிப்படுத்தப்படவில்லை',
                    bg: '#f1f5f9',
                    color: '#475569',
                  }
                  if (row.needsOperatorHelp) {
                    statusBadge = {
                      text: '⚠️ பணியாளர் உதவி',
                      bg: '#fef3c7',
                      color: '#b45309',
                    }
                  } else if (row.confirmed) {
                    statusBadge = {
                      text: '✅ சரிபார்க்கப்பட்டது',
                      bg: '#dcfce7',
                      color: '#15803d',
                    }
                  } else if (row.skipped) {
                    statusBadge = {
                      text: '⏭ தவிர்க்கப்பட்டது',
                      bg: '#f1f5f9',
                      color: '#64748b',
                    }
                  }

                  return (
                    <tr
                      key={row.id || idx}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: idx % 2 === 0 ? '#fafafa' : '#ffffff',
                      }}
                    >
                      <td style={{ padding: '0.75rem 0.85rem', fontWeight: 600, color: '#334155' }}>
                        {row.label}
                      </td>
                      <td
                        style={{
                          padding: '0.75rem 0.85rem',
                          color: row.sensitive ? '#0284c7' : '#0f172a',
                          fontWeight: row.sensitive ? 700 : 500,
                        }}
                      >
                        {row.display}
                      </td>
                      <td style={{ padding: '0.75rem 0.85rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            background: statusBadge.bg,
                            color: statusBadge.color,
                          }}
                        >
                          {statusBadge.text}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>
                        {row.spoken && (
                          <button
                            type="button"
                            onClick={() => startEditField(row.id)}
                            style={{
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.9rem',
                              fontWeight: 600,
                              background: '#f8fafc',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            ✏️ Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Final Question Section: "Is everything correct?" */}
          <div
            style={{
              background: '#f8fafc',
              border: '2px solid #cbd5e1',
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center',
            }}
          >
            <h3 style={{ fontSize: '1.35rem', color: '#0f172a', margin: '0 0 0.5rem' }}>
              அனைத்து விவரங்களும் சரியா? / Is everything correct?
            </h3>
            <p style={{ fontSize: '1rem', color: '#64748b', margin: '0 0 1.25rem' }}>
              சரியாக இருந்தால் "ஆம்" என்பதை அழுத்தவும். மாற்ற வேண்டியிருந்தால் மேலே உள்ள "Edit" பொத்தானைத் தட்டவும்.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              <button
                type="button"
                onClick={confirmFullForm}
                style={{
                  padding: '0.85rem 2rem',
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(22, 163, 74, 0.3)',
                }}
              >
                ✅ ஆம், எல்லாம் சரி / Yes, all correct
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screen 5: Active Question / Confirmation Loop */}
      {state !== STATES.IDLE &&
        state !== STATES.ERROR &&
        state !== STATES.FINISHED &&
        state !== STATES.REVIEW &&
        state !== STATES.READY_FOR_PDF &&
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
                  {isConfirmState
                    ? 'சரிபார்த்தல் / Confirmation'
                    : `கேள்வி ${progress.done + 1} / ${progress.total}`}
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
                    padding: '0.45rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    marginBottom: '1.25rem',
                  }}
                >
                  {badge.text}
                </div>
              )}

              {/* Main Card: Prompt / Readback Text */}
              <div
                style={{
                  background: isConfirmState ? '#fffbeb' : '#ffffff',
                  border: isConfirmState ? '2px solid #f59e0b' : '2px solid #e2e8f0',
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

            {/* Middle Section: Confirmation Buttons / Mic / Typed Input */}
            <div style={{ textAlign: 'center', margin: '0.5rem 0 1.5rem' }}>
              {/* Always show prominent Yes and No buttons during confirmation */}
              {isConfirmState && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155', marginBottom: '0.75rem' }}>
                    தட்டவும் அல்லது பேசவும் / Tap or Speak:
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '1.25rem',
                      maxWidth: '420px',
                      margin: '0 auto',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleConfirmTap('yes')}
                      style={{
                        flex: 1,
                        padding: '1.15rem 1rem',
                        fontSize: '1.35rem',
                        fontWeight: 700,
                        background: '#16a34a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        boxShadow: '0 6px 12px rgba(22, 163, 74, 0.3)',
                        transition: 'transform 0.1s',
                      }}
                    >
                      👍 ஆம் / Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmTap('no')}
                      style={{
                        flex: 1,
                        padding: '1.15rem 1rem',
                        fontSize: '1.35rem',
                        fontWeight: 700,
                        background: '#dc2626',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        boxShadow: '0 6px 12px rgba(220, 38, 38, 0.3)',
                        transition: 'transform 0.1s',
                      }}
                    >
                      👎 இல்லை / No
                    </button>
                  </div>
                </div>
              )}

              {context.mode === 'voice' ? (
                <div>
                  {/* Large Mic Button */}
                  <button
                    type="button"
                    disabled={
                      state === STATES.SPEAKING_QUESTION ||
                      state === STATES.SPEAKING_READBACK ||
                      state === STATES.PROCESSING ||
                      state === STATES.PROCESSING_CONFIRM
                    }
                    onClick={() => {
                      if (isConfirmState) {
                        isRecording ? stopListeningConfirm() : startListeningConfirm()
                      } else {
                        isRecording ? stopListening() : startListening()
                      }
                    }}
                    style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      fontSize: '2.75rem',
                      background: isRecording
                        ? '#dc2626'
                        : state === STATES.LISTENING || state === STATES.LISTENING_CONFIRM
                          ? '#2563eb'
                          : '#94a3b8',
                      color: '#ffffff',
                      border: isRecording ? '6px solid #fecaca' : 'none',
                      cursor:
                        state === STATES.SPEAKING_QUESTION ||
                        state === STATES.SPEAKING_READBACK ||
                        state === STATES.PROCESSING ||
                        state === STATES.PROCESSING_CONFIRM
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
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      color: isRecording ? '#dc2626' : '#334155',
                      marginTop: '0.75rem',
                    }}
                  >
                    {isRecording
                      ? 'தட்டி முடிக்கவும் / Tap to Stop'
                      : state === STATES.LISTENING || state === STATES.LISTENING_CONFIRM
                        ? isConfirmState
                          ? 'தட்டி "ஆம்" அல்லது "இல்லை" சொல்லவும் / Tap & say Yes/No'
                          : 'தட்டி பேசவும் / Tap to Speak'
                        : 'காத்திருக்கவும் / Please wait...'}
                  </p>
                </div>
              ) : (
                /* Typed Test Mode Input */
                <form onSubmit={handleTypedSubmit} style={{ maxWidth: '480px', margin: '0 auto' }}>
                  <p style={{ fontSize: '1rem', color: '#64748b', margin: '0 0 0.5rem' }}>
                    {isConfirmState
                      ? 'Type confirmation ("yes" / "no" / "aama" / "illa"):'
                      : 'Type answer (Test Mode - Zero API Credits):'}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      value={typedInput}
                      onChange={(e) => setTypedInput(e.target.value)}
                      placeholder={isConfirmState ? 'Type yes or no...' : 'Type answer here...'}
                      style={{
                        flex: 1,
                        fontSize: '1.15rem',
                        padding: '0.75rem 1rem',
                        border: '2px solid #cbd5e1',
                        borderRadius: '8px',
                      }}
                    />
                    <button
                      type="submit"
                      disabled={state !== STATES.LISTENING && state !== STATES.LISTENING_CONFIRM}
                      style={{
                        padding: '0.75rem 1.25rem',
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        background: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor:
                          state === STATES.LISTENING || state === STATES.LISTENING_CONFIRM
                            ? 'pointer'
                            : 'not-allowed',
                      }}
                    >
                      Submit
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Bottom Actions Row */}
            {!isConfirmState && (
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
            )}
          </div>
        )}
    </div>
  )
}
