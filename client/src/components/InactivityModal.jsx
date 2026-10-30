/**
 * InactivityModal Component
 * Kiosk safety modal: triggers a 20-second countdown before clearing memory.
 * Accessible dialog with assertive aria-live announcement.
 */
export default function InactivityModal({ countdown = 20, onStayActive }) {
  return (
    <div
      className="modal-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="inactivity-title"
      aria-describedby="inactivity-desc"
    >
      <div className="modal-content">
        <span style={{ fontSize: '3rem' }} aria-hidden="true">
          ⏳
        </span>

        <h2 id="inactivity-title" style={{ color: 'var(--color-no)', margin: '0.5rem 0' }}>
          செயலற்ற நிலை எச்சரிக்கை / Inactivity Warning
        </h2>

        <div className="modal-countdown" aria-live="assertive" aria-atomic="true">
          {countdown}
        </div>

        <p id="inactivity-desc" style={{ fontSize: 'var(--font-size-body)', marginBottom: '1.5rem' }}>
          பொது சாதன பாதுகாப்பிற்காக, செயல்பாடு இல்லாவிட்டால் படிவ விவரங்கள் அழிக்கப்பட்டு முகப்புப் பக்கத்திற்குச் செல்லும்.
          <br />
          <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-caption)' }}>
            For kiosk privacy, answers will be erased from memory if no interaction is detected.
          </span>
        </p>

        <button
          type="button"
          onClick={onStayActive}
          className="btn btn-yes"
          style={{ width: '100%', minHeight: '64px' }}
        >
          ✅ நான் இங்குள்ளேன், தொடரவும் / I am here, Continue
        </button>
      </div>
    </div>
  )
}
