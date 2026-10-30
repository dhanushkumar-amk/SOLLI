/**
 * InactivityModal Component (Cupertino iOS Alert Dialog)
 * Triggers a 20-second countdown warning before kiosk answers are cleared.
 */
export default function InactivityModal({ countdown = 20, onStayActive }) {
  return (
    <div
      className="ios-sheet-backdrop"
      style={{ alignItems: 'center' }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="inactivity-title"
      aria-describedby="inactivity-desc"
    >
      <div
        className="ios-card"
        style={{
          maxWidth: '440px',
          width: '90%',
          textAlign: 'center',
          padding: '2rem 1.5rem',
          border: '2px solid var(--ios-amber)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
        }}
      >
        <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem' }} aria-hidden="true">
          ⏳
        </span>

        <h2 id="inactivity-title" style={{ color: 'var(--ios-red)', fontSize: 'var(--font-size-btn-large)', fontWeight: 800, margin: '0 0 0.5rem' }}>
          செயலற்ற நிலை எச்சரிக்கை
          <span style={{ display: 'block', fontSize: 'var(--font-size-small)', color: 'var(--ios-text-secondary)', fontWeight: 600 }}>
            Inactivity Privacy Warning
          </span>
        </h2>

        <div
          style={{
            fontSize: '3.5rem',
            fontWeight: 800,
            color: 'var(--ios-red)',
            margin: '0.5rem 0',
            lineHeight: 1,
          }}
          aria-live="assertive"
          aria-atomic="true"
        >
          {countdown}
        </div>

        <p id="inactivity-desc" style={{ fontSize: 'var(--font-size-body)', color: 'var(--ios-text-secondary)', margin: '1rem 0 1.5rem' }}>
          பாதுகாப்பிற்காக, செயல்பாடு இல்லாவிட்டால் படிவ விவரங்கள் அழிக்கப்பட்டு முகப்புப் பக்கத்திற்குச் செல்லும்.
          <br />
          <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--ios-text-tertiary)' }}>
            Answers will be erased from memory if no interaction is detected.
          </span>
        </p>

        <button
          type="button"
          onClick={onStayActive}
          className="ios-btn ios-btn-yes ios-btn-block"
        >
          ✅ நான் இங்குள்ளேன், தொடரவும் / I am here
        </button>
      </div>
    </div>
  )
}
