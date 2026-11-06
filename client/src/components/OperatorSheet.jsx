import {
  X,
  Settings,
  Play,
  RotateCcw,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react'

/**
 * OperatorSheet Component (Modern Shadcn Sheet)
 * Slides up when the operator taps settings.
 * In-memory settings only.
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
      className="solli-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="operator-sheet-title"
      onClick={onClose}
    >
      <div
        className="solli-sheet-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="solli-sheet-handle" aria-hidden="true" />

        {/* Sheet Header */}
        <div className="solli-sheet-header">
          <div className="solli-sheet-title-group">
            <div className="solli-sheet-icon">
              <Settings size={18} />
            </div>
            <div>
              <h2 id="operator-sheet-title" className="solli-sheet-title">
                பணியாளர் அமைப்புகள்
              </h2>
              <span className="solli-sheet-subtitle">
                Operator Settings (In-Memory Only)
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="solli-icon-btn solli-icon-btn--light"
            aria-label="Close operator settings"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="solli-sheet-body">
          {/* Group 1: Font Size */}
          <div className="solli-sheet-cell">
            <label className="solli-sheet-label">
              எழுத்து அளவு / Font Scale:
            </label>
            <div className="solli-segmented">
              <button
                type="button"
                className={`solli-seg-btn ${fontSize === 'normal' ? 'solli-seg-btn--active' : ''}`}
                onClick={() => setFontSize('normal')}
              >
                Compact (14px)
              </button>
              <button
                type="button"
                className={`solli-seg-btn ${fontSize === 'large' ? 'solli-seg-btn--active' : ''}`}
                onClick={() => setFontSize('large')}
              >
                Large (16px)
              </button>
              <button
                type="button"
                className={`solli-seg-btn ${fontSize === 'xlarge' ? 'solli-seg-btn--active' : ''}`}
                onClick={() => setFontSize('xlarge')}
              >
                X-Large (18px)
              </button>
            </div>
          </div>

          {/* Group 2: Contrast */}
          <div className="solli-sheet-cell">
            <label className="solli-sheet-label">
              மாறுபட்ட வண்ணம் / Contrast:
            </label>
            <div className="solli-segmented">
              <button
                type="button"
                className={`solli-seg-btn ${contrast === 'normal' ? 'solli-seg-btn--active' : ''}`}
                onClick={() => setContrast('normal')}
              >
                இயல்பு (Normal)
              </button>
              <button
                type="button"
                className={`solli-seg-btn ${contrast === 'high' ? 'solli-seg-btn--active' : ''}`}
                onClick={() => setContrast('high')}
              >
                உயர் மாறுபாடு (High)
              </button>
            </div>
          </div>

          {/* Group 3: Voice Audio Mute */}
          <div className="solli-sheet-cell">
            <div className="solli-sheet-flex">
              <div>
                <span className="solli-sheet-label">
                  குரல் ஒலி / Voice Speech:
                </span>
                <span className="solli-sheet-hint">
                  {voiceMuted ? 'ஒலி முடக்கப்பட்டுள்ளது (Muted)' : 'இயக்கத்தில் உள்ளது (Active)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setVoiceMuted(!voiceMuted)}
                className="solli-btn solli-btn-ghost"
              >
                {voiceMuted ? <><Volume2 size={16} /> Unmute</> : <><VolumeX size={16} /> Mute</>}
              </button>
            </div>
          </div>

          {/* Group 4: Session Controls */}
          <div className="solli-sheet-cell">
            <label className="solli-sheet-label">
              அமர்வு கட்டுப்பாடு / Session Controls:
            </label>
            <div className="solli-sheet-actions">
              {canResume && (
                <button
                  type="button"
                  onClick={() => {
                    onResume()
                    onClose()
                  }}
                  className="solli-btn solli-btn-primary solli-btn-block"
                >
                  <Play size={16} /> உரையாடலைத் தொடரவும் / Resume
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onRestart()
                  onClose()
                }}
                className="solli-btn solli-btn-ghost solli-btn-block"
              >
                <RotateCcw size={16} /> அமர்வை மீட்டமை / Restart
              </button>

              <button
                type="button"
                onClick={() => {
                  onClearData()
                  onClose()
                }}
                className="solli-btn solli-btn-confirm-no solli-btn-block"
              >
                <Trash2 size={16} /> விவரங்களை அழி / Clear Memory
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
