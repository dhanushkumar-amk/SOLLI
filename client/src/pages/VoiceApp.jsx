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
} from 'lucide-react'

function getFieldTypeBadge(fieldId) {
  if (fieldId === 'applicant_name' || fieldId === 'parent_spouse_name') return 'Name'
  if (fieldId === 'mobile') return 'Phone'
  if (fieldId === 'aadhaar') return 'ID'
  if (fieldId === 'district' || fieldId === 'pincode') return 'Location'
  if (fieldId === 'bank_account' || fieldId === 'ifsc') return 'Bank'
  if (fieldId === 'age' || fieldId === 'gender') return 'Profile'
  return 'Text'
}

export default function VoiceApp() {
  const [fontSize, setFontSize] = useState('normal')
  const [contrast, setContrast] = useState('normal')
  const [selectedFormId, setSelectedFormId] = useState('pension')
  const [isOperatorSheetOpen, setIsOperatorSheetOpen] = useState(false)
  const [typedInput, setTypedInput] = useState('')
  const [filterQuery, setFilterQuery] = useState('')

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
    setVoiceMuted,
    restart,
    resumeFromPause,
  } = useConversation({
    mode: 'voice',
    voiceMuted: false,
    formId: selectedFormId,
  })

  const handleStartSession = useCallback((formId) => {
    triggerHaptic(30)
    setSelectedFormId(formId)
    start(formId)
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

  const isConfirmState = (
    state === STATES.SPEAKING_READBACK ||
    state === STATES.LISTENING_CONFIRM ||
    state === STATES.PROCESSING_CONFIRM
  )
  const isFinished = state === STATES.FINISHED || state === STATES.READY_FOR_PDF

  const activeFields = useMemo(() => {
    if (context.form?.fields && Array.isArray(context.form.fields)) return context.form.fields
    return [
      { id: 'applicant_name', labels: { ta: 'விண்ணப்பதாரர் பெயர்', en: 'Applicant Full Name' }, required: true },
      { id: 'parent_spouse_name', labels: { ta: 'தந்தை / கணவர் பெயர்', en: 'Parent / Spouse Name' }, required: true },
      { id: 'aadhaar', labels: { ta: 'ஆதார் எண்', en: 'Aadhaar Number' }, required: true },
      { id: 'mobile', labels: { ta: 'அலைபேசி எண்', en: 'Mobile Number' }, required: true },
      { id: 'age', labels: { ta: 'வயது', en: 'Age' }, required: true },
      { id: 'gender', labels: { ta: 'பாலினம்', en: 'Gender' }, required: true },
      { id: 'district', labels: { ta: 'மாவட்டம்', en: 'District' }, required: true },
      { id: 'pincode', labels: { ta: 'அஞ்சல் குறியீடு', en: 'Pincode' }, required: true },
      { id: 'bank_account', labels: { ta: 'வங்கி கணக்கு எண்', en: 'Bank Account Number' }, required: true },
      { id: 'ifsc', labels: { ta: 'IFSC குறியீடு', en: 'IFSC Code' }, required: true },
    ]
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
          {/* Brand */}
          <div className="solli-brand">
            <div className="solli-brand-icon" aria-hidden="true">
              <Mic size={14} />
            </div>
            <span className="solli-brand-name">Solli</span>
          </div>

          {/* Centre: form switcher */}
          <div className="solli-form-switch">
            <button
              type="button"
              onClick={() => setSelectedFormId('pension')}
              className={`solli-switch-btn ${selectedFormId === 'pension' ? 'active' : ''}`}
            >
              முதியோர் உதவி
            </button>
            <button
              type="button"
              onClick={() => setSelectedFormId('college_admission')}
              className={`solli-switch-btn ${selectedFormId === 'college_admission' ? 'active' : ''}`}
            >
              கல்லூரி சேர்க்கை
            </button>
          </div>

          {/* Right actions */}
          <div className="solli-header-actions">
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

      {/* ── MAIN WORKSPACE ─────────────────────────────────────────────── */}
      <main className="solli-workspace">

        {/* ── LEFT: Fields table ───────────────────────────────────────── */}
        <section className="solli-left" aria-label="Form fields">

          {/* Page heading */}
          <div className="solli-page-head">
            <div className="solli-page-head-text">
              <h1 className="solli-page-title">
                {selectedFormId === 'pension'
                  ? 'Indira Gandhi Old Age Pension'
                  : 'State University Admission'}
              </h1>
              <p className="solli-page-sub">
                {selectedFormId === 'pension'
                  ? 'Tamil Nadu Social Welfare — IGNOAPS'
                  : 'State University UG Application'}
              </p>
            </div>

            <div className="solli-page-actions">
              <button
                type="button"
                onClick={() => { triggerHaptic(20); downloadReceipt({ form: context.form, answers: context.answers, summary }) }}
                className="solli-btn solli-btn-ghost"
              >
                <FileText size={14} />
                Export PDF
              </button>
              <button
                type="button"
                onClick={() => handleStartSession(selectedFormId)}
                className="solli-btn solli-btn-primary"
              >
                <Mic size={14} />
                {state === STATES.IDLE ? 'Start session' : 'Session active'}
              </button>
            </div>
          </div>

          {/* Progress strip */}
          <div className="solli-progress-wrap" aria-label={`${answeredCount} of ${totalFields} fields complete`}>
            <div className="solli-progress-meta">
              <span className="solli-progress-label">{answeredCount} / {totalFields} confirmed</span>
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
                placeholder="Filter…"
                className="solli-search"
                aria-label="Filter fields"
              />
            </div>

            {/* Table */}
            <div className="solli-table-scroll">
              <table className="solli-table">
                <thead>
                  <tr>
                    <th scope="col">Type</th>
                    <th scope="col">Field</th>
                    <th scope="col">Value</th>
                    <th scope="col" className="solli-th-status">Status</th>
                    <th scope="col" className="solli-th-action"><span className="sr-only">Edit</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleFields.map((field) => {
                    const isCurrent = currentField?.id === field.id
                    const answerObj = context.answers?.[field.id]
                    const isConfirmed = Boolean(answerObj?.confirmed)
                    const displayVal = answerObj?.display || answerObj?.value || ''
                    const fieldType = getFieldTypeBadge(field.id)

                    return (
                      <tr
                        key={field.id}
                        id={`row_${field.id}`}
                        className={`solli-tr${isCurrent ? ' solli-tr-active' : ''}${isConfirmed ? ' solli-tr-confirmed' : ''}`}
                      >
                        {/* Type */}
                        <td>
                          <span className="solli-type-badge">{fieldType}</span>
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
                            <span className="solli-value-empty">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="solli-th-status">
                          {isConfirmed ? (
                            <span className="solli-status solli-status-done">
                              <Check size={11} aria-hidden="true" />
                              Done
                            </span>
                          ) : isCurrent ? (
                            <span className="solli-status solli-status-active">
                              Active
                            </span>
                          ) : (
                            <span className="solli-status solli-status-pending">
                              Pending
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="solli-th-action">
                          <button
                            type="button"
                            onClick={() => { triggerHaptic(15); startEditField(field.id) }}
                            className="solli-row-action"
                            title="Record via voice"
                            aria-label={`Record ${field.labels?.en || field.id}`}
                          >
                            <ArrowRight size={13} />
                          </button>
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
                <CheckCircle2 size={14} />
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
                <span className="solli-live-dot" aria-hidden="true" />
                Voice assistant
              </div>
              <span className="solli-companion-node">Tamil Nadu</span>
            </div>

            <div className="solli-companion-body">

              {/* ── STATE: IDLE ──────────────────────────────────────── */}
              {state === STATES.IDLE && (
                <div className="solli-state-idle">
                  <div className="solli-mic-ring-wrap">
                    <div className="solli-mic-ring" aria-hidden="true" />
                    <button
                      type="button"
                      onClick={() => handleStartSession(selectedFormId)}
                      className="solli-mic-btn solli-mic-btn-idle"
                      aria-label="Start voice session"
                    >
                      <Mic size={28} />
                    </button>
                  </div>
                  <h2 className="solli-idle-title">சொல்லுங்கள்</h2>
                  <p className="solli-idle-sub">Speak in Tamil, Tanglish, or English and Solli fills the form for you.</p>
                  <button
                    type="button"
                    onClick={() => handleStartSession(selectedFormId)}
                    className="solli-btn solli-btn-primary solli-btn-block"
                  >
                    <Play size={14} />
                    Start voice session
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
                    <h2 className="solli-field-card-question" lang="ta">
                      {currentField.question?.ta || currentField.labels?.ta}
                    </h2>
                    <p className="solli-field-card-en">
                      {currentField.question?.en || currentField.labels?.en}
                    </p>
                  </div>

                  {/* Readback confirmation */}
                  {isConfirmState && (
                    <div className="solli-readback">
                      <p className="solli-readback-label">Heard:</p>
                      <div className="solli-readback-value">
                        {context.answers?.[currentField.id]?.display ||
                          context.answers?.[currentField.id]?.value || '…'}
                      </div>
                      <p className="solli-readback-hint" lang="ta">
                        சரியாக இருந்தால் "ஆம்" எனவும், தவறெனில் "இல்லை" எனவும் சொல்லுங்கள்.
                      </p>
                      <div className="solli-confirm-grid">
                        <button
                          type="button"
                          onClick={() => { triggerHaptic(25); handleConfirmTap(true) }}
                          className="solli-btn solli-btn-confirm-yes"
                        >
                          <Check size={15} />
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => { triggerHaptic(25); handleConfirmTap(false) }}
                          className="solli-btn solli-btn-confirm-no"
                        >
                          <X size={15} />
                          Re-take
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
                        <Mic size={22} />
                      </button>
                    </div>

                    <p className="solli-mic-label">
                      {isRecording ? (
                        <span className="solli-mic-label-recording">
                          <span className="solli-rec-dot" aria-hidden="true" />
                          Recording — speak now
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
                      placeholder={isConfirmState ? 'ஆம் / இல்லை / Yes / No' : 'Or type the value…'}
                      className="solli-type-input"
                      aria-label="Type answer"
                    />
                    <button type="submit" className="solli-type-submit" aria-label="Submit typed answer">
                      <Send size={14} />
                    </button>
                  </form>

                  {/* Quick controls */}
                  <div className="solli-quick-controls">
                    <button
                      type="button"
                      onClick={() => { triggerHaptic(15); repeatQuestion() }}
                      className="solli-quick-btn"
                    >
                      <RotateCcw size={13} />
                      Repeat
                    </button>
                    <div className="solli-quick-sep" aria-hidden="true" />
                    <button
                      type="button"
                      onClick={() => { triggerHaptic(15); skipCurrentField() }}
                      className="solli-quick-btn"
                    >
                      <SkipForward size={13} />
                      Skip
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
                  <div className="solli-done-cert">CERT-ID: TN-OAP-2026-849201</div>
                  <button
                    type="button"
                    onClick={() => { triggerHaptic(30); downloadReceipt({ form: context.form, answers: context.answers, summary }) }}
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

              {/* Meta tiles */}
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
                  <span className="solli-meta-value solli-meta-green">0-persist</span>
                </div>
              </div>

            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}
