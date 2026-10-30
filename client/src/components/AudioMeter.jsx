/**
 * AudioMeter Component
 * Displays a lightweight volume meter when microphone recording is active.
 * Level is normalized between 0 and 1.
 */
export default function AudioMeter({ level = 0, isRecording = false }) {
  if (!isRecording) return null

  const percentage = Math.min(100, Math.round(level * 100))

  return (
    <div
      className="audio-meter-bar"
      role="progressbar"
      aria-label="Microphone volume level"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="audio-meter-fill"
        style={{ width: `${Math.max(6, percentage)}%` }}
      />
    </div>
  )
}
