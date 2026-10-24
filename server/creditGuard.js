// Credit protection guard for Gnani API live calls
// Soft limit to prevent runaway loops or credit exhaustion

const ONE_HOUR_MS = 60 * 60 * 1000

// Array of timestamps (in ms) of live external API calls within the last hour
const liveCallTimestamps = []

export function getMaxLiveCallsPerHour() {
  const envVal = Number(process.env.MAX_LIVE_CALLS_PER_HOUR)
  return Number.isFinite(envVal) && envVal > 0 ? envVal : 120
}

/**
 * Prunes timestamps older than 1 hour
 */
function pruneOldCalls(now = Date.now()) {
  const cutoff = now - ONE_HOUR_MS
  while (liveCallTimestamps.length > 0 && liveCallTimestamps[0] < cutoff) {
    liveCallTimestamps.shift()
  }
}

/**
 * Checks if a live API call is permitted under the hourly rate limit
 * Throws 429 error if limit is exceeded.
 */
export function assertLiveCallAllowed() {
  const now = Date.now()
  pruneOldCalls(now)
  const maxAllowed = getMaxLiveCallsPerHour()

  if (liveCallTimestamps.length >= maxAllowed) {
    const error = new Error(
      `Live API hourly limit reached (${maxAllowed} calls/hr). Please ask the operator for help or wait before retrying.`
    )
    error.status = 429
    error.statusCode = 429
    throw error
  }
}

/**
 * Records that a live external API call took place
 */
export function recordLiveCall() {
  liveCallTimestamps.push(Date.now())
}

/**
 * Returns count of live calls made in the current sliding hour
 */
export function getLiveCallsInLastHour() {
  pruneOldCalls()
  return liveCallTimestamps.length
}

/**
 * Resets call tracker (for testing)
 */
export function resetLiveCallTracker() {
  liveCallTimestamps.length = 0
}
