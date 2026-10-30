import { STATES } from '../conversation/stateMachine'

/**
 * StateBanner Component (Apple iOS Pill Style)
 * Delivers an icon, clear bilingual text labels, and feeds the polite aria-live announcement.
 */
export default function StateBanner({
  state,
  isRecording = false,
  isTakingLong = false,
  onRetry,
  uiLang = 'both',
}) {
  let icon = 'ℹ️'
  let textTa = ''
  let textEn = ''
  let bannerClass = 'ios-state-speaking'

  switch (state) {
    case STATES.SPEAKING_QUESTION:
      icon = '🔊'
      textTa = 'கேள்வி கேட்கப்படுகிறது...'
      textEn = 'Speaking question...'
      bannerClass = 'ios-state-speaking'
      break

    case STATES.LISTENING:
      if (isRecording) {
        icon = '🔴'
        textTa = 'பதிவு செய்யப்படுகிறது... பேசுங்கள்'
        textEn = 'Recording... speak now'
        bannerClass = 'ios-state-listening'
      } else {
        icon = '🎙️'
        textTa = 'பேச தயாராக உள்ளது (தட்டவும்)'
        textEn = 'Ready for speech (Tap mic)'
        bannerClass = 'ios-state-speaking'
      }
      break

    case STATES.TRANSCRIBING:
      icon = '⏳'
      textTa = 'குரல் எழுத்தாக்கம் நடக்கிறது...'
      textEn = 'Transcribing speech...'
      bannerClass = 'ios-state-thinking'
      break

    case STATES.PROCESSING:
      icon = '🧠'
      textTa = 'விடை சரிபார்க்கப்படுகிறது...'
      textEn = 'Checking answer...'
      bannerClass = 'ios-state-thinking'
      break

    case STATES.SPEAKING_READBACK:
      icon = '🔊'
      textTa = 'விவரம் சரிபார்க்கப்படுகிறது...'
      textEn = 'Speaking read-back...'
      bannerClass = 'ios-state-speaking'
      break

    case STATES.LISTENING_CONFIRM:
      if (isRecording) {
        icon = '🔴'
        textTa = '"ஆம்" அல்லது "இல்லை" சொல்லுங்கள்'
        textEn = 'Say "Yes" or "No"'
        bannerClass = 'ios-state-listening'
      } else {
        icon = '👂'
        textTa = '"ஆம்" அல்லது "இல்லை" சொல்லவும் / தட்டவும்'
        textEn = 'Say Yes or No, or tap below'
        bannerClass = 'ios-state-speaking'
      }
      break

    case STATES.PROCESSING_CONFIRM:
      icon = '🧠'
      textTa = 'உறுதிப்படுத்தல் சரிபார்க்கப்படுகிறது...'
      textEn = 'Verifying confirmation...'
      bannerClass = 'ios-state-thinking'
      break

    case STATES.SPEAKING_HELP:
      icon = '💡'
      textTa = 'உதவி விளக்கம் சொல்லப்படுகிறது...'
      textEn = 'Speaking help...'
      bannerClass = 'ios-state-speaking'
      break

    case STATES.SPEAKING_ERROR:
      icon = '⚠️'
      textTa = 'மன்னிக்கவும், மீண்டும் சொல்லவும்...'
      textEn = 'Please say it again...'
      bannerClass = 'ios-state-listening'
      break

    case STATES.PAUSED:
      icon = '⏸️'
      textTa = 'உரையாடல் இடைநிறுத்தப்பட்டுள்ளது'
      textEn = 'Conversation paused'
      bannerClass = 'ios-state-paused'
      break

    case STATES.OPERATOR_PAUSED:
      icon = '👤'
      textTa = 'பணியாளர் உதவி தேவை'
      textEn = 'Operator needed'
      bannerClass = 'ios-state-operator'
      break

    case STATES.CONFIRM_START_OVER:
      icon = '⚠️'
      textTa = 'மீண்டும் தொடங்குவதை உறுதிப்படுத்தவும்'
      textEn = 'Confirm start over'
      bannerClass = 'ios-state-operator'
      break

    case STATES.LOADING_FORM:
      icon = '⏳'
      textTa = 'படிவம் ஏற்றப்படுகிறது...'
      textEn = 'Loading form...'
      bannerClass = 'ios-state-thinking'
      break

    default:
      return null
  }

  // If waiting took longer than 6s, show helpful calm warning
  if (isTakingLong) {
    icon = '⏳'
    textTa = 'வழக்கத்தை விட அதிக நேரம் எடுக்கிறது...'
    textEn = 'Taking longer than usual...'
  }

  return (
    <div
      className={`ios-state-pill ${bannerClass}`}
      role="status"
      aria-live="polite"
    >
      <span style={{ fontSize: '1.25rem', lineHeight: 1 }} aria-hidden="true">
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {uiLang !== 'en' && <span lang="ta">{textTa}</span>}
        {uiLang === 'both' && <span style={{ margin: '0 0.35rem' }}>•</span>}
        {uiLang !== 'ta' && <span lang="en">{textEn}</span>}
      </div>

      {isTakingLong && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="ios-btn ios-btn-secondary"
          style={{ minHeight: '40px', padding: '0.25rem 0.75rem', fontSize: '0.95rem' }}
        >
          🔄 Retry
        </button>
      )}
    </div>
  )
}
