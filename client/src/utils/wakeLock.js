/**
 * Screen Wake Lock utility
 * Keeps screen awake during active kiosk sessions.
 * Feature-detected with graceful fallback.
 */

let wakeLockSentinel = null
let isLockRequested = false

export async function requestScreenWakeLock() {
  if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
    return false
  }

  try {
    isLockRequested = true
    if (!wakeLockSentinel || wakeLockSentinel.released) {
      wakeLockSentinel = await navigator.wakeLock.request('screen')
      wakeLockSentinel.addEventListener('release', () => {
        wakeLockSentinel = null
      })
    }
    return true
  } catch (_) {
    // Quiet fallback if permission is denied or device low battery
    wakeLockSentinel = null
    return false
  }
}

export async function releaseScreenWakeLock() {
  isLockRequested = false
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release()
    } catch (_) {}
    wakeLockSentinel = null
  }
}

// Re-request wake lock if tab regains focus during active session
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && isLockRequested && !wakeLockSentinel) {
      await requestScreenWakeLock()
    }
  })
}
