import { useState } from 'react'
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
 * OperatorBar Component
 * Unobtrusive header allowing staff to adjust font size,
 * toggle contrast, mute TTS audio, resume paused sessions, or clear answers.
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
          <IconGear size={16} />
          <span>பணியாளர் / Operator</span>
        </button>
      </div>

      {isOpen && (
        <section
          id="operator-panel"
          className="operator-drawer"
          aria-label="Operator assistance options"
          style={{ width: '100%', marginTop: '0.5rem' }}
        >
          <div className="operator-drawer-title">
            <span>பணியாளர் அமைப்புகள் / Operator Assistance</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-tertiary)' }}>
              (Session memory only)
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
                  Compact (14px)
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={fontSize === 'large'}
                  className={`operator-pill-btn ${fontSize === 'large' ? 'active' : ''}`}
                  onClick={() => setFontSize('large')}
                >
                  Large (16px)
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={fontSize === 'xlarge'}
                  className={`operator-pill-btn ${fontSize === 'xlarge' ? 'active' : ''}`}
                  onClick={() => setFontSize('xlarge')}
                >
                  X-Large (18px)
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
                  இயல்பு (Normal)
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={contrast === 'high'}
                  className={`operator-pill-btn ${contrast === 'high' ? 'active' : ''}`}
                  onClick={() => setContrast('high')}
                >
                  உயர் மாறுபாடு (High)
                </button>
              </div>
            </div>

            {/* Audio Mute Toggle */}
            <div className="operator-setting-group">
              <span className="operator-label">ஒலி / Voice:</span>
              <button
                type="button"
                className="operator-pill-btn"
                onClick={() => setVoiceMuted(!voiceMuted)}
              >
                {voiceMuted ? <><IconVolume size={14} /> Unmute</> : <><IconVolumeMute size={14} /> Mute</>}
              </button>
            </div>

            {/* Session Action Controls */}
            <div className="operator-setting-group">
              <span className="operator-label">அமர்வு / Session:</span>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {canResume && (
                  <button
                    type="button"
                    className="operator-pill-btn active"
                    onClick={onResume}
                  >
                    <IconPlay size={14} /> Resume
                  </button>
                )}
                <button
                  type="button"
                  className="operator-pill-btn"
                  onClick={onRestart}
                >
                  <IconRefresh size={14} /> Restart
                </button>
                <button
                  type="button"
                  className="operator-pill-btn"
                  style={{ color: 'var(--danger-red)' }}
                  onClick={onClearData}
                >
                  <IconTrash size={14} /> Clear
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </header>
  )
}
