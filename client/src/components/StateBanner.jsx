import { STATES } from '../conversation/stateMachine'
import {
  IconAlert,
  IconHelp,
  IconMic,
  IconPause,
  IconSparkles,
  IconTimer,
  IconVolume,
} from './Icons'

/**
 * StateBanner Component (Flutter Pill Chip Style)
 * Delivers clean SVG icons, bilingual text labels, and feeds the polite aria-live announcement.
 */
export default function StateBanner({
  state,
  isRecording = false,
  isTakingLong = false,
  onRetry,
  uiLang = 'both',
}) {
  let icon = <IconVolume size={16} />
  let textTa = ''
  let textEn = ''
  let bannerClass = 'ios-state-speaking'

  switch (state) {
    case STATES.SPEAKING_QUESTION:
      icon = <IconVolume size={16} />
      textTa = 'கேள்வி கேட்கப்படுகிறது...'
      textEn = 'Speaking question...'
      bannerClass = 'ios-state-speaking'
      break

    case STATES.LISTENING:
      if (isRecording) {
        icon = (
          <span className="relative flex h-2.5 w-2.5 mr-0.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>
        )
        textTa = 'பதிவு செய்யப்படுகிறது... பேசுங்கள்'
        textEn = 'Recording... speak now'
        bannerClass = 'ios-state-listening'
      } else {
        icon = <IconMic size={16} />
        textTa = 'பேச தயாராக உள்ளது (தட்டவும்)'
        textEn = 'Ready for speech (Tap mic)'
        bannerClass = 'ios-state-speaking'
      }
      break

    case STATES.TRANSCRIBING:
      icon = <IconTimer size={16} className="animate-spin" />
      textTa = 'குரல் எழுத்தாக்கம் நடக்கிறது...'
      textEn = 'Transcribing speech...'
      bannerClass = 'ios-state-thinking'
      break

    case STATES.PROCESSING:
      icon = <IconSparkles size={16} />
      textTa = 'விடை சரிபார்க்கப்படுகிறது...'
      textEn = 'Checking answer...'
      bannerClass = 'ios-state-thinking'
      break

    case STATES.SPEAKING_READBACK:
      icon = <IconVolume size={16} />
      textTa = 'விவரம் சரிபார்க்கப்படுகிறது...'
      textEn = 'Speaking read-back...'
      bannerClass = 'ios-state-speaking'
      break

    case STATES.LISTENING_CONFIRM:
      if (isRecording) {
        icon = (
          <span className="relative flex h-2.5 w-2.5 mr-0.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>
        )
        textTa = '"ஆம்" அல்லது "இல்லை" சொல்லுங்கள்'
        textEn = 'Say "Yes" or "No"'
        bannerClass = 'ios-state-listening'
      } else {
        icon = <IconMic size={16} />
        textTa = '"ஆம்" அல்லது "இல்லை" சொல்லவும் / தட்டவும்'
        textEn = 'Say Yes or No, or tap below'
        bannerClass = 'ios-state-speaking'
      }
      break

    case STATES.PROCESSING_CONFIRM:
      icon = <IconSparkles size={16} />
      textTa = 'உறுதிப்படுத்தல் சரிபார்க்கப்படுகிறது...'
      textEn = 'Verifying confirmation...'
      bannerClass = 'ios-state-thinking'
      break

    case STATES.SPEAKING_HELP:
      icon = <IconHelp size={16} />
      textTa = 'உதவி விளக்கம் சொல்லப்படுகிறது...'
      textEn = 'Speaking help...'
      bannerClass = 'ios-state-speaking'
      break

    case STATES.SPEAKING_ERROR:
      icon = <IconAlert size={16} />
      textTa = 'மன்னிக்கவும், மீண்டும் சொல்லவும்...'
      textEn = 'Please say it again...'
      bannerClass = 'ios-state-listening'
      break

    case STATES.PAUSED:
      icon = <IconPause size={16} />
      textTa = 'உரையாடல் இடைநிறுத்தப்பட்டுள்ளது'
      textEn = 'Conversation paused'
      bannerClass = 'ios-state-paused'
      break

    case STATES.OPERATOR_NEEDED:
      icon = <IconAlert size={16} />
      textTa = 'பணியாளர் உதவி தேவைப்படுகிறது'
      textEn = 'Operator assistance needed'
      bannerClass = 'ios-state-operator'
      break

    case STATES.ERROR:
      icon = <IconAlert size={16} />
      textTa = 'தொழில்நுட்ப பிழை ஏற்பட்டது'
      textEn = 'Technical issue encountered'
      bannerClass = 'ios-state-listening'
      break

    case STATES.REVIEW_SUMMARY:
      icon = <IconSparkles size={16} />
      textTa = 'படிவ விவரங்களைச் சரிபார்க்கவும்'
      textEn = 'Review your application'
      bannerClass = 'ios-state-thinking'
      break

    case STATES.FINISHED:
    case STATES.READY_FOR_PDF:
      icon = <IconSparkles size={16} />
      textTa = 'படிவம் வெற்றிகரமாக முடிந்தது'
      textEn = 'Application completed successfully'
      bannerClass = 'ios-state-speaking'
      break

    default:
      return null
  }

  // Bilingual text presentation respecting uiLang setting
  const displayText = () => {
    if (uiLang === 'ta') return textTa
    if (uiLang === 'en') return textEn
    return (
      <>
        <span lang="ta">{textTa}</span>
        {textEn && (
          <span
            lang="en"
            style={{
              fontSize: '0.82em',
              opacity: 0.82,
              fontWeight: 500,
              marginLeft: '0.35rem',
            }}
          >
            ({textEn})
          </span>
        )}
      </>
    )
  }

  const liveAnnouncement = uiLang === 'ta' ? textTa : uiLang === 'en' ? textEn : `${textTa}. ${textEn}`

  return (
    <div className={`ios-state-pill ${bannerClass}`} role="status">
      <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center' }}>
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {displayText()}
      </div>

      {isTakingLong && (
        <span
          style={{
            fontSize: 'var(--font-size-small)',
            fontWeight: 600,
            color: 'var(--amber-warning)',
            marginLeft: 'auto',
            paddingLeft: '0.5rem',
          }}
        >
          பொறுத்திருக்கவும்... / Please wait...
        </span>
      )}

      {/* Screen reader polite announcement */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </span>
    </div>
  )
}
