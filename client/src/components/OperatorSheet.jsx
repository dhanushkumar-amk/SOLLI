import {
  IconClose,
  IconGear,
  IconPlay,
  IconRefresh,
  IconTrash,
  IconVolume,
  IconVolumeMute,
} from './Icons'

/**
 * OperatorSheet Component (Flutter Modal Bottom Sheet)
 * Slides up from the bottom of the device screen when the operator taps settings.
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
        {/* Flutter Drag Handle */}
        <div className="ios-sheet-handle" aria-hidden="true" />

        {/* Sheet Header */}
        <div className="ios-sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--brand-light)',
                color: 'var(--brand-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconGear size={18} />
            </div>
            <div>
              <h2 id="ios-operator-title" style={{ fontSize: 'var(--font-size-btn)', fontWeight: 700, margin: 0 }}>
                பணியாளர் அமைப்புகள்
              </h2>
              <span style={{ display: 'block', fontSize: 'var(--font-size-small)', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Operator Assistance Settings (In-Memory Only)
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ios-icon-btn"
            aria-label="Close operator settings"
          >
            <IconClose size={18} />
          </button>
        </div>

        {/* Group 1: Font Size */}
        <div className="ios-sheet-cell">
          <span style={{ display: 'block', fontWeight: 600, fontSize: 'var(--font-size-small)', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
            எழுத்து அளவு / Font Scale:
          </span>
          <div className="ios-segmented-control" style={{ margin: 0 }}>
            <button
              type="button"
              className={`ios-segment-btn ${fontSize === 'normal' ? 'active' : ''}`}
              onClick={() => setFontSize('normal')}
            >
              Compact (14px)
            </button>
            <button
              type="button"
              className={`ios-segment-btn ${fontSize === 'large' ? 'active' : ''}`}
              onClick={() => setFontSize('large')}
            >
              Large (16px)
            </button>
            <button
              type="button"
              className={`ios-segment-btn ${fontSize === 'xlarge' ? 'active' : ''}`}
              onClick={() => setFontSize('xlarge')}
            >
              X-Large (18px)
            </button>
          </div>
        </div>

        {/* Group 2: Contrast */}
        <div className="ios-sheet-cell">
          <span style={{ display: 'block', fontWeight: 600, fontSize: 'var(--font-size-small)', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
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
              <span style={{ display: 'block', fontWeight: 600, fontSize: 'var(--font-size-small)', color: 'var(--text-primary)' }}>
                குரல் ஒலி / Voice Speech:
              </span>
              <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--text-secondary)' }}>
                {voiceMuted ? 'ஒலி முடக்கப்பட்டுள்ளது (Muted)' : 'இயக்கத்தில் உள்ளது (Active)'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setVoiceMuted(!voiceMuted)}
              className="ios-btn ios-btn-secondary"
              style={{ minHeight: '38px', padding: '0.35rem 0.85rem', fontSize: 'var(--font-size-small)' }}
            >
              {voiceMuted ? <><IconVolume size={16} /> Unmute</> : <><IconVolumeMute size={16} /> Mute</>}
            </button>
          </div>
        </div>

        {/* Group 4: Session Controls */}
        <div className="ios-sheet-cell">
          <span style={{ display: 'block', fontWeight: 600, fontSize: 'var(--font-size-small)', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            அமர்வு கட்டுப்பாடு / Session Controls:
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {canResume && (
              <button
                type="button"
                onClick={() => {
                  onResume()
                  onClose()
                }}
                className="ios-btn ios-btn-primary ios-btn-block"
              >
                <IconPlay size={16} /> உரையாடலைத் தொடரவும் / Resume
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
              <IconRefresh size={16} /> அமர்வை மீட்டமை / Restart
            </button>

            <button
              type="button"
              onClick={() => {
                onClearData()
                onClose()
              }}
              className="ios-btn ios-btn-no ios-btn-block"
            >
              <IconTrash size={16} /> விவரங்களை அழி / Clear Memory
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
