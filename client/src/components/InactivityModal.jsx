import { IconCheck, IconTimer } from './Icons'

/**
 * InactivityModal Component (Flutter Alert Dialog)
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
          maxWidth: '400px',
          width: '92%',
          textAlign: 'center',
          padding: '1.5rem 1.25rem',
          border: '1.5px solid var(--amber-warning)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'var(--amber-light)',
            color: 'var(--amber-warning)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 0.75rem',
          }}
          aria-hidden="true"
        >
          <IconTimer size={26} />
        </div>

        <h2 id="inactivity-title" style={{ color: 'var(--danger-red)', fontSize: 'var(--font-size-btn-large)', fontWeight: 800, margin: '0 0 0.35rem' }}>
          செயலற்ற நிலை எச்சரிக்கை
          <span style={{ display: 'block', fontSize: 'var(--font-size-small)', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '2px' }}>
            Inactivity Privacy Warning
          </span>
        </h2>

        <div
          style={{
            fontSize: '2.5rem',
            fontWeight: 800,
            color: 'var(--danger-red)',
            margin: '0.4rem 0',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
          aria-live="assertive"
          aria-atomic="true"
        >
          {countdown}
        </div>

        <p id="inactivity-desc" style={{ fontSize: 'var(--font-size-body)', color: 'var(--text-secondary)', margin: '0.75rem 0 1.25rem' }}>
          பாதுகாப்பிற்காக, செயல்பாடு இல்லாவிட்டால் படிவ விவரங்கள் அழிக்கப்பட்டு முகப்புப் பக்கத்திற்குச் செல்லும்.
          <br />
          <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--text-tertiary)' }}>
            Answers will be erased from memory if no interaction is detected.
          </span>
        </p>

        <button
          type="button"
          onClick={onStayActive}
          className="ios-btn ios-btn-yes ios-btn-block"
        >
          <IconCheck size={18} /> நான் இங்குள்ளேன், தொடரவும் / I am here
        </button>
      </div>
    </div>
  )
}
