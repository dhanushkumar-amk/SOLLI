import { useCallback, useEffect, useRef, useState } from 'react'
import AudioMeter from '../components/AudioMeter'
import {
  IconAlert,
  IconArrowRight,
  IconCheck,
  IconClose,
  IconDoc,
  IconGear,
  IconHelp,
  IconMic,
  IconPause,
  IconPencil,
  IconPlay,
  IconRefresh,
  IconSparkles,
  IconStop,
  IconTrash,
  IconVolume,
} from '../components/Icons'
import InactivityModal from '../components/InactivityModal'
import OperatorSheet from '../components/OperatorSheet'
import StateBanner from '../components/StateBanner'
import {
  INACTIVITY_TIMEOUT_MS,
  INACTIVITY_WARNING_MS,
  LONG_WAIT_THRESHOLD_MS,
} from '../config'
import { STATES } from '../conversation/stateMachine'
import { useConversation } from '../conversation/useConversation'
import {
  autoFillWebField,
  clickWebpageNextOrSubmit,
  getActiveTabInfo,
  highlightWebField,
  isExtensionEnv,
  onPageFieldsDetected,
  scanActivePageFields,
} from '../extension/bridge'
import {
  generateWebFormSchema,
  setActiveCustomSchema,
} from '../forms'
import { triggerHaptic } from '../utils/haptics'
import { releaseScreenWakeLock, requestScreenWakeLock } from '../utils/wakeLock'

