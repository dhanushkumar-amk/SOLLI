/**
 * OperatorSheet Component (Cupertino iOS Modal Bottom Sheet)
 * Slides up from the bottom of the device screen when the operator taps ⚙️.
 * Settings persist only in memory for the active kiosk session.
 */
export default function OperatorSheet({
  isOpen = false,
  onClose,
  fontSize = 'normal',
  setFontSize,
  contrast = 'normal',
  setContrast,
  voiceMuted = false,
  setVoiceMuted,
  canResume = false,
  onResume,
  onRestart,
  onClearData,
}) {
  if (!isOpen) return null

  return (
    <div
      className="ios-sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-operator-title"
      onClick={onClose}
    >
      <div
        className="ios-sheet-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS Drag Handle */}
        <div className="ios-sheet-handle" aria-hidden="true" />

        {/* Sheet Header */}
        <div className="ios-sheet-header">
          <h2 id="ios-operator-title" style={{ fontSize: 'var(--font-size-btn)', fontWeight: 800 }}>
            ⚙️ பணியாளர் அமைப்புகள்
            <span style={{ display: 'block', fontSize: 'var(--font-size-small)', color: 'var(--ios-text-secondary)', fontWeight: 500 }}>
              Operator Assistance Settings (In-Memory Only)
            </span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="ios-icon-btn"
            aria-label="Close operator settings"
          >
            ✕
          </button>
        </div>

        {/* Group 1: Font Size */}
        <div className="ios-sheet-cell">
          <span style={{ display: 'block', fontWeight: 700, fontSize: 'var(--font-size-small)', marginBottom: '0.5rem' }}>
            எழுத்து அளவு / Font Scale:
          </span>
          <div className="ios-segmented-control" style={{ margin: 0 }}>
            <button
              type="button"
              className={`ios-segment-btn ${fontSize === 'normal' ? 'active' : ''}`}
              onClick={() => setFontSize('normal')}
            >
              20px (Normal)
            </button>
            <button
              type="button"
              className={`ios-segment-btn ${fontSize === 'large' ? 'active' : ''}`}
              onClick={() => setFontSize('large')}
            >
              23px (Large)
            </button>
            <button
              type="button"
              className={`ios-segment-btn ${fontSize === 'xlarge' ? 'active' : ''}`}
              onClick={() => setFontSize('xlarge')}
            >
              26px (X-Large)
            </button>
          </div>
        </div>

        {/* Group 2: Contrast */}
        <div className="ios-sheet-cell">
          <span style={{ display: 'block', fontWeight: 700, fontSize: 'var(--font-size-small)', marginBottom: '0.5rem' }}>
            மாறுபட்ட வண்ணம் / Contrast:
          </span>
          <div className="ios-segmented-control" style={{ margin: 0 }}>
            <button
              type="button"
              className={`ios-segment-btn ${contrast === 'normal' ? 'active' : ''}`}
              onClick={() => setContrast('normal')}
            >
              இயல்பு (Normal)
            </button>
            <button
              type="button"
              className={`ios-segment-btn ${contrast === 'high' ? 'active' : ''}`}
              onClick={() => setContrast('high')}
            >
              உயர் மாறுபாடு (High)
            </button>
          </div>
        </div>

        {/* Group 3: Voice Audio Mute */}
        <div className="ios-sheet-cell">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 'var(--font-size-small)' }}>
                குரல் ஒலி / Voice Speech (Timbre):
              </span>
              <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--ios-text-secondary)' }}>
                {voiceMuted ? 'ஒலி முடக்கப்பட்டுள்ளது (Muted)' : 'ஒலி இயக்கத்தில் உள்ளது (Active)'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setVoiceMuted(!voiceMuted)}
              className="ios-btn ios-btn-secondary"
              style={{ minHeight: '44px', padding: '0.4rem 1rem', fontSize: 'var(--font-size-small)' }}
            >
              {voiceMuted ? '🔊 Unmute' : '🔇 Mute'}
            </button>
          </div>
        </div>

        {/* Group 4: Session Controls */}
        <div className="ios-sheet-cell">
          <span style={{ display: 'block', fontWeight: 700, fontSize: 'var(--font-size-small)', marginBottom: '0.65rem' }}>
            அமர்வு கட்டுப்பாடு / Session Controls:
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {canResume && (
              <button
                type="button"
                onClick={() => {
                  onResume()
                  onClose()
                }}
                className="ios-btn ios-btn-primary ios-btn-block"
              >
                ▶️ உரையாடலைத் தொடரவும் / Resume Session
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onRestart()
                onClose()
              }}
              className="ios-btn ios-btn-secondary ios-btn-block"
            >
              🔄 அமர்வை மீட்டமை / Restart
            </button>

            <button
              type="button"
              onClick={() => {
                onClearData()
                onClose()
              }}
              className="ios-btn ios-btn-no ios-btn-block"
            >
              🗑️ விவரங்களை அழி / Clear Memory
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
