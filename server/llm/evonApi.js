// Route B: Evon API (Gnani Closed Beta)
// Status: NOT CONFIGURED (Awaiting beta access and API documentation)

export function isConfigured() {
  const apiUrl = process.env.EVON_API_URL
  const apiKey = process.env.EVON_API_KEY
  return Boolean(apiUrl && apiKey && apiUrl.trim() !== '' && apiKey.trim() !== '')
}

/**
 * Route B extractor client.
 * Throws a clear error when unconfigured as required by project constraints.
 */
export async function extract({ field, transcript, context = {} }) {
  if (!isConfigured()) {
    throw new Error('Evon API not configured: no API endpoint or credentials provided in documentation')
  }

  // Code skeleton for future integration once docs are provided
  const startTime = Date.now()
  const apiUrl = process.env.EVON_API_URL
  const apiKey = process.env.EVON_API_KEY

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)

  try {
    // When docs are pasted, configure endpoint, model, and headers here
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ field, transcript, context }),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Evon API responded with status ${response.status}`)
    }

    const data = await response.json()
    return {
      value: data.value,
      confidence: data.confidence ?? 0.8,
      needsConfirmation: Boolean(data.needsConfirmation),
      isCorrection: Boolean(data.isCorrection),
      command: data.command || null,
      reason: data.reason || 'Extracted via Evon API',
      latencyMs: Date.now() - startTime,
      provider: 'evon-api',
    }
  } finally {
    clearTimeout(timer)
  }
}
