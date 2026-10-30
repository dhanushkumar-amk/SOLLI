import { useState } from 'react'

/**
 * OperatorBar Component
 * Collapsed by default. Unobtrusive drawer allowing staff to adjust font size,
 * toggle high-contrast, mute TTS audio, resume paused sessions, or clear answers.
 * All settings are stored strictly in component state (in memory), never in storage.
 */
export default function OperatorBar({
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
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="operator-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="operator-toggle-btn"
          aria-expanded={isOpen}
          aria-controls="operator-panel"
          aria-label="Toggle operator options panel"
        >
          <span aria-hidden="true">⚙️</span>
          <span>பணியாளர் / Operator</span>
          <span aria-hidden="true">{isOpen ? '▲' : '▼'}</span>
        </button>
      </div>

      {isOpen && (
        <section
          id="operator-panel"
          className="operator-drawer"
          aria-label="Operator assistance options"
          style={{ width: '100%', marginTop: '0.75rem' }}
        >
          <div className="operator-drawer-title">
            <span>⚙️ பணியாளர் அமைப்புகள் / Operator Assistance Settings</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>
              (தற்காலிகமானது / Session memory only)
            </span>
          </div>

          <div className="operator-grid">
            {/* Font Size Selector */}
            <div className="operator-setting-group">
              <span className="operator-label" id="font-size-label">
                எழுத்து அளவு / Font Size:
              </span>
              <div
                className="operator-btn-group"
                role="radiogroup"
                aria-labelledby="font-size-label"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={fontSize === 'normal'}
                  className={`operator-pill-btn ${fontSize === 'normal' ? 'active' : ''}`}
                  onClick={() => setFontSize('normal')}
                >
                  சாதாரண (20px)
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={fontSize === 'large'}
                  className={`operator-pill-btn ${fontSize === 'large' ? 'active' : ''}`}
                  onClick={() => setFontSize('large')}
                >
                  பெரியது (23px)
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={fontSize === 'xlarge'}
                  className={`operator-pill-btn ${fontSize === 'xlarge' ? 'active' : ''}`}
                  onClick={() => setFontSize('xlarge')}
                >
                  மிகப் பெரியது (26px)
                </button>
              </div>
            </div>

            {/* High Contrast Mode Toggle */}
            <div className="operator-setting-group">
              <span className="operator-label" id="contrast-label">
                மாறுபட்ட வண்ணம் / Contrast:
              </span>
              <div
                className="operator-btn-group"
                role="radiogroup"
                aria-labelledby="contrast-label"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={contrast === 'normal'}
                  className={`operator-pill-btn ${contrast === 'normal' ? 'active' : ''}`}
                  onClick={() => setContrast('normal')}
                >
                  இயல்பு / Normal
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={contrast === 'high'}
                  className={`operator-pill-btn ${contrast === 'high' ? 'active' : ''}`}
                  onClick={() => setContrast('high')}
                >
                  உயர் மாறுபாடு / High Contrast
                </button>
              </div>
            </div>

            {/* Voice Mute Toggle */}
            <div className="operator-setting-group">
              <span className="operator-label">குரல் ஒலி / Voice Output:</span>
              <div className="operator-btn-group">
                <button
                  type="button"
                  className={`operator-pill-btn ${voiceMuted ? 'active' : ''}`}
                  onClick={() => setVoiceMuted(!voiceMuted)}
                  aria-pressed={voiceMuted}
                >
                  {voiceMuted ? '🔇 குரல் முடக்கப்பட்டது (Muted)' : '🔊 குரல் இயக்கத்தில் உள்ளது (Active)'}
                </button>
              </div>
            </div>

            {/* Quick Session Actions */}
            <div className="operator-setting-group">
              <span className="operator-label">அமர்வு கட்டுப்பாடு / Session Controls:</span>
              <div className="operator-btn-group">
                {canResume && (
                  <button
                    type="button"
                    className="operator-pill-btn"
                    style={{ backgroundColor: 'var(--brand-primary)', color: '#ffffff' }}
                    onClick={onResume}
                  >
                    ▶️ தொடரவும் / Resume
                  </button>
                )}
                <button
                  type="button"
                  className="operator-pill-btn"
                  onClick={onRestart}
                >
                  🔄 மீட்டமை / Restart
                </button>
                <button
                  type="button"
                  className="operator-pill-btn"
                  style={{ color: 'var(--color-no)', borderColor: 'var(--color-no-border)' }}
                  onClick={onClearData}
                >
                  🗑️ விவரங்களை அழி / Clear Memory
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </header>
  )
}
