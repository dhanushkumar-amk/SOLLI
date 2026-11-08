import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AudioMeter from '../components/AudioMeter'
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
import { BUILTIN_SCHEMAS } from '../forms/index'
import {
  SUPPORTED_LANGUAGES,
  getLanguageConfig,
  getFieldQuestionInLanguage,
} from '../utils/languages'

// Shadcn UI Primitives
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// Lucide Icons
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RefreshCw,
  Check,
  X,
  FileText,
  AlertTriangle,
  RotateCcw,
  SkipForward,
  Play,
  Settings,
  CheckCircle2,
  Send,
  ArrowRight,
  Zap,
  ChevronDown,
  ChevronUp,
  Clock,
  Globe,
  ShieldCheck,
  Home,
} from 'lucide-react'
import Logo from '../components/Logo'

export default function VoiceApp({ onBackToLanding }) {
  const [fontSize, setFontSize] = useState('normal')
  const [contrast, setContrast] = useState('normal')
  const [isOperatorSheetOpen, setIsOperatorSheetOpen] = useState(false)
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false)
  const [typedInput, setTypedInput] = useState('')
  const [filterQuery, setFilterQuery] = useState('')
  const [showMeta, setShowMeta] = useState(false)

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
    startListeningConfirm,
    stopListeningConfirm,
    startEditField,
    handleConfirmTap,
    submitTyped,
    submitTypedConfirm,
    skipCurrentField,
    repeatQuestion,
    confirmFullForm,
    readFullSummary,
    summaryReading,
    setVoiceMuted,
    restart,
    resumeFromPause,
    executeCommand,
    language,
    setLanguage,
  } = useConversation({
    mode: 'voice',
    voiceMuted: false,
    formId: 'pension',
  })

  const currentLangConfig = useMemo(() => getLanguageConfig(language), [language])

  const handleStartSession = useCallback(() => {
    triggerHaptic(30)
    start('pension')
  }, [start])

  useEffect(() => {
    if (currentField?.id) {
      const el = document.getElementById(`row_${currentField.id}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentField?.id])

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
    activityEvents.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }))

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
    }, 5000)

    return () => {
      activityEvents.forEach((ev) => window.removeEventListener(ev, handleActivity))
      if (inactivityCheckTimerRef.current) { clearInterval(inactivityCheckTimerRef.current); inactivityCheckTimerRef.current = null }
      if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null }
    }
  }, [state, inactivityCountdown, registerUserActivity, restart])

  useEffect(() => {
    if (state !== STATES.IDLE && state !== STATES.FINISHED) requestScreenWakeLock()
    else releaseScreenWakeLock()
    return () => releaseScreenWakeLock()
  }, [state])

  const isConfirmState = (
    state === STATES.SPEAKING_READBACK ||
    state === STATES.LISTENING_CONFIRM ||
    state === STATES.PROCESSING_CONFIRM
  )
  const isFinished = state === STATES.FINISHED || state === STATES.READY_FOR_PDF

  const handleTypedSubmit = useCallback((e) => {
    e?.preventDefault()
    if (!typedInput.trim()) return
    triggerHaptic(20)
    // Route to confirm path when in confirmation states
    if (isConfirmState) {
      submitTypedConfirm(typedInput.trim())
    } else {
      submitTyped(typedInput.trim())
    }
    setTypedInput('')
  }, [typedInput, submitTyped, submitTypedConfirm, isConfirmState])

  const activeFields = useMemo(() => {
    if (context.form?.fields && Array.isArray(context.form.fields)) return context.form.fields
    return BUILTIN_SCHEMAS.pension.fields
  }, [context.form?.fields])

  const visibleFields = useMemo(() => {
    if (!filterQuery.trim()) return activeFields
    const q = filterQuery.toLowerCase()
    return activeFields.filter(
      (f) =>
        f.id.toLowerCase().includes(q) ||
        f.labels?.ta?.toLowerCase().includes(q) ||
        f.labels?.en?.toLowerCase().includes(q)
    )
  }, [activeFields, filterQuery])

  const answeredCount = Object.keys(context.answers || {}).filter((k) => context.answers[k]?.confirmed).length
  const totalFields = activeFields.length
  const progressPercent = Math.min(100, Math.round((answeredCount / totalFields) * 100))

  return (
    <div
      className="solli-root"
      data-font-size={fontSize}
      data-contrast={contrast}
    >

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header className="solli-header">
        <div className="solli-header-inner">
          {/* Brand Logo with optional Back to Landing navigation */}
          <div
            className={`solli-brand ${onBackToLanding ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
            onClick={onBackToLanding}
            title={onBackToLanding ? 'Back to Overview / முதன்மைப் பக்கம்' : 'Solli Civic Kiosk'}
          >
            <Logo size={32} showSub={true} />
          </div>

          {/* Centre: Prototype Identity Badge */}
          <div className="solli-header-scheme">
            <span className="solli-scheme-dept">Solli: independent prototype</span>
            <span className="solli-scheme-sep" aria-hidden="true">/</span>
            <span className="solli-scheme-name">Example Form: IGNOAPS Pension</span>
          </div>

          {/* Right actions */}
          <div className="solli-header-actions">
            {onBackToLanding && (
              <button
                type="button"
                onClick={onBackToLanding}
                className="solli-icon-btn"
                title="Overview / Landing Page"
                aria-label="Overview / Landing Page"
              >
                <Home size={16} />
              </button>
            )}

            {/* Language Pill Button */}
            <button
              type="button"
              onClick={() => { triggerHaptic(20); setIsLanguageModalOpen(true) }}
              className="solli-lang-btn"
              title="Change Voice Language / மொழி தேர்வு"
              aria-label="Change Voice Language"
            >
              <Globe size={14} />
              <span>{currentLangConfig.nativeName} ({currentLangConfig.name})</span>
            </button>

            <button
              type="button"
              onClick={() => setVoiceMuted(!context.voiceMuted)}
              className="solli-icon-btn"
              title={context.voiceMuted ? 'Unmute audio' : 'Mute audio'}
              aria-label={context.voiceMuted ? 'Unmute audio' : 'Mute audio'}
            >
              {context.voiceMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            {state !== STATES.IDLE && (
              <button
                type="button"
                onClick={() => { triggerHaptic(20); restart() }}
                className="solli-icon-btn"
                title="Reset session"
                aria-label="Reset session"
              >
                <RefreshCw size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={() => { triggerHaptic(20); setIsOperatorSheetOpen(true) }}
              className="solli-icon-btn"
              title="Settings"
              aria-label="Settings"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Modals */}
      {inactivityCountdown !== null && (
        <InactivityModal
          countdown={inactivityCountdown}
          onStayActive={() => { triggerHaptic(30); registerUserActivity() }}
        />
      )}
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
        onResume={() => { triggerHaptic(20); resumeFromPause() }}
        onRestart={() => { triggerHaptic(20); restart() }}
        onClearData={handleClearSession}
      />

      {/* Language Selection Modal */}
      {isLanguageModalOpen && (
        <div
          className="solli-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lang-modal-title"
          onClick={() => setIsLanguageModalOpen(false)}
        >
          <div
            className="solli-modal-card solli-lang-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="solli-modal-icon" aria-hidden="true">
              <Globe size={22} />
            </div>

            <h2 id="lang-modal-title" className="solli-modal-title">
              {language === 'en' ? 'Select Voice Language' : 'மொழியைத் தேர்ந்தெடுக்கவும்'}
              <span className="solli-modal-subtitle">
                10 Indian languages (Tamil & English tested, others preview)
              </span>
            </h2>

            <p className="solli-modal-desc">
              {language === 'en'
                ? 'All speech recognition (STT) and voice responses (TTS) will automatically switch to your selected language.'
                : 'உங்கள் வசதிக்கேற்ப மொழியை மாற்றலாம். இது குரல் ஒலி மற்றும் கேட்கப்படும் வினாக்களை மாற்றும்.'}
            </p>

            <div className="solli-lang-cards">
              {SUPPORTED_LANGUAGES.map((langItem) => {
                const isActive = language === langItem.code
                return (
                  <button
                    key={langItem.code}
                    type="button"
                    className={`solli-lang-card ${isActive ? 'solli-lang-card--active' : ''}`}
                    onClick={() => {
                      triggerHaptic(20)
                      setLanguage(langItem.code)
                      setIsLanguageModalOpen(false)
                    }}
                  >
                    <div className="solli-lang-card-header">
                      <span className="solli-lang-card-native">{langItem.nativeName}</span>
                      {isActive && <Check size={18} className="solli-lang-card-check" />}
                    </div>
                    <span className="solli-lang-card-title">{langItem.name} Voice</span>
                    <span className="solli-lang-card-desc">{langItem.desc}</span>
                  </button>
                )
              })}
            </div>

            <div className="solli-lang-modal-actions">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(30)
                  setIsLanguageModalOpen(false)
                  if (state === STATES.IDLE) {
                    handleStartSession()
                  }
                }}
                className="solli-btn solli-btn-primary solli-btn-block"
              >
                <Play size={14} />
                {currentLangConfig.startBtn || (language === 'en' ? 'Confirm & Start Voice Session' : 'உறுதி செய்து தொடங்கவும்')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN WORKSPACE ─────────────────────────────────────────────── */}
      <main className="solli-workspace">

        {/* ── LEFT: Fields table ───────────────────────────────────────── */}
        <section className="solli-left" aria-label="Form fields">

          {/* Page heading */}
          <div className="solli-page-head">
            <div className="solli-page-head-text">
              <h1 className="solli-page-title">
                Indira Gandhi National Old Age Pension Scheme
              </h1>
              <p className="solli-page-sub">
                Solli Multilingual Voice Assistant · Example Form Prototype (IGNOAPS)
              </p>
            </div>

            <div className="solli-page-actions">
              <button
                type="button"
                onClick={() => { triggerHaptic(20); downloadReceipt({ form: context.form || BUILTIN_SCHEMAS.pension, answers: context.answers, summary }) }}
                className="solli-btn solli-btn-ghost"
              >
                <FileText size={14} />
                Export PDF
              </button>
              <button
                type="button"
                onClick={handleStartSession}
                className="solli-btn solli-btn-primary"
              >
                <Mic size={14} />
                {state === STATES.IDLE ? 'Start voice session' : 'Session active'}
              </button>
            </div>
          </div>

          {/* Progress strip */}
          <div className="solli-progress-wrap" aria-label={`${answeredCount} of ${totalFields} fields complete`}>
            <div className="solli-progress-meta">
              <span className="solli-progress-label">
                <strong>{answeredCount}</strong> / {totalFields} confirmed
              </span>
              <span className="solli-progress-pct">{progressPercent}%</span>
            </div>
            <div className="solli-progress-track" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
              <div className="solli-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          {/* Fields table card */}
          <div className="solli-table-card">
            {/* Toolbar */}
            <div className="solli-table-toolbar">
              <span className="solli-table-title">Form fields</span>
              <input
                type="search"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Search fields"
                className="solli-search"
                aria-label="Search fields"
              />
            </div>

            {/* Table */}
            <div className="solli-table-scroll">
              <table className="solli-table">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: 36 }}>#</th>
                    <th scope="col">Field</th>
                    <th scope="col">Value</th>
                    <th scope="col" className="solli-th-status">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleFields.map((field, idx) => {
                    const isCurrent = currentField?.id === field.id
                    const answerObj = context.answers?.[field.id]
                    const isConfirmed = Boolean(answerObj?.confirmed)
                    const displayVal = answerObj?.display || answerObj?.value || ''
                    const rowNum = (activeFields.indexOf(field) + 1).toString().padStart(2, '0')

                    return (
                      <tr
                        key={field.id}
                        id={`row_${field.id}`}
                        onClick={() => { triggerHaptic(15); startEditField(field.id) }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            triggerHaptic(15)
                            startEditField(field.id)
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        title={`Click to talk or edit ${field.labels?.en || field.id}`}
                        className={`solli-tr${isCurrent ? ' solli-tr-active' : ''}${isConfirmed ? ' solli-tr-confirmed' : ''}`}
                      >
                        {/* Row number */}
                        <td>
                          <span className="solli-row-num">{rowNum}</span>
                        </td>

                        {/* Field name */}
                        <td>
                          <div className="solli-field-name">{field.labels?.en || field.id}</div>
                          <div className="solli-field-name-ta" lang="ta">{field.labels?.ta}</div>
                        </td>

                        {/* Value */}
                        <td>
                          {isConfirmed ? (
                            <span className="solli-value-confirmed">{displayVal}</span>
                          ) : isCurrent ? (
                            <span className="solli-value-listening">
                              <span className="solli-listening-dot" aria-hidden="true" />
                              Listening…
                            </span>
                          ) : (
                            <span className="solli-value-empty">Not answered</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="solli-th-status">
                          {isConfirmed ? (
                            <span className="solli-status solli-status-done">
                              <Check size={12} strokeWidth={1.5} aria-hidden="true" />
                              Done
                            </span>
                          ) : isCurrent ? (
                            <span className="solli-status solli-status-active">
                              Active
                            </span>
                          ) : answerObj?.deferred ? (
                            <span className="solli-status solli-status-later">
                              Later
                            </span>
                          ) : (
                            <span className="solli-status solli-status-pending">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="solli-table-footer">
              <span className="solli-table-count">{visibleFields.length} of {activeFields.length} fields</span>
              <button
                type="button"
                disabled={!isFinished}
                onClick={() => { triggerHaptic(30); confirmFullForm() }}
                className={`solli-btn ${isFinished ? 'solli-btn-primary' : 'solli-btn-ghost solli-btn-disabled'}`}
              >
                <CheckCircle2 size={15} strokeWidth={1.5} />
                Submit application
              </button>
            </div>
          </div>
        </section>

        {/* ── RIGHT: Voice companion ───────────────────────────────────── */}
        <aside className="solli-right" aria-label="Voice assistant">
          <div className="solli-companion">

            {/* Companion header */}
            <div className="solli-companion-head">
              <div className="solli-companion-title">
                Voice assistant
              </div>
              <span className={`solli-companion-node ${state !== STATES.IDLE && !isFinished ? 'solli-companion-node--active' : ''}`}>
                {state !== STATES.IDLE && !isFinished ? 'Session active' : 'Ready to begin'}
              </span>
            </div>

            <div className="solli-companion-body">

              {/* ── STATE: IDLE ──────────────────────────────────────── */}
              {state === STATES.IDLE && (
                <div className="solli-state-idle">
                  <div className="solli-mic-ring-wrap">
                    <div className="solli-mic-ring" aria-hidden="true" />
                    <button
                      type="button"
                      onClick={handleStartSession}
                      className="solli-mic-btn solli-mic-btn-idle"
                      aria-label="Start voice session"
                    >
                      <Mic size={24} strokeWidth={1.5} />
                    </button>
                  </div>
                  <h2 className="solli-idle-title">
                    {currentLangConfig.idleTitle}
                  </h2>
                  <p className="solli-idle-sub">
                    {currentLangConfig.idleSub}
                  </p>

                  {/* Language Selector Dropdown & Modal trigger */}
                  <div className="solli-lang-picker">
                    <div className="solli-lang-dropdown-wrap">
                      <Globe size={15} className="solli-lang-dropdown-icon" />
                      <select
                        value={language}
                        onChange={(e) => {
                          triggerHaptic(15)
                          setLanguage(e.target.value)
                        }}
                        className="solli-lang-dropdown"
                        aria-label="Select voice language"
                      >
                        {SUPPORTED_LANGUAGES.map((langItem) => (
                          <option key={langItem.code} value={langItem.code}>
                            {langItem.nativeName} ({langItem.name})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic(15)
                        setIsLanguageModalOpen(true)
                      }}
                      className="solli-lang-picker-btn"
                      title="Choose language modal"
                    >
                      {language === 'en' ? 'Change' : 'மாற்று'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartSession}
                    className="solli-btn solli-btn-primary solli-btn-block"
                  >
                    <Play size={15} strokeWidth={1.5} />
                    {currentLangConfig.startBtn}
                  </button>
                </div>
              )}

              {/* ── STATE: ERROR ─────────────────────────────────────── */}
              {state === STATES.ERROR && (
                <div className="solli-state-error">
                  <div className="solli-error-icon">
                    <AlertTriangle size={20} />
                  </div>
                  <h3 className="solli-error-title">{error?.messageTa || 'பிழை ஏற்பட்டது'}</h3>
                  <p className="solli-error-sub">{error?.messageEn || 'Something went wrong. Please restart.'}</p>
                  <button
                    type="button"
                    onClick={() => { triggerHaptic(20); restart() }}
                    className="solli-btn solli-btn-ghost solli-btn-block"
                  >
                    <RefreshCw size={14} />
                    Restart
                  </button>
                </div>
              )}

              {/* ── STATE: REVIEW / FIELD SELECT ──────────────────────── */}
              {(state === STATES.REVIEW || (!currentField && !isFinished && state !== STATES.IDLE && state !== STATES.ERROR)) && (
                <div className="solli-state-review">
                  <div className="solli-review-card">
                    <h3 className="solli-review-title">{currentLangConfig.reviewTitle}</h3>
                    <p className="solli-review-sub">
                      {currentLangConfig.reviewSub}
                    </p>

                    <button
                      type="button"
                      onClick={() => { triggerHaptic(20); readFullSummary() }}
                      className="solli-btn solli-btn-ghost solli-btn-block"
                    >
                      <Volume2 size={14} />
                      {summaryReading ? 'Stop audio summary' : currentLangConfig.summaryBtn}
                    </button>

                    <button
                      type="button"
                      onClick={() => { triggerHaptic(30); confirmFullForm() }}
                      className="solli-btn solli-btn-primary solli-btn-block"
                    >
                      <CheckCircle2 size={14} />
                      {currentLangConfig.finishBtn}
                    </button>
                  </div>
                </div>
              )}

              {/* ── STATE: ACTIVE ────────────────────────────────────── */}
              {state !== STATES.IDLE && state !== STATES.ERROR && !isFinished && currentField && (
                <div className="solli-state-active">

                  {/* Step counter */}
                  <div className="solli-step-counter">
                    <span>Field {progress.done + 1} of {progress.total || totalFields}</span>
                    <span className="solli-step-pct">{Math.round(((progress.done + 1) / (progress.total || totalFields)) * 100)}%</span>
                  </div>

                  {/* Current field card */}
                  <div className="solli-field-card">
                    <span className="solli-field-card-label">{currentField.id.replace(/_/g, ' ')}</span>
                    <h2 className="solli-field-card-question" lang={language}>
                      {getFieldQuestionInLanguage(currentField, language)}
                    </h2>
                    <p className="solli-field-card-en">
                      {language === 'en'
                        ? getFieldQuestionInLanguage(currentField, 'ta')
                        : getFieldQuestionInLanguage(currentField, 'en')}
                    </p>
                  </div>

                  {/* Readback confirmation */}
                  {isConfirmState && (
                    <div className="solli-readback">
                      <p className="solli-readback-label">
                        {currentLangConfig.heardLabel}
                      </p>
                      <div className="solli-readback-value">
                        {context.pendingConfirmation?.display ||
                          context.pendingConfirmation?.value ||
                          context.answers?.[currentField?.id]?.display ||
                          context.answers?.[currentField?.id]?.value ||
                          '…'}
                      </div>
                      <p className="solli-readback-hint">
                        {currentLangConfig.confirmHint}
                      </p>
                      <div className="solli-confirm-grid">
                        <button
                          type="button"
                          onClick={() => { triggerHaptic(25); handleConfirmTap(true) }}
                          className="solli-btn solli-btn-confirm-yes"
                        >
                          <Check size={15} />
                          {currentLangConfig.confirmYes}
                        </button>
                        <button
                          type="button"
                          onClick={() => { triggerHaptic(25); handleConfirmTap(false) }}
                          className="solli-btn solli-btn-confirm-no"
                        >
                          <X size={15} />
                          {currentLangConfig.confirmNo}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Microphone */}
                  <div className="solli-mic-wrap">
                    <div className="solli-mic-ring-wrap">
                      {isRecording && <div className="solli-mic-ring solli-mic-ring-recording" aria-hidden="true" />}
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic(20)
                          registerUserActivity()
                          if (isRecording) {
                            if (isConfirmState) stopListeningConfirm()
                            else stopListening()
                          } else {
                            if (isConfirmState) startListeningConfirm()
                            else startListening()
                          }
                        }}
                        className={`solli-mic-btn ${isRecording ? 'solli-mic-btn-recording' : 'solli-mic-btn-idle'}`}
                        aria-label={isRecording ? 'Stop recording' : 'Start speaking'}
                      >
                        <Mic size={22} strokeWidth={1.5} />
                      </button>
                    </div>

                    <p className="solli-mic-label">
                      {isRecording ? (
                        <span className="solli-mic-label-recording">
                          <span className="solli-rec-dot" aria-hidden="true" />
                          Recording · Speak now
                        </span>
                      ) : 'Tap to speak'}
                    </p>

                    {/* Audio meter */}
                    <div className="solli-audio-meter-wrap">
                      <AudioMeter level={audioLevel} isRecording={isRecording} />
                    </div>
                  </div>

                  {/* Keyboard fallback */}
                  <form onSubmit={handleTypedSubmit} className="solli-type-form">
                    <input
                      type="text"
                      value={typedInput}
                      onChange={(e) => setTypedInput(e.target.value)}
                      placeholder={isConfirmState ? 'ஆம் / இல்லை (Yes / No)' : 'Type answer manually'}
                      className="solli-type-input"
                      aria-label="Type answer"
                    />
                    <button type="submit" className="solli-type-submit" aria-label="Submit typed answer">
                      <Send size={15} strokeWidth={1.5} />
                    </button>
                  </form>

                  {/* Quick controls */}
                  <div className="solli-quick-controls">
                    <button
                      type="button"
                      onClick={() => { triggerHaptic(15); repeatQuestion() }}
                      className="solli-quick-btn"
                      title={currentLangConfig.repeat}
                    >
                      <RotateCcw size={14} strokeWidth={1.5} />
                      {currentLangConfig.repeat}
                    </button>
                    <div className="solli-quick-sep" aria-hidden="true" />
                    <button
                      type="button"
                      onClick={() => { triggerHaptic(15); executeCommand('later') }}
                      className="solli-quick-btn"
                      title={currentLangConfig.later}
                    >
                      <Clock size={14} strokeWidth={1.5} />
                      {currentLangConfig.later}
                    </button>
                    <div className="solli-quick-sep" aria-hidden="true" />
                    <button
                      type="button"
                      onClick={() => { triggerHaptic(15); skipCurrentField() }}
                      className="solli-quick-btn"
                      title={currentLangConfig.skip}
                    >
                      <SkipForward size={14} strokeWidth={1.5} />
                      {currentLangConfig.skip}
                    </button>
                  </div>
                </div>
              )}

              {/* ── STATE: FINISHED ──────────────────────────────────── */}
              {isFinished && (
                <div className="solli-state-done">
                  <div className="solli-done-icon">
                    <CheckCircle2 size={28} />
                  </div>
                  <h3 className="solli-done-title">All done</h3>
                  <p className="solli-done-sub">All {totalFields} fields verified and ready to submit.</p>
                  <div className="solli-done-cert">Ready for acknowledgment</div>
                  <button
                    type="button"
                    onClick={() => { triggerHaptic(30); downloadReceipt({ form: context.form || BUILTIN_SCHEMAS.pension, answers: context.answers, summary }) }}
                    className="solli-btn solli-btn-primary solli-btn-block"
                  >
                    <FileText size={14} />
                    Download acknowledgment
                  </button>
                  <button
                    type="button"
                    onClick={() => { triggerHaptic(20); restart() }}
                    className="solli-btn solli-btn-ghost solli-btn-block"
                  >
                    <RefreshCw size={14} />
                    New session
                  </button>
                </div>
              )}

              {/* Meta toggle & tiles */}
              <button
                type="button"
                onClick={() => setShowMeta((prev) => !prev)}
                className="solli-meta-toggle"
                aria-expanded={showMeta}
              >
                {showMeta ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                <span>Operator details</span>
              </button>

              {showMeta && (
                <div className="solli-meta-tiles">
                  <div className="solli-meta-tile">
                    <span className="solli-meta-label">Model</span>
                    <span className="solli-meta-value">Prisma v2.5</span>
                  </div>
                  <div className="solli-meta-tile">
                    <span className="solli-meta-label">Extractor</span>
                    <span className="solli-meta-value">Evon v3.3</span>
                  </div>
                  <div className="solli-meta-tile">
                    <span className="solli-meta-label">Region</span>
                    <span className="solli-meta-value">Chennai</span>
                  </div>
                  <div className="solli-meta-tile">
                    <span className="solli-meta-label">Privacy</span>
                    <span className="solli-meta-value solli-meta-green">Session only</span>
                  </div>
                </div>
              )}

            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}
