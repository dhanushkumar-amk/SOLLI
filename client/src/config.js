/**
 * Solli Client Configuration
 * Kiosk safety, feedback timing thresholds, and demo mode.
 */

// Kiosk privacy timeouts
export const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000 // 3 minutes idle before warning
export const INACTIVITY_WARNING_MS = 20 * 1000 // 20 seconds warning countdown before wiping memory

// Feedback timing thresholds
export const THINKING_DELAY_MS = 200 // Show visible thinking state within 200ms
export const LONG_WAIT_THRESHOLD_MS = 6 * 1000 // 6 seconds before showing "Taking longer than usual"

// Conversation limits
export const MAX_ATTEMPTS_PER_FIELD = 2
export const MAX_CONFIRM_ROUNDS = 3

// Demo mode flag (shows prominent demo banner on every screen)
export const IS_DEMO_MODE =
  import.meta.env.VITE_DEMO_MODE === 'true' || import.meta.env.VITE_DEMO_MODE === '1'
