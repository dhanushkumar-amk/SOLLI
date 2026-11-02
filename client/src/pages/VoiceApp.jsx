import { useCallback, useEffect, useRef, useState } from 'react'
import AudioMeter from '../components/AudioMeter'
import {
  IconAlert,
  IconArrowRight,
  IconCheck,
  IconClose,
  IconCloud,
  IconDoc,
  IconGear,
  IconHelp,
  IconMic,
  IconPause,
  IconPlay,
  IconRefresh,
  IconShield,
  IconStop,
  IconTrash,
  IconVolume,
  IconVolumeMute,
} from '../components/Icons'
import InactivityModal from '../components/InactivityModal'
import OperatorSheet from '../components/OperatorSheet'
import {
  INACTIVITY_TIMEOUT_MS,
  INACTIVITY_WARNING_MS,
} from '../config'
import { STATES } from '../conversation/stateMachine'
import { useConversation } from '../conversation/useConversation'
import { triggerHaptic } from '../utils/haptics'
import { downloadReceipt } from '../utils/receiptGenerator'
import { releaseScreenWakeLock, requestScreenWakeLock } from '../utils/wakeLock'

export default function VoiceApp() {
  const [fontSize, setFontSize] = useState('normal')
  const [contrast, setContrast] = useState('normal')
  const [uiLang, setUiLang] = useState('both') // 'both' | 'ta' | 'en'
  const [selectedFormId, setSelectedFormId] = useState('pension')
  const [isOperatorSheetOpen, setIsOperatorSheetOpen] = useState(false)
  const [typedInput, setTypedInput] = useState('')

  // Inactivity safety
  const [inactivityCountdown, setInactivityCountdown] = useState(null)
  const lastActivityRef = useRef(Date.now())
  const inactivityCheckTimerRef = useRef(null)
  const countdownIntervalRef = useRef(null)

  const {
    state,
    context,
    currentField,
    progress,
    summary,
    error,
    isRecording,
    audioLevel,
    start,
    startListening,
    stopListening,
    handleConfirmTap,
    submitTyped,
    submitTypedConfirm,
    skipCurrentField,
    repeatQuestion,
    startEditField,
    confirmFullForm,
    setVoiceMuted,
    restart,
    resumeFromPause,
    confirmStartOver,
  } = useConversation({
    mode: 'voice',
    voiceMuted: false,
    formId: selectedFormId,
  })

  // Start the conversation automatically when user clicks Start
  const handleStartSession = useCallback((formId) => {
    triggerHaptic(30)
    setSelectedFormId(formId)
    start(formId)
  }, [start])

  // Scroll active field in left form pane into view
  useEffect(() => {
    if (currentField?.id) {
      const el = document.getElementById(`portal_field_${currentField.id}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [currentField?.id])

  // Inactivity timeout loop
  const registerUserActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    if (inactivityCountdown !== null) {
      setInactivityCountdown(null)
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
    }
  }, [inactivityCountdown])

  const handleClearSession = useCallback(() => {
    triggerHaptic(40)
    restart()
    setInactivityCountdown(null)
    releaseScreenWakeLock()
  }, [restart])

  useEffect(() => {
    const isSessionActive =
      state !== STATES.IDLE &&
      state !== STATES.FINISHED &&
      state !== STATES.READY_FOR_PDF

    if (!isSessionActive) {
      if (inactivityCheckTimerRef.current) {
        clearInterval(inactivityCheckTimerRef.current)
        inactivityCheckTimerRef.current = null
      }
      return
    }

    const activityEvents = ['pointerdown', 'keydown', 'touchstart']
    const handleActivity = () => registerUserActivity()

    activityEvents.forEach((ev) =>
      window.addEventListener(ev, handleActivity, { passive: true })
    )

    inactivityCheckTimerRef.current = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current
      if (idleTime >= INACTIVITY_TIMEOUT_MS && inactivityCountdown === null) {
        setInactivityCountdown(Math.round(INACTIVITY_WARNING_MS / 1000))
        countdownIntervalRef.current = setInterval(() => {
          setInactivityCountdown((prev) => {
            if (prev === null) return null
            if (prev <= 1) {
              clearInterval(countdownIntervalRef.current)
              countdownIntervalRef.current = null
              triggerHaptic([50, 100, 50])
              restart()
              releaseScreenWakeLock()
              return null
            }
            return prev - 1
          })
        }, 1000)
      }
    }, 2500)

    return () => {
      activityEvents.forEach((ev) => window.removeEventListener(ev, handleActivity))
      if (inactivityCheckTimerRef.current) clearInterval(inactivityCheckTimerRef.current)
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    }
  }, [state, registerUserActivity, restart, inactivityCountdown])

  // Wake lock
  useEffect(() => {
    if (state !== STATES.IDLE && state !== STATES.FINISHED && state !== STATES.READY_FOR_PDF) {
      requestScreenWakeLock()
    } else {
      releaseScreenWakeLock()
    }
    return () => releaseScreenWakeLock()
  }, [state])

  const handleButtonTap = (action) => {
    triggerHaptic(20)
    registerUserActivity()
    action()
  }

  const handleTypedSubmit = (e) => {
    e.preventDefault()
    if (!typedInput.trim()) return
    const text = typedInput.trim()
    setTypedInput('')
    registerUserActivity()

    if (state === STATES.LISTENING_CONFIRM) {
      submitTypedConfirm(text)
    } else {
      submitTyped(text)
    }
  }

  const isConfirmState =
    state === STATES.SPEAKING_READBACK ||
    state === STATES.LISTENING_CONFIRM ||
    state === STATES.PROCESSING_CONFIRM

  const isFinished = state === STATES.READY_FOR_PDF || state === STATES.FINISHED || state === STATES.REVIEW

  // Form fields list for the left portal
  const activeFields = context.form?.fields || [
    { id: 'applicant_name', labels: { ta: 'விண்ணப்பதாரர் பெயர்', en: 'Applicant Name' }, type: 'text' },
    { id: 'parent_spouse_name', labels: { ta: 'தந்தை / கணவர் பெயர்', en: 'Parent / Spouse Name' }, type: 'text' },
    { id: 'aadhaar', labels: { ta: 'ஆதார் எண்', en: 'Aadhaar Number' }, type: 'text', sensitive: true },
    { id: 'phone', labels: { ta: 'அலைபேசி எண்', en: 'Mobile Number' }, type: 'text' },
    { id: 'age', labels: { ta: 'வயது', en: 'Age' }, type: 'text' },
    { id: 'gender', labels: { ta: 'பாலினம்', en: 'Gender' }, type: 'text' },
    { id: 'district', labels: { ta: 'மாவட்டம்', en: 'District' }, type: 'text' },
    { id: 'pincode', labels: { ta: 'அஞ்சல் குறியீடு', en: 'Pincode' }, type: 'text' },
    { id: 'bank_account', labels: { ta: 'வங்கி கணக்கு எண்', en: 'Bank Account' }, type: 'text', sensitive: true },
    { id: 'ifsc', labels: { ta: 'IFSC குறியீடு', en: 'IFSC Code' }, type: 'text' },
  ]

  return (
    <div className="app-root" data-font-size={fontSize} data-contrast={contrast}>
      {/* Cloudflare Tech Console Header */}
      <header className="ios-navbar">
        <div className="ios-brand-badge">
          <div className="cf-cloud-icon" aria-hidden="true">
            <IconCloud size={20} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '-0.2px', color: '#ffffff' }}>
                CLOUDFLARE <span style={{ color: 'var(--brand-primary)' }}>&bull;</span> SOLLI
              </span>
              <span className="cf-pill-tag">EDGE</span>
            </div>
            <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
              ARTHA SOVEREIGN AI &bull; BHARAT
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          {/* Mute button */}
          <button
            type="button"
            onClick={() => setVoiceMuted(!context.voiceMuted)}
            className="ios-icon-btn"
            title={context.voiceMuted ? 'Unmute Audio' : 'Mute Audio'}
            aria-label="Toggle voice mute"
          >
            {context.voiceMuted ? <IconVolumeMute size={16} /> : <IconVolume size={16} />}
          </button>

          {/* Reset button */}
          {state !== STATES.IDLE && (
            <button
              type="button"
              onClick={() => handleButtonTap(restart)}
              className="ios-icon-btn"
              title="Reset Application"
              aria-label="Reset Application"
            >
              <IconRefresh size={16} />
            </button>
          )}

          {/* Settings */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20)
              setIsOperatorSheetOpen(true)
            }}
            className="ios-icon-btn"
            aria-label="Open operator settings"
            title="Operator Settings"
          >
            <IconGear size={16} />
          </button>
        </div>
      </header>

      {/* Cloudflare Live Telemetry Status Bar */}
      <div className="cf-telemetry-bar">
        <div className="cf-telemetry-item">
          <span className="cf-status-dot cf-status-live" />
          <span>STATUS: <strong style={{ color: '#f8fafc' }}>OPERATIONAL</strong></span>
        </div>
        <div className="cf-telemetry-divider" />
        <div className="cf-telemetry-item">
          <span>LATENCY: <strong style={{ color: '#f8fafc' }}>&lt; 15ms</strong></span>
        </div>
        <div className="cf-telemetry-divider" />
        <div className="cf-telemetry-item">
          <IconShield size={12} className="text-emerald-400" />
          <span>PRIVACY: <strong style={{ color: '#f8fafc' }}>ZERO RETENTION</strong></span>
        </div>
      </div>

      {/* Inactivity Warning Modal */}
      {inactivityCountdown !== null && (
        <InactivityModal
          countdown={inactivityCountdown}
          onStayActive={() => {
            triggerHaptic(30)
            registerUserActivity()
          }}
        />
      )}

      {/* Operator Sheet */}
      <OperatorSheet
        isOpen={isOperatorSheetOpen}
        onClose={() => setIsOperatorSheetOpen(false)}
        fontSize={fontSize}
        setFontSize={setFontSize}
        contrast={contrast}
        setContrast={setContrast}
        voiceMuted={context.voiceMuted}
        setVoiceMuted={setVoiceMuted}
        canResume={state === STATES.PAUSED || state === STATES.OPERATOR_PAUSED}
        onResume={() => handleButtonTap(resumeFromPause)}
        onRestart={() => handleButtonTap(restart)}
        onClearData={handleClearSession}
      />

      {/* Main Dual-Pane Split Layout */}
      <main className="cf-split-layout">
        {/* ==========================================================================
            LEFT COLUMN: The Web Form Portal ("The Simple Page")
            ========================================================================== */}
        <section className="cf-form-pane" aria-labelledby="form-portal-title">
          <div className="cf-form-portal">
            <div className="cf-portal-header">
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'var(--font-mono)' }}>
                  தமிழ்நாடு அரசு &bull; SOCIAL WELFARE DEPARTMENT
                </div>
                <h1 id="form-portal-title" style={{ fontSize: '18px', fontWeight: 800, margin: '2px 0 0', color: 'var(--text-primary)' }}>
                  {selectedFormId === 'pension' ? 'முதியோர் உதவித்தொகை திட்டம் (IGNOAPS)' : 'கல்லூரி சேர்க்கை விண்ணப்பம் (College Admission)'}
                </h1>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="cf-pill-tag">OFFICIAL FORM</span>
              </div>
            </div>

            <div className="cf-portal-body">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                வலதுபுறத்தில் உள்ள <strong>Solli Voice Assistant</strong> மூலம் பேசவும்; படிவம் தானாகவே நிரப்பப்படும்.
                <br />
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                  Speak on the right side companion to auto-fill this form in real-time.
                </span>
              </p>

              <div className="cf-form-grid cf-form-grid-2col">
                {activeFields.map((field) => {
                  const isCurrent = currentField?.id === field.id
                  const answerObj = context.answers?.[field.id]
                  const isConfirmed = Boolean(answerObj?.confirmed)
                  const displayVal = answerObj?.display || answerObj?.value || ''

                  return (
                    <div
                      key={field.id}
                      id={`portal_field_${field.id}`}
                      className={`cf-form-field ${isCurrent ? 'cf-field-active' : ''} ${isConfirmed ? 'cf-field-confirmed' : ''}`}
                    >
                      <label className="cf-field-label" htmlFor={`input_${field.id}`}>
                        <span>
                          {field.labels?.ta || field.id}
                          <span style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)' }}>
                            {field.labels?.en || field.id}
                          </span>
                        </span>

                        {isCurrent && (
                          <span className="cf-active-badge">● பேசி நிரப்பவும் / SPEAKING</span>
                        )}
                        {isConfirmed && !isCurrent && (
                          <span className="cf-confirmed-badge">✓ உறுதி செய்யப்பட்டது</span>
                        )}
                      </label>

                      <input
                        id={`input_${field.id}`}
                        type="text"
                        className="cf-field-input"
                        value={displayVal}
                        readOnly
                        placeholder={isCurrent ? 'குரல் உள்ளீட்டிற்காக காத்திருக்கிறது...' : 'காலியாக உள்ளது / Empty'}
                      />
                    </div>
                  )
                })}
              </div>

              {/* Form Bottom Submission Bar */}
              <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  RECORDS: {Object.keys(context.answers || {}).length} / {activeFields.length} FILLED
                </span>

                <button
                  type="button"
                  disabled={!isFinished}
                  onClick={() => handleButtonTap(confirmFullForm)}
                  className="ios-btn ios-btn-primary"
                  style={{ minHeight: '44px', padding: '0.5rem 1.25rem' }}
                >
                  <IconCheck size={16} />
                  <span>விண்ணப்பத்தை சமர்ப்பிக்கவும் / Submit</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================================================
            RIGHT COLUMN: Solli Voice Side Companion ("The Side Application")
            ========================================================================== */}
        <aside className="cf-side-app" aria-label="Solli Voice Assistant">
          <div className="ios-card" style={{ borderTop: '3px solid var(--brand-primary)', padding: '1.25rem' }}>
            {/* Assistant Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--brand-primary)' }} />
                <span style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '0.3px', color: 'var(--text-primary)' }}>
                  SOLLI ASSISTANT &bull; சொல்லி
                </span>
              </div>
              <span className="ios-pill-tag ios-pill-verified">VOICE ENGINE</span>
            </div>

            {/* Scheme Switcher Tabs (Only when idle) */}
            {state === STATES.IDLE && (
              <div style={{ marginBottom: '1rem' }}>
                <div className="ios-segmented-control" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selectedFormId === 'pension'}
                    className={`ios-segment-btn ${selectedFormId === 'pension' ? 'active' : ''}`}
                    onClick={() => setSelectedFormId('pension')}
                  >
                    முதியோர் உதவித்தொகை (Pension)
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selectedFormId === 'college_admission'}
                    className={`ios-segment-btn ${selectedFormId === 'college_admission' ? 'active' : ''}`}
                    onClick={() => setSelectedFormId('college_admission')}
                  >
                    கல்லூரி சேர்க்கை (College)
                  </button>
                </div>
              </div>
            )}

            {/* SCREEN A: Welcome Screen */}
            {state === STATES.IDLE && (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    background: 'var(--brand-gradient)',
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.85rem',
                    boxShadow: '0 4px 18px rgba(243, 128, 32, 0.4)',
                  }}
                  aria-hidden="true"
                >
                  <IconCloud size={36} />
                </div>

                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 0.35rem' }}>
                  சொல்லுங்கள். நாங்கள் நிரப்புகிறோம்.
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Speak in Tamil or Tanglish. Solli will automatically enter your details into the form.
                </p>

                <button
                  type="button"
                  onClick={() => handleStartSession(selectedFormId)}
                  className="ios-btn ios-btn-primary ios-btn-block"
                  style={{ minHeight: '48px', fontSize: '16px' }}
                >
                  <IconPlay size={18} />
                  <span>விண்ணப்பத்தைத் தொடங்கு / Start Voice Form</span>
                </button>
              </div>
            )}

            {/* SCREEN B: Error Screen */}
            {state === STATES.ERROR && (
              <div style={{ textAlign: 'center', padding: '0.85rem 0' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'var(--danger-light)',
                    color: 'var(--danger-red)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.5rem',
                  }}
                >
                  <IconAlert size={22} />
                </div>
                <h3 style={{ color: 'var(--danger-red)', fontSize: '15px', fontWeight: 700, margin: '0 0 0.25rem' }}>
                  {error?.messageTa || 'பிழை ஏற்பட்டது'}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
                  {error?.messageEn || 'An error occurred. Please restart.'}
                </p>

                {error?.code === 'MIC_DENIED' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.chrome?.tabs) {
                        window.chrome.tabs.create({ url: window.chrome.runtime.getURL('index.html') })
                      } else {
                        navigator.mediaDevices?.getUserMedia({ audio: true }).catch(() => {})
                      }
                    }}
                    className="ios-btn ios-btn-primary ios-btn-block"
                    style={{ marginBottom: '0.5rem' }}
                  >
                    <IconMic size={16} /> மைக்ரோஃபோன் அனுமதி கோரு / Enable Mic
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleButtonTap(restart)}
                  className="ios-btn ios-btn-secondary ios-btn-block"
                >
                  <IconRefresh size={14} /> மீண்டும் தொடங்கு / Restart
                </button>
              </div>
            )}

            {/* SCREEN C: Active Question & Voice Loop */}
            {state !== STATES.IDLE && state !== STATES.ERROR && !isFinished && currentField && (
              <div>
                {/* Progress Bar */}
                <div style={{ marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                    <span>கேள்வி {progress.done + 1} / {progress.total || activeFields.length}</span>
                    <span>{Math.round(((progress.done + 1) / (progress.total || activeFields.length)) * 100)}%</span>
                  </div>
                  <div className="ios-progress-track">
                    <div
                      className="ios-progress-fill"
                      style={{ width: `${Math.round(((progress.done + 1) / (progress.total || activeFields.length)) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Question Display Card */}
                <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem', textAlign: 'center', marginBottom: '0.85rem' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>
                    {currentField.question?.ta || currentField.labels?.ta}
                  </h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                    {currentField.question?.en || currentField.labels?.en}
                  </p>
                </div>

                {/* Confirmation Box (When waiting for Yes/No) */}
                {isConfirmState && (
                  <div className="ios-heard-card">
                    <div className="ios-heard-title">கேட்கப்பட்ட விவரம் &bull; HEARD VALUE:</div>
                    <div className="ios-heard-value">
                      {context.answers?.[currentField.id]?.display || context.answers?.[currentField.id]?.value || '...'}
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '0.45rem', marginBottom: '0.75rem' }}>
                      சரியாக இருந்தால் &quot;ஆம்&quot; எனவும், தவறெனில் &quot;இல்லை&quot; எனவும் சொல்லுங்கள்.
                    </p>

                    <div className="ios-confirm-grid" style={{ margin: 0 }}>
                      <button
                        type="button"
                        onClick={() => handleButtonTap(() => handleConfirmTap(true))}
                        className="ios-btn ios-btn-yes"
                      >
                        <IconCheck size={18} /> ஆம் / சரி (Yes)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleButtonTap(() => handleConfirmTap(false))}
                        className="ios-btn ios-btn-no"
                      >
                        <IconClose size={18} /> இல்லை (No)
                      </button>
                    </div>
                  </div>
                )}

                {/* Cloudflare Radar Acoustic Mic Button */}
                <div className="ios-mic-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      if (isRecording) {
                        stopListening()
                      } else {
                        startListening()
                      }
                    }}
                    className={`ios-mic-btn ${isRecording ? 'ios-mic-btn-recording' : ''}`}
                    aria-label={isRecording ? 'Stop recording' : 'Start speaking'}
                  >
                    <IconMic size={38} />
                  </button>

                  <div className="ios-mic-label" style={{ fontSize: '13px' }}>
                    {isRecording ? (
                      <span style={{ color: 'var(--danger-red)', fontWeight: 700 }}>
                        ● கேட்கிறது... பேசுங்கள் / Listening...
                      </span>
                    ) : (
                      <span>தட்டிப் பேசவும் / Tap to Speak</span>
                    )}
                  </div>

                  {/* Audio Level Meter */}
                  <AudioMeter level={audioLevel} />
                </div>

                {/* Fallback Keyboard Input Form */}
                <form onSubmit={handleTypedSubmit} style={{ marginTop: '0.65rem' }}>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <input
                      type="text"
                      value={typedInput}
                      onChange={(e) => setTypedInput(e.target.value)}
                      placeholder={isConfirmState ? 'ஆம் / இல்லை / Yes / No...' : 'அல்லது பதில் தட்டச்சு செய்யவும்...'}
                      className="cf-field-input"
                      style={{ fontSize: '13px', padding: '0.5rem 0.75rem' }}
                    />
                    <button
                      type="submit"
                      className="ios-btn ios-btn-primary"
                      style={{ minHeight: '38px', padding: '0.4rem 0.85rem' }}
                      title="Submit Answer"
                    >
                      <IconCheck size={16} />
                    </button>
                  </div>
                </form>

                {/* Action Shortcuts */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => handleButtonTap(repeatQuestion)}
                    className="ios-btn ios-btn-secondary"
                    style={{ minHeight: '32px', fontSize: '11px', padding: '0.2rem 0.65rem' }}
                  >
                    <IconRefresh size={12} /> மீண்டும் கேள் / Repeat
                  </button>
                  <button
                    type="button"
                    onClick={() => handleButtonTap(skipCurrentField)}
                    className="ios-btn ios-btn-secondary"
                    style={{ minHeight: '32px', fontSize: '11px', padding: '0.2rem 0.65rem' }}
                  >
                    தவிர் / Skip
                  </button>
                </div>
              </div>
            )}

            {/* SCREEN D: Application Finished & Official PDF Download */}
            {isFinished && (
              <div style={{ textAlign: 'center', padding: '0.75rem 0' }}>
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '50%',
                    background: 'var(--success-light)',
                    color: 'var(--success-green)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.65rem',
                    border: '1.5px solid var(--success-border)',
                  }}
                >
                  <IconCheck size={28} />
                </div>

                <h3 style={{ color: 'var(--success-green-dark)', fontSize: '17px', fontWeight: 800, margin: '0 0 0.25rem' }}>
                  விண்ணப்பம் முடிந்தது!
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '1.15rem' }}>
                  அனைத்து விவரங்களும் வெற்றிகரமாக பதிவு செய்யப்பட்டன.
                </p>

                {/* PDF Receipt Button */}
                <div style={{ marginBottom: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(30)
                      downloadReceipt({ form: context.form, answers: context.answers, summary })
                    }}
                    className="ios-btn ios-btn-primary ios-btn-block"
                    style={{ minHeight: '48px', fontSize: '14px', boxShadow: 'var(--shadow-btn)' }}
                  >
                    <IconDoc size={18} /> படிவ ரசீதைப் பதிவிறக்கு (PDF)
                  </button>
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '0.35rem' }}>
                    Download Official Sovereign PDF Receipt
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleButtonTap(restart)}
                  className="ios-btn ios-btn-secondary ios-btn-block"
                  style={{ minHeight: '38px', fontSize: '13px' }}
                >
                  <IconRefresh size={14} /> புதிய விண்ணப்பம் / Start New
                </button>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  )
}