export default function VoiceApp() {
  const isDev = Boolean(import.meta.env.DEV)

  // In-memory UI accessibility preferences (Stored only in React state, never storage)
  const [fontSize, setFontSize] = useState('normal') // 'normal' | 'large' | 'xlarge'
  const [contrast, setContrast] = useState('normal') // 'normal' | 'high'
  const [uiLang, setUiLang] = useState('both') // 'both' | 'ta' | 'en'
  const [selectedFormId, setSelectedFormId] = useState('pension')
  const [isOperatorSheetOpen, setIsOperatorSheetOpen] = useState(false)

  // Chrome Extension Side Panel & Live Form detection
  const [activeTabInfo, setActiveTabInfo] = useState(null)
  const [detectedWebForm, setDetectedWebForm] = useState(null)
  const [isScanning, setIsScanning] = useState(false)
  const [clickedWebSubmit, setClickedWebSubmit] = useState(false)
  const isExtension = isExtensionEnv()

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
    formId: selectedFormId,
  })

  // Detect active tab & scan fields in Chrome Extension mode
  const refreshScan = useCallback(async () => {
    if (!isExtension) return
    setIsScanning(true)
    try {
      const info = await getActiveTabInfo()
      if (info) setActiveTabInfo(info)
      const data = await scanActivePageFields()
      if (data && data.fields?.length > 0) {
        setDetectedWebForm(data)
      }
    } catch (_) {
    } finally {
      setIsScanning(false)
    }
  }, [isExtension])

  useEffect(() => {
    if (isExtension) {
      refreshScan()
      const unsubscribe = onPageFieldsDetected((data) => {
        if (data && data.fields?.length > 0) {
          setDetectedWebForm(data)
        }
      })
      const timer = setTimeout(refreshScan, 1500)
      return () => {
        unsubscribe()
        clearTimeout(timer)
      }
    }
  }, [isExtension, refreshScan])

  // Chrome Extension Bridge: Highlight matching input on active webpage when question changes
  useEffect(() => {
    if (currentField?.id) {
      highlightWebField(currentField.id)
    }
  }, [currentField?.id])

  // Chrome Extension Bridge: Auto-fill active webpage input whenever a field is confirmed
  const filledFieldsRef = useRef(new Set())
  useEffect(() => {
    const answers = context.answers || {}
    for (const [fieldId, item] of Object.entries(answers)) {
      if (item?.confirmed && item?.value && !filledFieldsRef.current.has(fieldId)) {
        filledFieldsRef.current.add(fieldId)
        autoFillWebField(fieldId, item.value)
      }
    }
  }, [context.answers])

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
    filledFieldsRef.current.clear()
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
        inactivityCheckTimerRef.current = null
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
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
              filledFieldsRef.current.clear()
              restart()
              setWasTimedOut(true)
              releaseScreenWakeLock()
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

  // Start filling the detected live web form (Google Form, etc.)
  const handleStartLiveForm = useCallback(() => {
    if (!detectedWebForm?.fields?.length) return
    triggerHaptic(35)
    registerUserActivity()
    const schema = generateWebFormSchema(
      detectedWebForm.fields,
      detectedWebForm.title || activeTabInfo?.title || 'Web Form'
    )
    setActiveCustomSchema(schema)
    setSelectedFormId('live_web_form')
    start('live_web_form')
  }, [detectedWebForm, activeTabInfo, registerUserActivity, start])

  // Click Next or Submit on the target webpage form
  const handleWebNextOrSubmit = useCallback(async () => {
    triggerHaptic(40)
    registerUserActivity()
    setClickedWebSubmit(true)
    await clickWebpageNextOrSubmit()
    setTimeout(() => {
      setClickedWebSubmit(false)
      refreshScan()
    }, 1500)
  }, [registerUserActivity, refreshScan])

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
      className="app-root"
      data-font-size={fontSize}
      data-contrast={contrast}
    >
      {/* Accessible live region for assertive alerts */}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {error ? `பிழை: ${error.messageTa} - Error: ${error.messageEn}` : ''}
        {inactivityCountdown !== null
          ? `எச்சரிக்கை: ${inactivityCountdown} வினாடிகளில் அமர்வு முடிவடையும். Warning: session will expire in ${inactivityCountdown} seconds.`
          : ''}
      </div>

      {/* Flutter Cupertino Navigation Bar */}
      <header className="ios-navbar">
        <div className="ios-brand-badge">
          <div className="ios-brand-icon" aria-hidden="true">
            <IconSparkles size={16} />
          </div>
          <span>சொல்லி &bull; Solli</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {isExtension && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic(20)
                refreshScan()
              }}
              className="ios-icon-btn"
              aria-label="Scan webpage for forms"
              title="Scan Webpage Form"
              disabled={isScanning}
              style={{ fontSize: '11px', fontWeight: 600, width: 'auto', padding: '0.25rem 0.5rem', display: 'inline-flex', gap: '0.25rem' }}
            >
              <IconRefresh size={14} className={isScanning ? 'animate-spin' : ''} />
              <span>ஸ்கேன் / Scan</span>
            </button>
          )}

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
            <IconGear size={18} />
          </button>
        </div>
      </header>

      {/* Chrome Side Panel Active Indicator */}
      {isExtension && (
        <aside
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.4rem',
            background: 'var(--success-light)',
            borderBottom: '1px solid var(--success-border)',
            color: 'var(--success-green-dark)',
            padding: '0.35rem 0.85rem',
            fontSize: 'var(--font-size-small)',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, flex: 1 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {detectedWebForm?.fields?.length
                ? `படிவம் தயார் • ${detectedWebForm.fields.length} கேள்விகள் (${detectedWebForm.title})`
                : `இணைக்கப்பட்டது • ${activeTabInfo?.title || 'Target Webpage'}`}
            </span>
          </div>
          <button
            type="button"
            onClick={refreshScan}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--success-green-dark)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px',
            }}
            title="Refresh Scan"
          >
            <IconRefresh size={13} className={isScanning ? 'animate-spin' : ''} />
          </button>
        </aside>
      )}

      <main className="ios-main-container">
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

        {/* Flutter Modal Bottom Sheet for Operator Settings */}
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

        {/* Operator Needed Alert Banner */}
        {(state === STATES.OPERATOR_PAUSED || context.sessionNeedsOperatorHelp) && (
          <aside className="ios-status-card ios-status-card-warning" role="alert">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--amber-warning)', fontWeight: 700, fontSize: 'var(--font-size-btn)', margin: '0 0 0.35rem' }}>
              <IconAlert size={20} />
              <h2>பணியாளர் உதவி தேவை / Operator Needed</h2>
            </div>
            <p style={{ color: 'var(--text-primary)', fontSize: 'var(--font-size-body)' }}>
              விண்ணப்பதாரருக்கு உதவி தேவைப்படுகிறது. தயவுசெய்து விவரங்களை சரிபார்த்து உதவவும்.
              <br />
              <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--text-secondary)' }}>
                Please review the question with the applicant, then resume the session.
              </span>
            </p>
            <button
              type="button"
              onClick={() => handleButtonTap(resumeFromPause)}
              className="ios-btn ios-btn-primary ios-btn-block"
              style={{ marginTop: '0.75rem' }}
            >
              <IconPlay size={16} /> பணியாளர் உதவினார், தொடரவும் / Resume
            </button>
          </aside>
        )}

        {/* Paused Screen */}
        {state === STATES.PAUSED && (
          <div className="ios-status-card" role="status">
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'var(--track-fill)',
                color: 'var(--text-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.5rem',
              }}
              aria-hidden="true"
            >
              <IconPause size={22} />
            </div>
            <h2 style={{ fontSize: 'var(--font-size-btn-large)', fontWeight: 700, margin: '0 0 0.35rem' }}>
              உரையாடல் இடைநிறுத்தப்பட்டுள்ளது
              <span style={{ display: 'block', fontSize: 'var(--font-size-caption)', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '2px' }}>
                Conversation Paused
              </span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-body)', marginBottom: '1rem' }}>
              மைக்ரோஃபோன் அணைக்கப்பட்டுள்ளது. நீங்கள் தயாரானதும் தொடரலாம்.
            </p>
            <button
              type="button"
              onClick={() => handleButtonTap(resumeFromPause)}
              className="ios-btn ios-btn-primary ios-btn-block"
            >
              <IconPlay size={16} /> மீண்டும் தொடரவும் / Resume
            </button>
          </div>
        )}

        {/* Start Over Confirmation Modal */}
        {state === STATES.CONFIRM_START_OVER && (
          <div
            className="ios-sheet-backdrop"
            style={{ alignItems: 'center' }}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="startover-title"
          >
            <div className="ios-card" style={{ maxWidth: '400px', width: '92%', textAlign: 'center', padding: '1.5rem 1.25rem' }}>
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
                aria-hidden="true"
              >
                <IconAlert size={22} />
              </div>
              <h2 id="startover-title" style={{ color: 'var(--danger-red)', fontSize: 'var(--font-size-btn)', fontWeight: 700, margin: '0 0 0.35rem' }}>
                அனைத்தையும் அழித்து மீண்டும் தொடங்கவா?
                <span style={{ display: 'block', fontSize: 'var(--font-size-small)', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '2px' }}>
                  Delete everything and start again?
                </span>
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-small)', marginBottom: '1rem' }}>
                இதுவரை உள்ளிட்ட அனைத்து விவரங்களும் நினைவகத்திலிருந்து நீக்கப்படும்.
              </p>
              <div className="ios-confirm-grid" style={{ margin: 0 }}>
                <button
                  type="button"
                  onClick={() => handleButtonTap(() => confirmStartOver(true))}
                  className="ios-btn ios-btn-no"
                >
                  <IconTrash size={16} /> அழி / Delete
                </button>
                <button
                  type="button"
                  onClick={() => handleButtonTap(() => confirmStartOver(false))}
                  className="ios-btn ios-btn-secondary"
                >
                  <IconClose size={16} /> ரத்து / Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Field Targeting Selection (When Voice Command asks to change a field) */}
        {(context.choosingField || (context.ambiguousCandidates && context.ambiguousCandidates.length > 0)) && (
          <div className="ios-card" style={{ backgroundColor: 'var(--brand-light)', borderColor: 'var(--brand-light-border)' }}>
            <h3 style={{ color: 'var(--brand-primary)', fontSize: 'var(--font-size-btn)', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <IconPencil size={18} /> மாற்ற வேண்டிய விவரத்தைத் தேர்ந்தெடுக்கவும் / Select field:
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.85rem' }}>
              {(context.ambiguousCandidates || context.form?.fields?.filter((f) => f.spoken).map((f) => f.id) || []).map(
                (fid) => {
                  const fObj = context.form?.fields?.find((f) => f.id === fid)
                  return (
                    <button
                      key={fid}
                      type="button"
                      onClick={() => handleButtonTap(() => chooseTargetField(fid))}
                      className="ios-btn ios-btn-secondary"
                      style={{ fontSize: 'var(--font-size-caption)', minHeight: '40px', padding: '0.4rem 0.85rem' }}
                    >
                      <IconPencil size={14} /> {fObj?.labels?.ta || fid} ({fObj?.labels?.en || fid})
                    </button>
                  )
                }
              )}
            </div>
            <button
              type="button"
              onClick={() => handleButtonTap(cancelChooseField)}
              className="ios-btn ios-btn-secondary"
              style={{ minHeight: '38px', fontSize: 'var(--font-size-caption)' }}
            >
              ரத்து செய் / Cancel
            </button>
          </div>
        )}

        {/* ==========================================================================
            SCREEN 1: Welcome Screen (STATES.IDLE)
            ========================================================================== */}
        {state === STATES.IDLE && (
          <section className="ios-card" style={{ textAlign: 'center', padding: '1.75rem 1.25rem' }} aria-labelledby="solli-welcome-title">
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '18px',
                background: 'var(--brand-gradient)',
                color: 'var(--text-inverse)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.85rem',
                boxShadow: 'var(--shadow-btn)',
              }}
              aria-hidden="true"
            >
              <IconSparkles size={32} />
            </div>

            <h1 id="solli-welcome-title" style={{ fontSize: 'var(--font-size-question)', fontWeight: 800, marginBottom: '0.25rem' }}>
              <span lang="ta">சொல்லி</span> &bull; <span lang="en">Solli</span>
            </h1>

            <p style={{ fontSize: 'var(--font-size-tagline)', fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '0.75rem' }}>
              {uiLang !== 'en' && <span lang="ta">சொல்லுங்கள். நாங்கள் படிவத்தை நிரப்புகிறோம்.</span>}
              {uiLang === 'both' && <br />}
              {uiLang !== 'ta' && <span lang="en">Just say it. We&apos;ll fill the form.</span>}
            </p>

            {/* Live Web Form Auto-Fill Feature Card (Chrome Extension Mode) */}
            {isExtension && (
              <div
                className="ios-card"
                style={{
                  textAlign: 'left',
                  margin: '0.5rem 0 1rem',
                  padding: '1rem',
                  borderRadius: '16px',
                  border: detectedWebForm?.fields?.length ? '2px solid var(--brand-primary)' : '1px dashed var(--border)',
                  background: detectedWebForm?.fields?.length ? 'var(--brand-light)' : 'var(--app-card-secondary)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div
                      style={{
                        width: '9px',
                        height: '9px',
                        borderRadius: '50%',
                        background: detectedWebForm?.fields?.length ? '#10b981' : '#f59e0b',
                        boxShadow: detectedWebForm?.fields?.length ? '0 0 8px #10b981' : 'none',
                      }}
                    />
                    <span style={{ fontWeight: 700, fontSize: 'var(--font-size-btn)', color: 'var(--brand-primary)' }}>
                      நேரடி இணையப் படிவம் &bull; Live Web Form
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={refreshScan}
                    className="ios-btn ios-btn-secondary"
                    style={{ minHeight: '28px', padding: '0.1rem 0.55rem', fontSize: '11px' }}
                    disabled={isScanning}
                  >
                    <IconRefresh size={12} className={isScanning ? 'animate-spin' : ''} /> {isScanning ? 'Scanning...' : 'மறுஆய்வு / Scan'}
                  </button>
                </div>

                {detectedWebForm?.fields?.length > 0 ? (
                  <>
                    <p style={{ margin: '0.2rem 0 0.4rem', fontSize: 'var(--font-size-small)', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {detectedWebForm.title || activeTabInfo?.title || 'Google Form'}
                      <span style={{ display: 'block', fontSize: 'var(--font-size-caption)', color: 'var(--text-secondary)', fontWeight: 400 }}>
                        {detectedWebForm.fields.length} கேள்விகள் கண்டறியப்பட்டன (Detected Questions):
                      </span>
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.85rem' }}>
                      {detectedWebForm.fields.map((f, idx) => (
                        <span
                          key={f.id || idx}
                          style={{
                            background: 'var(--app-card-bg)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '10px',
                            padding: '0.2rem 0.5rem',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                          }}
                        >
                          {f.order || idx + 1}. {f.label.replace(/\*$/, '').trim()}
                        </span>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleStartLiveForm}
                      className="ios-btn ios-btn-primary ios-btn-block"
                      style={{
                        minHeight: '48px',
                        fontSize: 'var(--font-size-btn)',
                        borderRadius: 'var(--radius-ios-pill)',
                        boxShadow: 'var(--shadow-btn)',
                      }}
                    >
                      <IconMic size={18} />
                      <span>நேரடி படிவத்தை நிரப்பு / Fill Live Web Form</span>
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                    <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--text-secondary)', margin: '0 0 0.5rem' }}>
                      இணையப் படிவத்தைக் கண்டறிய &quot;மறுஆய்வு&quot; பொத்தானை அழுத்தவும்.
                      <br />
                      <span style={{ fontSize: 'var(--font-size-caption)' }}>
                        Open Google Form or target form in your browser tab and tap Scan.
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={refreshScan}
                      className="ios-btn ios-btn-secondary"
                      style={{ minHeight: '34px', fontSize: 'var(--font-size-caption)' }}
                    >
                      <IconRefresh size={14} /> பக்கத்தை ஸ்கேன் செய் / Scan Webpage
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Form Selection Segmented Control */}
            <div style={{ marginBottom: '0.85rem' }}>
              <div
                className="ios-segmented-control"
                role="radiogroup"
                aria-label="Form selection"
                style={{ maxWidth: '420px' }}
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedFormId === 'pension'}
                  className={`ios-segment-btn ${selectedFormId === 'pension' ? 'active' : ''}`}
                  onClick={() => handleButtonTap(() => setSelectedFormId('pension'))}
                >
                  முதியோர் உதவித்தொகை (Pension)
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedFormId === 'college_admission'}
                  className={`ios-segment-btn ${selectedFormId === 'college_admission' ? 'active' : ''}`}
                  onClick={() => handleButtonTap(() => setSelectedFormId('college_admission'))}
                >
                  கல்லூரி சேர்க்கை (College)
                </button>
              </div>
            </div>

            {/* Language Selection Segmented Control */}
            <div
              className="ios-segmented-control"
              role="radiogroup"
              aria-label="Language selection"
            >
              <button
                type="button"
                role="radio"
                aria-checked={uiLang === 'both'}
                className={`ios-segment-btn ${uiLang === 'both' ? 'active' : ''}`}
                onClick={() => handleButtonTap(() => setUiLang('both'))}
              >
                தமிழ் / English
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={uiLang === 'ta'}
                className={`ios-segment-btn ${uiLang === 'ta' ? 'active' : ''}`}
                onClick={() => handleButtonTap(() => setUiLang('ta'))}
              >
                தமிழ் மட்டும்
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={uiLang === 'en'}
                className={`ios-segment-btn ${uiLang === 'en' ? 'active' : ''}`}
                onClick={() => handleButtonTap(() => setUiLang('en'))}
              >
                English only
              </button>
            </div>

            {/* Large Start Button (Flutter Gradient Button) */}
            <div style={{ margin: '1.25rem 0 0.85rem' }}>
              <button
                type="button"
                onClick={() => handleButtonTap(() => start(selectedFormId))}
                className="ios-btn ios-btn-primary ios-btn-block"
                style={{
                  minHeight: '54px',
                  fontSize: 'var(--font-size-btn-large)',
                  borderRadius: 'var(--radius-ios-pill)',
                }}
              >
                <span>{uiLang === 'en' ? 'Start Application' : uiLang === 'ta' ? 'விண்ணப்பத்தைத் தொடங்கு' : 'தொடங்கு / Start Application'}</span>
                <IconArrowRight size={18} />
              </button>
            </div>

            {/* Session Timeout Cleared Warning */}
            {wasTimedOut && (
              <p role="alert" style={{ color: 'var(--danger-red)', fontWeight: 600, fontSize: 'var(--font-size-small)', margin: '0.5rem 0' }}>
                செயலற்ற நேரம் முடிந்ததால் பாதுகாப்பிற்காக விவரங்கள் அழிக்கப்பட்டன.
                <br />
                Answers were cleared for your privacy due to inactivity.
              </p>
            )}

            {/* Prototype Notice Tile */}
            <div
              style={{
                backgroundColor: 'var(--app-card-secondary)',
                borderRadius: '12px',
                padding: '0.65rem 0.85rem',
                margin: '1rem 0 0.65rem',
                border: '1px solid var(--border-subtle)',
                lineHeight: 1.4,
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                <IconAlert size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p style={{ fontSize: 'var(--font-size-small)', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
                    மாதிரி தரவு மட்டுமே, எங்கும் சமர்ப்பிக்கப்படாது.
                  </p>
                  <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--text-tertiary)', margin: '0.15rem 0 0' }}>
                    Prototype &mdash; Fake data only, nothing is submitted to any server.
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy Line */}
            <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--text-tertiary)', margin: '0.4rem 0 0' }}>
              <strong>எந்த விவரமும் சேமிக்கப்படுவதில்லை.</strong> முடித்ததும் பதில்கள் அழிந்துவிடும்.
              <br />
              <span style={{ fontSize: 'var(--font-size-caption)' }}>Nothing is stored. Your answers disappear when finished.</span>
            </p>
          </section>
        )}

        {/* ==========================================================================
            SCREEN 2: Error Screen (STATES.ERROR)
            ========================================================================== */}
        {state === STATES.ERROR && (
          <section className="ios-status-card ios-status-card-error" role="alert" aria-labelledby="error-heading">
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'var(--danger-light)',
                color: 'var(--danger-red)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.5rem',
              }}
              aria-hidden="true"
            >
              <IconAlert size={24} />
            </div>
            <h2 id="error-heading" style={{ color: 'var(--danger-red)', fontSize: 'var(--font-size-btn-large)', fontWeight: 700, margin: '0 0 0.35rem' }}>
              பிழை ஏற்பட்டது / Error Encountered
            </h2>

            {error?.code === 'MIC_DENIED' ? (
              <div style={{ textAlign: 'left', margin: '0.85rem 0' }}>
                <p style={{ fontWeight: 600, color: 'var(--danger-red)', fontSize: 'var(--font-size-body)' }}>
                  மைக்ரோஃபோன் அணுகல் மறுக்கப்பட்டது / Microphone Blocked
                </p>
                <ol style={{ paddingLeft: '1.25rem', lineHeight: 1.5, color: 'var(--text-primary)', fontSize: 'var(--font-size-caption)', marginTop: '0.35rem' }}>
                  <li>உலாவி முகவரிப் பட்டியில் உள்ள அமைப்புகள் குறியீட்டைத் தட்டவும். (Tap permissions icon in browser bar)</li>
                  <li>மைக்ரோஃபோன் அனுமதியை &quot;Allow&quot; என மாற்றவும். (Allow microphone)</li>
                  <li>கீழே உள்ள &quot;மீண்டும் முயற்சி&quot; பொத்தானைத் தட்டவும். (Tap Restart below)</li>
                </ol>
              </div>
            ) : error?.code === 'RATE_LIMIT' ? (
              <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--danger-red)', fontWeight: 600 }}>
                அனுமதிக்கப்பட்ட வரம்பு முடிந்தது. தயவுசெய்து பணியாளரின் உதவியை நாடவும்.
                <br />
                <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Rate limit reached. Please inform the kiosk operator.
                </span>
              </p>
            ) : (
              <div>
                <p style={{ fontSize: 'var(--font-size-btn)', color: 'var(--danger-red)', fontWeight: 700 }}>
                  {error?.messageTa || 'எதிர்பாராத பிழை ஏற்பட்டது.'}
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-caption)' }}>
                  {error?.messageEn || 'An unexpected error occurred. Please contact the operator.'}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => handleButtonTap(restart)}
              className="ios-btn ios-btn-no ios-btn-block"
              style={{ marginTop: '1rem' }}
            >
              <IconRefresh size={16} /> மறுதொடக்கம் / Restart Application
            </button>
          </section>
        )}

        {/* ==========================================================================
            SCREEN 3: Finished / Ready for PDF Screen (STATES.READY_FOR_PDF)
            ========================================================================== */}
        {state === STATES.READY_FOR_PDF && (
          <section className="ios-status-card ios-status-card-success" aria-labelledby="done-title">
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'var(--success-light)',
                color: 'var(--success-green)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.75rem',
                border: '1.5px solid var(--success-border)',
              }}
              aria-hidden="true"
            >
              <IconCheck size={28} />
            </div>

            <h2 id="done-title" style={{ color: 'var(--success-green-dark)', fontSize: 'var(--font-size-btn-large)', fontWeight: 800, margin: '0 0 0.35rem' }}>
              விண்ணப்பம் முடிந்தது! / Application Complete!
            </h2>

            <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--success-green-dark)', fontWeight: 600, margin: '0 0 1rem' }}>
              அனைத்து விவரங்களும் வெற்றிகரமாக பதிவு செய்யப்பட்டன.
            </p>

            {/* PDF placeholder button */}
            <div style={{ margin: '0.85rem 0 1.25rem' }}>
              <button
                type="button"
                disabled
                className="ios-btn ios-btn-secondary ios-btn-block"
                style={{ minHeight: '52px' }}
              >
                <IconDoc size={18} /> படிவத்தைப் பதிவிறக்கு (PDF) / Download Form
              </button>
              <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--text-tertiary)', marginTop: '0.35rem' }}>
                (அரசு PDF உருவாக்கம் கட்டம் 14-ல் வரும் / Coming in Phase 14)
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {isExtension && (
                <button
                  type="button"
                  onClick={handleWebNextOrSubmit}
                  className="ios-btn ios-btn-primary ios-btn-block"
                  style={{ minHeight: '52px', background: '#059669' }}
                >
                  <IconArrowRight size={18} />
                  <span>{clickedWebSubmit ? 'சமர்ப்பிக்கப்பட்டது! / Done!' : 'படிவத்தில் "Next / சமர்ப்பி" கிளிக் செய் / Click Next/Submit'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleButtonTap(restart)}
                className="ios-btn ios-btn-secondary ios-btn-block"
              >
                <IconPlay size={16} /> புதிய விண்ணப்பம் / Start New
              </button>

              <button
                type="button"
                onClick={handleClearSession}
                className="ios-btn ios-btn-secondary ios-btn-block"
                style={{ color: 'var(--danger-red)' }}
              >
                <IconTrash size={16} /> முடித்து அழிக்கவும் / Finish & Clear
              </button>
            </div>
          </section>
        )}

        {/* ==========================================================================
            SCREEN 4: Application Review Screen (STATES.REVIEW || STATES.FINISHED)
            ========================================================================== */}
        {(state === STATES.REVIEW || state === STATES.FINISHED) && (
          <section aria-labelledby="review-heading" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '0.85rem' }}>
              <h1 id="review-heading" style={{ fontSize: 'var(--font-size-btn-large)', fontWeight: 700, margin: '0 0 0.2rem' }}>
                விண்ணப்ப மதிப்பாய்வு
                <span style={{ display: 'block', fontSize: 'var(--font-size-caption)', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '2px' }}>
                  Application Review &mdash; {context.form?.title || 'Form'}
                </span>
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-small)', margin: 0 }}>
                ரகசிய எண்கள் பாதுகாப்பாக மறைக்கப்பட்டுள்ளன. (Sensitive digits masked)
              </p>
            </div>

            {/* Needs Operator Help Highlighted Section */}
            {operatorHelpFields.length > 0 && (
              <aside className="ios-status-card ios-status-card-warning" style={{ textAlign: 'left', marginBottom: '0.85rem' }} role="alert">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--amber-warning)', fontWeight: 700, fontSize: 'var(--font-size-btn)', margin: '0 0 0.35rem' }}>
                  <IconAlert size={18} />
                  <h2>பணியாளர் உதவி தேவைப்படும் விவரங்கள் ({operatorHelpFields.length})</h2>
                </div>
                <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-primary)', margin: 0 }}>
                  {operatorHelpFields.map((f) => (
                    <li key={f.id} style={{ marginBottom: '0.35rem', fontSize: 'var(--font-size-small)' }}>
                      <strong>{f.label}:</strong> {f.display}{' '}
                      <button
                        type="button"
                        onClick={() => handleButtonTap(() => startEditField(f.id))}
                        className="ios-btn ios-btn-secondary"
                        style={{ minHeight: '32px', padding: '0.15rem 0.55rem', fontSize: 'var(--font-size-small)', marginLeft: '0.4rem' }}
                      >
                        <IconPencil size={12} /> Edit
                      </button>
                    </li>
                  ))}
                </ul>
              </aside>
            )}

            {/* Speech Reader Controls & Speak Change */}
            <div
              style={{
                backgroundColor: 'var(--app-card)',
                borderRadius: '14px',
                padding: '0.65rem 0.85rem',
                border: '1px solid var(--border)',
                marginBottom: '0.85rem',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.4rem',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() =>
                    handleButtonTap(summaryReading?.active ? stopSummary : () => readFullSummary({ unconfirmedOnly }))
                  }
                  className="ios-btn ios-btn-secondary"
                  style={{ minHeight: '38px', padding: '0.35rem 0.75rem', fontSize: 'var(--font-size-caption)' }}
                >
                  {summaryReading?.active ? (
                    <><IconStop size={14} /> நிறுத்து / Stop</>
                  ) : (
                    <><IconVolume size={14} /> அனைத்தையும் படி / Read all</>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleButtonTap(speakChangeReview)}
                  className={`ios-btn ${isRecording ? 'ios-btn-no' : 'ios-btn-secondary'}`}
                  style={{ minHeight: '38px', padding: '0.35rem 0.75rem', fontSize: 'var(--font-size-caption)' }}
                >
                  <IconMic size={14} /> {isRecording ? 'பேசுங்கள் (8s)...' : 'பேசி மாற்றவும் / Speak change'}
                </button>
              </div>

              {summaryReading?.active && (
                <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--brand-primary)', fontWeight: 600 }}>
                  படிக்கப்படுகிறது: {summaryReading.currentLabel || `Field ${summaryReading.index + 1}/${summaryReading.total}`}
                </span>
              )}
            </div>

            {/* Inset Grouped List (Flutter ListTiles) */}
            <div className="ios-list-group">
              {(summary || []).map((row, idx) => {
                let statusClass = 'ios-pill-unconfirmed'
                let statusLabel = 'சரிபார்க்கப்படவில்லை'

                if (row.needsOperatorHelp) {
                  statusClass = 'ios-pill-operator'
                  statusLabel = 'பணியாளர் உதவி'
                } else if (row.confirmed) {
                  statusClass = 'ios-pill-verified'
                  statusLabel = 'சரிபார்க்கப்பட்டது'
                } else if (row.skipped) {
                  statusClass = 'ios-pill-skipped'
                  statusLabel = 'தவிர்க்கப்பட்டது'
                }

                return (
                  <div key={row.id || idx} className="ios-list-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 'var(--font-size-body)', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {row.label}
                      </div>
                      <div
                        style={{
                          fontSize: 'var(--font-size-caption)',
                          fontWeight: row.sensitive ? 700 : 500,
                          color: row.sensitive ? 'var(--brand-primary)' : 'var(--text-secondary)',
                          marginTop: '0.1rem',
                        }}
                      >
                        {row.display}
                      </div>
                      <div style={{ marginTop: '0.25rem' }}>
                        <span className={`ios-pill-tag ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </div>
                    </div>

                    {row.spoken && (
                      <button
                        type="button"
                        onClick={() => handleButtonTap(() => startEditField(row.id))}
                        className="ios-btn ios-btn-secondary"
                        style={{ minHeight: '36px', padding: '0.25rem 0.65rem', fontSize: 'var(--font-size-caption)' }}
                        aria-label={`Edit ${row.label}`}
                      >
                        <IconPencil size={13} /> Edit
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Final Confirmation Card */}
            <div className="ios-card" style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: 'var(--font-size-btn)', fontWeight: 700, margin: '0 0 0.35rem' }}>
                அனைத்து விவரங்களும் சரியா? / Is everything correct?
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-caption)', marginBottom: '1rem' }}>
                சரியாக இருந்தால் &quot;ஆம்&quot; என்பதை அழுத்தவும்.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {isExtension && (
                  <button
                    type="button"
                    onClick={handleWebNextOrSubmit}
                    className="ios-btn ios-btn-primary ios-btn-block"
                    style={{ minHeight: '50px', background: '#059669' }}
                  >
                    <IconArrowRight size={18} />
                    <span>{clickedWebSubmit ? 'சமர்ப்பிக்கப்பட்டது! / Done!' : 'படிவத்தில் "Next / சமர்ப்பி" கிளிக் செய் / Click Next/Submit'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleButtonTap(confirmFullForm)}
                  className="ios-btn ios-btn-yes ios-btn-block"
                >
                  <IconCheck size={18} /> ஆம், எல்லாம் சரி / All Correct
                </button>

                <button
                  type="button"
                  onClick={handleClearSession}
                  className="ios-btn ios-btn-secondary ios-btn-block"
                  style={{ color: 'var(--danger-red)' }}
                >
                  <IconTrash size={16} /> முடித்து அழிக்கவும் / Finish & Clear
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
              <div>
                {/* Slim Flutter Progress Bar */}
                <div style={{ marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-size-caption)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    <span>
                      {isConfirmState
                        ? 'சரிபார்த்தல் • Confirmation'
                        : `கேள்வி ${currentStep} / ${totalSteps}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleButtonTap(restart)}
                      className="ios-btn ios-btn-secondary"
                      style={{ minHeight: '32px', padding: '0.15rem 0.55rem', fontSize: 'var(--font-size-small)' }}
                    >
                      <IconStop size={12} /> Stop
                    </button>
                  </div>
                  <div
                    className="ios-progress-track"
                    role="progressbar"
                    aria-label="Question progress"
                    aria-valuenow={progressPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className="ios-progress-fill" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>

                {/* State Banner Pill */}
                <StateBanner
                  state={state}
                  isRecording={isRecording}
                  isTakingLong={isTakingLong}
                  onRetry={() => handleButtonTap(repeatQuestion)}
                  uiLang={uiLang}
                />

                {/* Question Text Card */}
                <div className="ios-card" style={{ marginBottom: '0.85rem' }}>
                  {uiLang !== 'en' && (
                    <p style={{ fontSize: 'var(--font-size-question)', fontWeight: 700, lineHeight: 1.4, margin: '0 0 0.4rem' }} lang="ta">
                      {context.activePromptText?.ta || currentField.question?.ta}
                    </p>
                  )}
                  {uiLang === 'both' && (
                    <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--text-secondary)', margin: '0 0 0.4rem' }} lang="ta-Latn">
                      {context.activePromptText?.taRoman || currentField.question?.taRoman}
                    </p>
                  )}
                  {uiLang !== 'ta' && (
                    <p style={{ fontSize: 'var(--font-size-question-en)', color: 'var(--text-tertiary)', lineHeight: 1.4, margin: 0 }} lang="en">
                      {context.activePromptText?.en || currentField.question?.en}
                    </p>
                  )}
                </div>

                {/* Heard Value Display during Confirmation */}
                {isConfirmState && pendingConfirmation && (
                  <div className="ios-heard-card" role="region" aria-label="Heard value verification">
                    <div className="ios-heard-title">
                      பதிவான பதில் / Heard Value:
                    </div>
                    <div className="ios-heard-value">
                      {pendingConfirmation.displayValue || pendingConfirmation.value}
                    </div>
                  </div>
                )}
              </div>

              {/* Middle Section: Mic Button OR Confirmation Yes/No */}
              <div>
                {/* Confirmation Action Buttons */}
                {isConfirmState && (
                  <div style={{ margin: '0.85rem 0' }}>
                    <p style={{ textAlign: 'center', fontWeight: 600, fontSize: 'var(--font-size-body)', marginBottom: '0.65rem' }}>
                      தட்டவும் அல்லது பேசவும் / Tap or Speak:
                    </p>
                    <div className="ios-confirm-grid">
                      <button
                        type="button"
                        onClick={() => handleButtonTap(() => handleConfirmTap('yes'))}
                        className="ios-btn ios-btn-yes"
                      >
                        <IconCheck size={20} /> ஆம் / Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => handleButtonTap(() => handleConfirmTap('no'))}
                        className="ios-btn ios-btn-no"
                      >
                        <IconClose size={20} /> இல்லை / No
                      </button>
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '0.45rem' }}>
                      <button
                        type="button"
                        onClick={() => handleButtonTap(repeatQuestion)}
                        className="ios-btn ios-btn-secondary"
                        style={{ minHeight: '38px', fontSize: 'var(--font-size-caption)' }}
                      >
                        <IconRefresh size={14} /> மீண்டும் சொல்லவும் / Say it again
                      </button>
                    </div>
                  </div>
                )}

                {/* Flutter Floating Microphone Button */}
                <div className="ios-mic-wrap">
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
                    className={`ios-mic-btn ${isRecording ? 'ios-mic-btn-recording' : ''}`}
                    aria-label={
                      isRecording
                        ? 'Stop Recording'
                        : isConfirmState
                          ? 'Tap to speak Yes or No'
                          : 'Tap to Speak'
                    }
                  >
                    <span aria-hidden="true">
                      {isRecording ? <IconStop size={32} /> : <IconMic size={36} />}
                    </span>
                  </button>

                  {/* Audio Level Indicator */}
                  <AudioMeter level={audioLevel} isRecording={isRecording} />

                  <p className={`ios-mic-label ${isRecording ? 'recording' : ''}`}>
                    {isRecording
                      ? 'தட்டி முடிக்கவும் / Tap to Stop'
                      : state === STATES.LISTENING || state === STATES.LISTENING_CONFIRM
                        ? isConfirmState
                          ? 'தட்டி "ஆம்" அல்லது "இல்லை" சொல்லவும் / Say Yes/No'
                          : 'தட்டி பேசவும் / Tap to Speak'
                        : 'காத்திருக்கவும்... / Please wait...'}
                  </p>
                </div>

                {/* Dev Mode Typed Input Form (Only in Dev) */}
                {isDev && context.mode === 'typed' && (
                  <form onSubmit={handleTypedSubmit} style={{ maxWidth: '440px', margin: '0.65rem auto' }}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <input
                        type="text"
                        value={typedInput}
                        onChange={(e) => setTypedInput(e.target.value)}
                        placeholder="Type test answer..."
                        style={{
                          flex: 1,
                          fontSize: 'var(--font-size-body)',
                          padding: '0.5rem 0.75rem',
                          border: '1px solid var(--border)',
                          borderRadius: '10px',
                          backgroundColor: 'var(--app-card)',
                          color: 'var(--text-primary)',
                        }}
                      />
                      <button
                        type="submit"
                        className="ios-btn ios-btn-primary"
                        style={{ minHeight: '38px', padding: '0.4rem 0.85rem' }}
                      >
                        Submit
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Bottom Secondary Actions Grid */}
              {!isConfirmState && (
                <div className="ios-actions-grid">
                  <button
                    type="button"
                    onClick={() => handleButtonTap(repeatQuestion)}
                    disabled={state !== STATES.LISTENING}
                    className="ios-btn ios-btn-secondary"
                  >
                    <IconRefresh size={14} /> மீண்டும் கேள்
                  </button>

                  {!currentField.required && (
                    <button
                      type="button"
                      onClick={() => handleButtonTap(skipCurrentField)}
                      disabled={state !== STATES.LISTENING}
                      className="ios-btn ios-btn-secondary"
                    >
                      <IconArrowRight size={14} /> தவிர் / Skip
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleButtonTap(() => executeCommand('help'))}
                    disabled={state !== STATES.LISTENING}
                    className="ios-btn ios-btn-secondary"
                  >
                    <IconHelp size={14} /> உதவி / Help
                  </button>

                  <button
                    type="button"
                    onClick={() => handleButtonTap(() => executeCommand('operator'))}
                    className="ios-btn ios-btn-secondary"
                  >
                    <IconGear size={14} /> பணியாளர்
                  </button>
                </div>
              )}
            </section>
          )}
      </main>
    </div>
  )
}
