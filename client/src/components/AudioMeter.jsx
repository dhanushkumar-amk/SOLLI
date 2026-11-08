/**
 * AudioMeter Component — Acoustic Level Visualizer
 * Renders calibrated telemetry bars reacting smoothly to microphone volume.
 */
export default function AudioMeter({ level = 0, isRecording = false }) {
  if (!isRecording) return null

  // 12 calibrated acoustic profile weights
  const weights = [0.2, 0.45, 0.7, 0.9, 1.0, 0.85, 0.75, 0.95, 0.8, 0.6, 0.4, 0.25]
  const pct = Math.min(100, Math.round(level * 100))

  return (
    <div
      className="solli-audio-telemetry"
      role="meter"
      aria-label="Microphone volume"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {weights.map((w, i) => {
        // Base height 3px, max 20px dynamically scaled by voice level
        const h = Math.max(3, Math.min(22, Math.round(w * level * 28 + 3)))
        return (
          <span
            key={i}
            className="solli-audio-bar"
            style={{ height: `${h}px` }}
          />
        )
      })}
    </div>
  )
}
