import { Clock, Check } from 'lucide-react'

/**
 * InactivityModal Component (Modern Shadcn AlertDialog)
 * Clean, minimal dialog warning before kiosk memory is wiped.
 */
export default function InactivityModal({ countdown = 20, onStayActive }) {
  return (
    <div
      className="solli-modal-backdrop"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="inactivity-title"
      aria-describedby="inactivity-desc"
    >
      <div className="solli-modal-card">
        {/* Subtle timer badge */}
        <div className="solli-modal-icon" aria-hidden="true">
          <Clock size={22} />
        </div>

        <h2 id="inactivity-title" className="solli-modal-title">
          அமர்வு எச்சரிக்கை
          <span className="solli-modal-subtitle">
            Session Inactivity Warning
          </span>
        </h2>

        {/* Crisp countdown badge */}
        <div className="solli-modal-countdown" aria-live="assertive" aria-atomic="true">
          <span className="solli-modal-countdown-num">{countdown}</span>
          <span className="solli-modal-countdown-label">வினாடிகளில் மீட்டமைக்கப்படும் (seconds remaining)</span>
        </div>

        <p id="inactivity-desc" className="solli-modal-desc">
          பாதுகாப்பிற்காக, செயல்பாடு இல்லாவிட்டால் படிவ விவரங்கள் அழிக்கப்பட்டு முகப்புப் பக்கத்திற்குச் செல்லும்.
          <span className="solli-modal-desc-en">
            Answers will be erased from memory if no interaction is detected.
          </span>
        </p>

        <button
          type="button"
          onClick={onStayActive}
          className="solli-btn solli-btn-primary solli-btn-block solli-modal-btn"
        >
          <Check size={16} />
          நான் இங்குள்ளேன், தொடரவும் (I am here)
        </button>
      </div>
    </div>
  )
}
