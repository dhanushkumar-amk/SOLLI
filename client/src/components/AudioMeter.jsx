/**
 * AudioMeter Component (Flutter Mobile Audio Waveform Style)
 * Displays a sleek audio wave meter when recording is active.
 */
export default function AudioMeter({ level = 0, isRecording = false }) {
  if (!isRecording) return null

  const percentage = Math.min(100, Math.round(level * 100))

  return (
    <div
      className="ios-audio-bar"
      role="progressbar"
      aria-label="Microphone volume"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="ios-audio-bar-fill"
        style={{ width: `${Math.max(10, percentage)}%` }}
      />
    </div>
  )
}
