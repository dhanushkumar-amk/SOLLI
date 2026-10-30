import { useCallback, useEffect, useRef, useState } from 'react'
import AudioMeter from '../components/AudioMeter'
import InactivityModal from '../components/InactivityModal'
import OperatorBar from '../components/OperatorBar'
import StateBanner from '../components/StateBanner'
import {
  INACTIVITY_TIMEOUT_MS,
  INACTIVITY_WARNING_MS,
  LONG_WAIT_THRESHOLD_MS,
} from '../config'
import { STATES } from '../conversation/stateMachine'
import { useConversation } from '../conversation/useConversation'
import { triggerHaptic } from '../utils/haptics'
import { releaseScreenWakeLock, requestScreenWakeLock } from '../utils/wakeLock'

export default function VoiceApp() {
  const isDev = Boolean(import.meta.env.DEV)

  // In-memory UI accessibility preferences (Never written to storage)
  const [fontSize, setFontSize] = useState('normal') // 'normal' | 'large' | 'xlarge'
  const [contrast, setContrast] = useState('normal') // 'normal' | 'high'
  const [uiLang, setUiLang] = useState('both') // 'both' | 'ta' | 'en'

  // Typed input for dev mode only
  const [typedInput, setTypedInput] = useState('')
  const [unconfirmedOnly, setUnconfirmedOnly] = useState(false)

  // Waiting feedback & Long wait (>6s) state
  const [isTakingLong, setIsTakingLong] = useState(false)
  const waitTimerRef = useRef(null)

  // Inactivity timeout & countdown state (Kiosk Privacy)
  const [inactivityCountdown, setInactivityCountdown] = useState(null)
  const [wasTimedOut, setWasTimedOut] = useState(false)
  const lastActivityRef = useRef(Date.now())
  const inactivityCheckTimerRef = useRef(null)
  const countdownIntervalRef = useRef(null)

  const {
    state,
    context,
    currentField,
    progress,
    answers,
    summary,
    error,
    isRecording,
    pendingConfirmation,
    summaryReading,
    audioLevel,
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
    setVoiceMuted,
    restart,
    speakChangeReview,
    resumeFromPause,
    confirmStartOver,
    chooseTargetField,
    cancelChooseField,
    executeCommand,
  } = useConversation({
    mode: 'voice',
    voiceMuted: false,
  })

  const isConfirmState =
    state === STATES.SPEAKING_READBACK ||
    state === STATES.LISTENING_CONFIRM ||
    state === STATES.PROCESSING_CONFIRM

  const isWaitingState =
    state === STATES.TRANSCRIBING ||
    state === STATES.PROCESSING ||
    state === STATES.PROCESSING_CONFIRM ||
    state === STATES.LOADING_FORM

  // 1. Long wait feedback (> 6 seconds)
  useEffect(() => {
    if (isWaitingState) {
      waitTimerRef.current = setTimeout(() => {
        setIsTakingLong(true)
      }, LONG_WAIT_THRESHOLD_MS)
    } else {
      setIsTakingLong(false)
      if (waitTimerRef.current) {
        clearTimeout(waitTimerRef.current)
        waitTimerRef.current = null
      }
    }

    return () => {
      if (waitTimerRef.current) {
        clearTimeout(waitTimerRef.current)
      }
    }
  }, [isWaitingState])

  // 2. Screen Wake Lock management (Active during session, released on finish/idle)
  useEffect(() => {
    if (
      state !== STATES.IDLE &&
      state !== STATES.FINISHED &&
      state !== STATES.READY_FOR_PDF &&
      state !== STATES.ERROR
    ) {
      requestScreenWakeLock()
    } else {
      releaseScreenWakeLock()
    }

    return () => {
      releaseScreenWakeLock()
    }
  }, [state])

  // 3. Kiosk Inactivity Safety Loop (3 minutes idle -> 20s warning -> clear answers)
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

  // Clear in-memory answers on demand
  const handleClearSession = useCallback(() => {
    triggerHaptic(40)
    restart()
    setWasTimedOut(false)
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
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
      return
    }

    // Attach interaction listeners to reset idle timer
    const activityEvents = ['pointerdown', 'keydown', 'touchstart', 'focusin']
    const handleActivity = () => registerUserActivity()

    activityEvents.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }))

    // Check idle status every 2 seconds
    inactivityCheckTimerRef.current = setInterval(() => {
      const idleMs = Date.now() - lastActivityRef.current
      const warningThreshold = INACTIVITY_TIMEOUT_MS - INACTIVITY_WARNING_MS

      if (idleMs >= INACTIVITY_TIMEOUT_MS) {
        // Timeout expired: clear all answers immediately and return to Welcome screen
        clearInterval(inactivityCheckTimerRef.current)
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current)
        }
        setInactivityCountdown(null)
        setWasTimedOut(true)
        restart()
      } else if (idleMs >= warningThreshold && inactivityCountdown === null) {
        // Start 20s countdown warning
        const remainingSec = Math.max(1, Math.ceil((INACTIVITY_TIMEOUT_MS - idleMs) / 1000))
        setInactivityCountdown(remainingSec)

        countdownIntervalRef.current = setInterval(() => {
          setInactivityCountdown((prev) => {
            if (prev === null || prev <= 1) {
              clearInterval(countdownIntervalRef.current)
              countdownIntervalRef.current = null
              setWasTimedOut(true)
              restart()
              return null
            }
            return prev - 1
          })
        }, 1000)
      }
    }, 2000)

    return () => {
      activityEvents.forEach((ev) => window.removeEventListener(ev, handleActivity))
      if (inactivityCheckTimerRef.current) {
        clearInterval(inactivityCheckTimerRef.current)
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [state, registerUserActivity, restart, inactivityCountdown])

  // Handle tap with haptic feedback
  const handleButtonTap = (action) => {
    triggerHaptic(25)
    registerUserActivity()
    action()
  }

  // Handle typed submission (Dev Mode Only)
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

  // Identify fields needing operator help
  const operatorHelpFields = (summary || []).filter((f) => f.needsOperatorHelp)

  // Progress calculations
  const currentStep = progress.done + 1
  const totalSteps = progress.total || 12
  const progressPercent = Math.min(100, Math.round((progress.done / totalSteps) * 100))

  return (
    <div
      className="app-wrapper"
      data-font-size={fontSize}
      data-contrast={contrast}
    >
      {/* Accessible live region for assertive alerts (Errors & Inactivity) */}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {error ? `பிழை: ${error.messageTa} - Error: ${error.messageEn}` : ''}
        {inactivityCountdown !== null
          ? `எச்சரிக்கை: ${inactivityCountdown} வினாடிகளில் அமர்வு முடிவடையும். Warning: session will expire in ${inactivityCountdown} seconds.`
          : ''}
      </div>

      <main className="main-container">
        {/* Operator Bar (Collapsed by default, in-memory controls) */}
        <OperatorBar
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

        {/* Operator Needed Alert Banner */}
        {(state === STATES.OPERATOR_PAUSED || context.sessionNeedsOperatorHelp) && (
          <aside
            className="status-card"
            style={{
              backgroundColor: 'var(--color-warning-bg)',
              border: '3px solid var(--color-warning-border)',
              marginBottom: 'var(--space-4)',
            }}
            role="alert"
          >
            <h2 style={{ color: 'var(--color-warning-text)', margin: '0 0 var(--space-2)' }}>
              👤 பணியாளர் உதவி தேவை / Operator Assistance Needed
            </h2>
            <p style={{ color: 'var(--color-warning-text)', fontSize: 'var(--font-size-body)' }}>
              விண்ணப்பதாரருக்கு உதவி தேவைப்படுகிறது. தயவுசெய்து விவரங்களை சரிபார்த்து உதவவும்.
              <br />
              <span style={{ fontSize: 'var(--font-size-caption)' }}>
                Please review the question with the applicant, then resume the session.
              </span>
            </p>
            <button
              type="button"
              onClick={() => handleButtonTap(resumeFromPause)}
              className="btn btn-primary"
              style={{ minHeight: '56px', width: '100%', maxWidth: '360px', margin: 'var(--space-3) auto 0' }}
            >
              ▶️ பணியாளர் உதவினார், தொடரவும் / Resume Session
            </button>
          </aside>
        )}

        {/* Paused Screen */}
        {state === STATES.PAUSED && (
          <div className="status-card status-card-paused" role="status">
            <h2 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
              ⏸️ உரையாடல் இடைநிறுத்தப்பட்டுள்ளது / Conversation Paused
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
              மைக்ரோஃபோன் அணைக்கப்பட்டுள்ளது. நீங்கள் தயாரானதும் தொடரலாம்.
              <br />
              <span style={{ fontSize: 'var(--font-size-caption)' }}>
                Microphone is released. Tap Resume when ready.
              </span>
            </p>
            <button
              type="button"
              onClick={() => handleButtonTap(resumeFromPause)}
              className="btn btn-primary"
              style={{ minHeight: '60px', padding: '0.85rem 2.5rem' }}
            >
              ▶️ மீண்டும் தொடரவும் / Resume Session
            </button>
          </div>
        )}

        {/* Start Over Confirmation Modal */}
        {state === STATES.CONFIRM_START_OVER && (
          <div
            className="modal-overlay"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="startover-title"
          >
            <div className="modal-content">
              <span style={{ fontSize: '3rem' }} aria-hidden="true">
                ⚠️
              </span>
              <h2 id="startover-title" style={{ color: 'var(--color-no)', margin: '0.5rem 0' }}>
                அனைத்தையும் அழித்து மீண்டும் தொடங்கவா?
                <br />
                <span style={{ fontSize: 'var(--font-size-btn)', color: 'var(--text-secondary)' }}>
                  Delete everything and start again?
                </span>
              </h2>
              <p style={{ margin: 'var(--space-3) 0 var(--space-5)' }}>
                இதுவரை உள்ளிட்ட அனைத்து விவரங்களும் நினைவகத்திலிருந்து நீக்கப்படும்.
                <br />
                <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--text-muted)' }}>
                  All entered answers will be permanently erased.
                </span>
              </p>
              <div className="confirm-btn-row">
                <button
                  type="button"
                  onClick={() => handleButtonTap(() => confirmStartOver(true))}
                  className="btn btn-no"
                >
                  🗑️ ஆம், அழி / Yes, delete
                </button>
                <button
                  type="button"
                  onClick={() => handleButtonTap(() => confirmStartOver(false))}
                  className="btn btn-neutral"
                >
                  ❌ ரத்து / Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Field Targeting Selection (When Voice Command asks to change a field) */}
        {(context.choosingField || (context.ambiguousCandidates && context.ambiguousCandidates.length > 0)) && (
          <div
            className="status-card"
            style={{
              backgroundColor: 'var(--color-yes-bg)',
              border: '2px solid var(--color-yes-border)',
              marginBottom: 'var(--space-4)',
              textAlign: 'left',
            }}
          >
            <h3 style={{ color: 'var(--color-yes)', marginBottom: 'var(--space-3)' }}>
              ✏️ மாற்ற வேண்டிய விவரத்தைத் தேர்ந்தெடுக்கவும் / Select field to change:
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
              {(context.ambiguousCandidates || context.form?.fields?.filter((f) => f.spoken).map((f) => f.id) || []).map(
                (fid) => {
                  const fObj = context.form?.fields?.find((f) => f.id === fid)
                  return (
                    <button
                      key={fid}
                      type="button"
                      onClick={() => handleButtonTap(() => chooseTargetField(fid))}
                      className="btn btn-neutral"
                      style={{ fontSize: 'var(--font-size-caption)', minHeight: '48px' }}
                    >
                      ✏️ {fObj?.labels?.ta || fid} ({fObj?.labels?.en || fid})
                    </button>
                  )
                }
              )}
            </div>
            <button
              type="button"
              onClick={() => handleButtonTap(cancelChooseField)}
              className="btn btn-neutral"
              style={{ minHeight: '44px' }}
            >
              ரத்து செய் / Cancel
            </button>
          </div>
        )}

        {/* ==========================================================================
            SCREEN 1: Welcome Screen (STATES.IDLE)
            ========================================================================== */}
        {state === STATES.IDLE && (
          <section className="welcome-card" aria-labelledby="solli-welcome-title">
            <div className="welcome-logo" aria-hidden="true">
              👵🧓
            </div>

            <h1 id="solli-welcome-title" className="welcome-title">
              <span lang="ta">சொல்லி</span> / <span lang="en">Solli</span>
            </h1>

            <p className="welcome-tagline">
              {uiLang !== 'en' && <span lang="ta">சொல்லுங்கள். நாங்கள் படிவத்தை நிரப்புகிறோம்.</span>}
              {uiLang === 'both' && <br />}
              {uiLang !== 'ta' && <span lang="en">Just say it. We&apos;ll fill the form.</span>}
            </p>

            <p style={{ color: 'var(--brand-primary)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
              முதியோர் உதவித்தொகை குரல் விண்ணப்பம்
              <br />
              <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--text-secondary)' }}>
                Old-Age Pension Voice Application
              </span>
            </p>

            {/* Language toggle for UI text */}
            <div
              className="lang-toggle-group"
              role="radiogroup"
              aria-label="Language selection for UI display"
            >
              <button
                type="button"
                role="radio"
                aria-checked={uiLang === 'both'}
                className={`lang-btn ${uiLang === 'both' ? 'active' : ''}`}
                onClick={() => handleButtonTap(() => setUiLang('both'))}
              >
                தமிழ் / English
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={uiLang === 'ta'}
                className={`lang-btn ${uiLang === 'ta' ? 'active' : ''}`}
                onClick={() => handleButtonTap(() => setUiLang('ta'))}
              >
                தமிழ் மட்டும்
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={uiLang === 'en'}
                className={`lang-btn ${uiLang === 'en' ? 'active' : ''}`}
                onClick={() => handleButtonTap(() => setUiLang('en'))}
              >
                English only
              </button>
            </div>

            {/* Large Start Button */}
            <div style={{ margin: 'var(--space-5) 0 var(--space-4)' }}>
              <button
                type="button"
                onClick={() => handleButtonTap(start)}
                className="btn btn-primary"
                style={{
                  minHeight: '68px',
                  fontSize: 'var(--font-size-btn-large)',
                  padding: '1.25rem 2.75rem',
                  borderRadius: 'var(--radius-pill)',
                  width: '100%',
                  maxWidth: '420px',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                {uiLang === 'en' ? 'Start Application →' : uiLang === 'ta' ? 'தொடங்கு →' : 'தொடங்கு / Start Application →'}
              </button>
            </div>

            {/* Inactivity cleared notification notice */}
            {wasTimedOut && (
              <p
                role="alert"
                style={{
                  color: 'var(--color-no)',
                  fontWeight: 700,
                  fontSize: 'var(--font-size-caption)',
                  margin: 'var(--space-3) 0',
                }}
              >
                🔒 செயலற்ற நேரம் முடிந்ததால் பாதுகாப்பிற்காக விவரங்கள் அழிக்கப்பட்டன.
                <br />
                Previous session timed out; answers were cleared for your privacy.
              </p>
            )}

            {/* Prototype and Privacy Notices */}
            <div className="welcome-notice">
              <span aria-hidden="true">⚠️</span>{' '}
              <strong>முன்மாதிரி - மாதிரி தரவு மட்டுமே, எங்கும் சமர்ப்பிக்கப்படாது.</strong>
              <br />
              <span style={{ fontSize: 'var(--font-size-small)' }}>
                Prototype — Fake data only, nothing is submitted to any government portal.
              </span>
            </div>

            <p className="welcome-privacy">
              🔒 <strong>எந்த விவரமும் சேமிக்கப்படுவதில்லை.</strong> நீங்கள் முடித்ததும் உங்கள் பதில்கள் அழிந்துவிடும்.
              <br />
              <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--text-muted)' }}>
                Nothing is stored. Your answers disappear completely when you finish.
              </span>
            </p>
          </section>
        )}

        {/* ==========================================================================
            SCREEN 2: Error Screen (STATES.ERROR)
            ========================================================================== */}
        {state === STATES.ERROR && (
          <section className="status-card status-card-error" role="alert" aria-labelledby="error-heading">
            <span style={{ fontSize: '3.5rem' }} aria-hidden="true">
              ⚠️
            </span>
            <h2 id="error-heading" style={{ color: 'var(--color-no)', margin: 'var(--space-2) 0' }}>
              பிழை ஏற்பட்டது / Error Encountered
            </h2>

            {/* Mic Blocked specific guidance */}
            {error?.code === 'MIC_DENIED' ? (
              <div style={{ textAlign: 'left', margin: 'var(--space-4) 0' }}>
                <p style={{ fontWeight: 700, color: 'var(--color-no)', fontSize: 'var(--font-size-btn)' }}>
                  மைக்ரோஃபோன் அணுகல் மறுக்கப்பட்டது / Microphone Access Blocked
                </p>
                <ol style={{ paddingLeft: '1.5rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                  <li>உலாவி முகவரிப் பட்டியில் உள்ள பூட்டு (🔒) அல்லது அமைப்புகள் குறியீட்டைத் தட்டவும். (Tap lock icon in browser bar)</li>
                  <li>மைக்ரோஃபோன் அனுமதியை &quot;Allow&quot; என மாற்றவும். (Allow microphone access)</li>
                  <li>கீழே உள்ள &quot;மீண்டும் முயற்சி&quot; பொத்தானைத் தட்டவும். (Tap Retry below)</li>
                </ol>
              </div>
            ) : error?.code === 'RATE_LIMIT' ? (
              <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--color-no)', fontWeight: 600 }}>
                அனுமதிக்கப்பட்ட வரம்பு முடிந்தது. தயவுசெய்து பணியாளரின் உதவியை நாடவும்.
                <br />
                <span style={{ fontSize: 'var(--font-size-caption)' }}>
                  Rate limit reached. Please inform the kiosk operator.
                </span>
              </p>
            ) : (
              <div>
                <p style={{ fontSize: 'var(--font-size-btn)', color: 'var(--color-no)', fontWeight: 700 }}>
                  {error?.messageTa || 'எதிர்பாராத பிழை ஏற்பட்டது.'}
                </p>
                <p style={{ color: 'var(--text-secondary)' }}>
                  {error?.messageEn || 'An unexpected error occurred. Please contact the operator.'}
                </p>
              </div>
            )}

            <div style={{ marginTop: 'var(--space-5)', display: 'flex', justifyContent: 'center', gap: 'var(--space-3)' }}>
              <button
                type="button"
                onClick={() => handleButtonTap(restart)}
                className="btn btn-no"
                style={{ minHeight: '56px', padding: '0.85rem 2rem' }}
              >
                🔄 மறுதொடக்கம் / Restart Application
              </button>
            </div>
          </section>
        )}

        {/* ==========================================================================
            SCREEN 3: Finished / Ready for PDF Screen (STATES.READY_FOR_PDF)
            ========================================================================== */}
        {state === STATES.READY_FOR_PDF && (
          <section className="status-card status-card-success" aria-labelledby="done-title">
            <span style={{ fontSize: '3.5rem' }} aria-hidden="true">
              🎉
            </span>

            <h2 id="done-title" style={{ color: 'var(--color-yes)', margin: 'var(--space-2) 0' }}>
              விண்ணப்பம் முடிந்தது! / Application Complete!
            </h2>

            <p style={{ fontSize: 'var(--font-size-btn)', color: 'var(--color-yes)', fontWeight: 700 }}>
              அனைத்து விவரங்களும் வெற்றிகரமாக பதிவு செய்யப்பட்டன.
              <br />
              <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--text-secondary)' }}>
                All details have been verified and are ready.
              </span>
            </p>

            <div style={{ margin: 'var(--space-5) 0' }}>
              {/* PDF Placeholder disabled button */}
              <button
                type="button"
                disabled
                className="btn btn-neutral"
                style={{
                  width: '100%',
                  maxWidth: '420px',
                  minHeight: '64px',
                  margin: '0 auto',
                  opacity: 0.75,
                }}
                aria-describedby="pdf-phase-note"
              >
                📄 படிவத்தைப் பதிவிறக்கு (PDF) / Download Form (PDF)
              </button>
              <p
                id="pdf-phase-note"
                style={{
                  fontSize: 'var(--font-size-small)',
                  color: 'var(--text-muted)',
                  marginTop: 'var(--space-2)',
                }}
              >
                (கட்டம் 14-ல் அரசு PDF உருவாக்கம் வரும் / Coming in Phase 14)
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', maxWidth: '380px', margin: '0 auto' }}>
              <button
                type="button"
                onClick={() => handleButtonTap(restart)}
                className="btn btn-primary"
                style={{ minHeight: '56px' }}
              >
                புதிய விண்ணப்பம் / Start New
              </button>

              <button
                type="button"
                onClick={handleClearSession}
                className="btn btn-neutral"
                style={{ minHeight: '56px', color: 'var(--color-no)' }}
              >
                🗑️ முடித்து அழிக்கவும் / Finish & Clear Data
              </button>
            </div>

            <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--text-muted)', marginTop: 'var(--space-5)' }}>
              🔒 இந்த சாதனத்தில் உங்கள் பதில்கள் சேமிக்கப்படாது.
              <br />
              No answers or transcripts are retained in this kiosk.
            </p>
          </section>
        )}

        {/* ==========================================================================
            SCREEN 4: Application Review Screen (STATES.REVIEW || STATES.FINISHED)
            ========================================================================== */}
        {(state === STATES.REVIEW || state === STATES.FINISHED) && (
          <section aria-labelledby="review-heading" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <h1 id="review-heading" style={{ fontSize: 'var(--font-size-btn-large)', marginBottom: 'var(--space-1)' }}>
                📋 விண்ணப்ப மதிப்பாய்வு / Application Review
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-body)' }}>
                உங்கள் பதில்களை சரிபார்க்கவும். ரகசிய எண்கள் பாதுகாப்பாக மறைக்கப்பட்டுள்ளன.
                <br />
                <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--text-muted)' }}>
                  Please check your answers. Sensitive numbers remain masked.
                </span>
              </p>
            </div>

            {/* Highlighted Needs Operator Section */}
            {operatorHelpFields.length > 0 && (
              <aside
                className="status-card"
                style={{
                  backgroundColor: 'var(--color-warning-bg)',
                  border: '2px solid var(--color-warning-border)',
                  marginBottom: 'var(--space-4)',
                  textAlign: 'left',
                }}
                role="alert"
              >
                <h2 style={{ fontSize: 'var(--font-size-btn)', color: 'var(--color-warning-text)', margin: '0 0 var(--space-2)' }}>
                  ⚠️ பணியாளர் உதவி தேவைப்படும் விவரங்கள் / Needs Operator Help ({operatorHelpFields.length})
                </h2>
                <p style={{ color: 'var(--color-warning-text)', fontSize: 'var(--font-size-caption)', marginBottom: 'var(--space-3)' }}>
                  கீழ்கண்ட விவரங்களை பணியாளர் சரிபார்த்து உதவ வேண்டும்:
                </p>
                <ul style={{ paddingLeft: '1.25rem', color: 'var(--color-warning-text)' }}>
                  {operatorHelpFields.map((f) => (
                    <li key={f.id} style={{ marginBottom: 'var(--space-2)' }}>
                      <strong>{f.label}:</strong> {f.display}{' '}
                      <button
                        type="button"
                        onClick={() => handleButtonTap(() => startEditField(f.id))}
                        className="edit-btn"
                        style={{ marginLeft: 'var(--space-2)' }}
                      >
                        ✏️ Edit / மாற்று
                      </button>
                    </li>
                  ))}
                </ul>
              </aside>
            )}

            {/* Speech Reader Controls & Speak Change */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-3) var(--space-4)',
                marginBottom: 'var(--space-4)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'var(--space-3)',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() =>
                    handleButtonTap(summaryReading?.active ? stopSummary : () => readFullSummary({ unconfirmedOnly }))
                  }
                  className="btn btn-neutral"
                  style={{ minHeight: '48px', fontSize: 'var(--font-size-caption)' }}
                >
                  {summaryReading?.active ? '⏹ நிறுத்து / Stop' : '🔊 அனைத்தையும் படி / Read all'}
                </button>

                <button
                  type="button"
                  onClick={() => handleButtonTap(speakChangeReview)}
                  className={`btn ${isRecording ? 'btn-no' : 'btn-neutral'}`}
                  style={{ minHeight: '48px', fontSize: 'var(--font-size-caption)' }}
                >
                  🎙️ {isRecording ? 'பேசுங்கள் (8s)...' : 'பேசி மாற்றவும் / Speak change'}
                </button>

                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--font-size-caption)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={unconfirmedOnly}
                    onChange={(e) => setUnconfirmedOnly(e.target.checked)}
                    style={{ width: '20px', height: '20px' }}
                  />
                  <span>உறுதிப்படுத்தப்படாதவை மட்டும்</span>
                </label>
              </div>

              {summaryReading?.active && (
                <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--brand-primary)', fontWeight: 700 }}>
                  படிக்கப்படுகிறது: {summaryReading.currentLabel || `Field ${summaryReading.index + 1}/${summaryReading.total}`}
                </div>
              )}
            </div>

            {/* Review Table */}
            <div className="review-table-container">
              <table className="review-table">
                <thead>
                  <tr>
                    <th scope="col">விவரம் / Field</th>
                    <th scope="col">பதிவு / Value</th>
                    <th scope="col">நிலை / Status</th>
                    <th scope="col" style={{ textAlign: 'right' }}>செயல் / Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary || []).map((row, idx) => {
                    let statusClass = 'status-badge-unconfirmed'
                    let statusLabel = '⏳ உறுதிப்படுத்தப்படவில்லை'

                    if (row.needsOperatorHelp) {
                      statusClass = 'status-badge-operator'
                      statusLabel = '⚠️ பணியாளர் உதவி'
                    } else if (row.confirmed) {
                      statusClass = 'status-badge-verified'
                      statusLabel = '✅ சரிபார்க்கப்பட்டது'
                    } else if (row.skipped) {
                      statusClass = 'status-badge-skipped'
                      statusLabel = '⏭ தவிர்க்கப்பட்டது'
                    }

                    return (
                      <tr key={row.id || idx}>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {row.label}
                        </td>
                        <td style={{ fontWeight: row.sensitive ? 800 : 600, color: row.sensitive ? 'var(--brand-primary)' : 'inherit' }}>
                          {row.display}
                        </td>
                        <td>
                          <span className={`status-badge ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {row.spoken && (
                            <button
                              type="button"
                              onClick={() => handleButtonTap(() => startEditField(row.id))}
                              className="edit-btn"
                              aria-label={`Edit ${row.label}`}
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

            {/* Final Confirmation Action */}
            <div
              className="status-card"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '2px solid var(--border-default)',
                marginBottom: 'var(--space-5)',
              }}
            >
              <h2 style={{ fontSize: 'var(--font-size-btn)', color: 'var(--text-primary)', margin: '0 0 var(--space-2)' }}>
                அனைத்து விவரங்களும் சரியா? / Is everything correct?
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                சரியாக இருந்தால் &quot;ஆம்&quot; என்பதை அழுத்தவும். மாற்ற வேண்டியிருந்தால் மேலே &quot;Edit&quot; தட்டவும்.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleButtonTap(confirmFullForm)}
                  className="btn btn-yes"
                  style={{ minHeight: '64px', minWidth: '260px' }}
                >
                  ✅ ஆம், எல்லாம் சரி / All Correct
                </button>

                <button
                  type="button"
                  onClick={handleClearSession}
                  className="btn btn-neutral"
                  style={{ minHeight: '64px', color: 'var(--color-no)' }}
                >
                  🗑️ முடித்து அழிக்கவும் / Finish & Clear
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ==========================================================================
            SCREEN 5: Active Question & Confirmation Loop
            ========================================================================== */}
        {state !== STATES.IDLE &&
          state !== STATES.ERROR &&
          state !== STATES.FINISHED &&
          state !== STATES.REVIEW &&
          state !== STATES.READY_FOR_PDF &&
          currentField && (
            <section
              aria-label="Active voice question"
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                justifyContent: 'space-between',
              }}
            >
              {/* Top Progress & Stop Header */}
              <div>
                <div className="progress-container">
                  <div className="progress-header-info">
                    <span>
                      {isConfirmState
                        ? 'சரிபார்த்தல் / Confirmation'
                        : `கேள்வி ${currentStep} / ${totalSteps} (Question ${currentStep} of ${totalSteps})`}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleButtonTap(restart)}
                      className="btn btn-neutral"
                      style={{ minHeight: '44px', padding: '0.25rem 0.75rem', fontSize: 'var(--font-size-caption)' }}
                    >
                      ⏹ நிறுத்து / Stop
                    </button>
                  </div>
                  <div
                    className="progress-track"
                    role="progressbar"
                    aria-label="Application question progress"
                    aria-valuenow={progressPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>

                {/* State Banner */}
                <StateBanner
                  state={state}
                  isRecording={isRecording}
                  isTakingLong={isTakingLong}
                  onRetry={() => handleButtonTap(repeatQuestion)}
                  uiLang={uiLang}
                />

                {/* Question / Read-back Text Card */}
                <div className="question-card">
                  {uiLang !== 'en' && (
                    <p className="question-text-ta" lang="ta">
                      {context.activePromptText?.ta || currentField.question?.ta}
                    </p>
                  )}
                  {uiLang === 'both' && (
                    <p className="question-text-roman" lang="ta-Latn">
                      {context.activePromptText?.taRoman || currentField.question?.taRoman}
                    </p>
                  )}
                  {uiLang !== 'ta' && (
                    <p className="question-text-en" lang="en">
                      {context.activePromptText?.en || currentField.question?.en}
                    </p>
                  )}
                </div>

                {/* Confirmation Heard Value Display (Screen 2c) */}
                {isConfirmState && pendingConfirmation && (
                  <div className="heard-value-card" role="region" aria-label="Heard value verification">
                    <p className="heard-value-title">
                      பதிவான பதில் / Heard Value:
                    </p>
                    <p className="heard-value-text">
                      {pendingConfirmation.displayValue || pendingConfirmation.value}
                    </p>
                  </div>
                )}
              </div>

              {/* Middle Section: Mic Button OR Confirmation Buttons */}
              <div>
                {/* Confirmation Prominent Yes / No Buttons (Screen 2c) */}
                {isConfirmState && (
                  <div style={{ margin: 'var(--space-3) 0 var(--space-4)' }}>
                    <p style={{ textAlign: 'center', fontWeight: 700, marginBottom: 'var(--space-3)' }}>
                      தட்டவும் அல்லது பேசவும் / Tap or Speak:
                    </p>
                    <div className="confirm-btn-row">
                      <button
                        type="button"
                        onClick={() => handleButtonTap(() => handleConfirmTap('yes'))}
                        className="btn btn-yes"
                      >
                        👍 ஆம் / Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => handleButtonTap(() => handleConfirmTap('no'))}
                        className="btn btn-no"
                      >
                        👎 இல்லை / No
                      </button>
                    </div>

                    <div style={{ textAlign: 'center', marginTop: 'var(--space-2)' }}>
                      <button
                        type="button"
                        onClick={() => handleButtonTap(repeatQuestion)}
                        className="btn btn-neutral"
                        style={{ minHeight: '48px', fontSize: 'var(--font-size-caption)' }}
                      >
                        🔄 மீண்டும் சொல்லவும் / Say it again
                      </button>
                    </div>
                  </div>
                )}

                {/* Huge Mic Button (At least 96px, elderly-friendly) */}
                <div className="mic-container">
                  <button
                    type="button"
                    disabled={
                      state === STATES.SPEAKING_QUESTION ||
                      state === STATES.SPEAKING_READBACK ||
                      state === STATES.PROCESSING ||
                      state === STATES.PROCESSING_CONFIRM ||
                      state === STATES.TRANSCRIBING
                    }
                    onClick={() => {
                      triggerHaptic(30)
                      registerUserActivity()
                      if (isConfirmState) {
                        isRecording ? stopListeningConfirm() : startListeningConfirm()
                      } else {
                        isRecording ? stopListening() : startListening()
                      }
                    }}
                    className={`mic-button ${isRecording ? 'mic-button-recording' : ''}`}
                    aria-label={
                      isRecording
                        ? 'பதிவை நிறுத்து / Stop Recording'
                        : isConfirmState
                          ? 'தட்டி ஆம் அல்லது இல்லை சொல்லவும் / Tap to speak Yes or No'
                          : 'தட்டி பேசவும் / Tap to Speak'
                    }
                  >
                    <span aria-hidden="true">{isRecording ? '⏹' : '🎤'}</span>
                  </button>

                  {/* Audio Level Indicator */}
                  <AudioMeter level={audioLevel} isRecording={isRecording} />

                  <p className={`mic-label ${isRecording ? 'recording' : ''}`}>
                    {isRecording
                      ? 'தட்டி முடிக்கவும் / Tap to Stop'
                      : state === STATES.LISTENING || state === STATES.LISTENING_CONFIRM
                        ? isConfirmState
                          ? 'தட்டி "ஆம்" அல்லது "இல்லை" சொல்லவும் / Tap & say Yes/No'
                          : 'தட்டி பேசவும் / Tap to Speak'
                        : 'காத்திருக்கவும்... / Please wait...'}
                  </p>
                </div>

                {/* Dev-only Typed Input (Completely omitted in production builds) */}
                {isDev && context.mode === 'typed' && (
                  <form onSubmit={handleTypedSubmit} style={{ maxWidth: '480px', margin: 'var(--space-3) auto' }}>
                    <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
                      DEV Mode: Type answer (Zero API credits):
                    </p>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <input
                        type="text"
                        value={typedInput}
                        onChange={(e) => setTypedInput(e.target.value)}
                        placeholder="Type test answer..."
                        style={{
                          flex: 1,
                          fontSize: 'var(--font-size-body)',
                          padding: '0.65rem 0.85rem',
                          border: '2px solid var(--border-default)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      />
                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ minHeight: '48px' }}
                      >
                        Submit
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Bottom Secondary Actions (Repeat, Skip, Help, Operator) */}
              {!isConfirmState && (
                <div className="secondary-btn-row">
                  <button
                    type="button"
                    onClick={() => handleButtonTap(repeatQuestion)}
                    disabled={state !== STATES.LISTENING}
                    className="btn btn-neutral"
                  >
                    🔄 மீண்டும் கேள் / Repeat
                  </button>

                  {!currentField.required && (
                    <button
                      type="button"
                      onClick={() => handleButtonTap(skipCurrentField)}
                      disabled={state !== STATES.LISTENING}
                      className="btn btn-neutral"
                    >
                      ⏭ தவிர் / Skip
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleButtonTap(() => executeCommand('help'))}
                    disabled={state !== STATES.LISTENING}
                    className="btn btn-neutral"
                  >
                    💡 உதவி / Help
                  </button>

                  <button
                    type="button"
                    onClick={() => handleButtonTap(() => executeCommand('operator'))}
                    className="btn btn-neutral"
                  >
                    👤 பணியாளர் / Operator
                  </button>
                </div>
              )}
            </section>
          )}
      </main>
    </div>
  )
}
