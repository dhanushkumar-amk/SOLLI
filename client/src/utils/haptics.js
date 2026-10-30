/**
 * Haptic feedback utility using Vibration API
 * Feature-detected, safe, no-op if unsupported.
 */
export function triggerHaptic(duration = 30) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(duration)
    } catch (_) {
      // Ignored if user has disabled haptics or browser prevents vibration
    }
  }
}
