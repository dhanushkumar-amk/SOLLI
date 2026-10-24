import assert from 'node:assert/strict'
import test, { afterEach, beforeEach } from 'node:test'
import { GNANI_CONFIG } from '../config.js'
import { speak, transcribe } from '../gnani.js'

const FAKE_KEY = 'vach_test_fake_secret_key_123456789'

test('Gnani AI Client Tests', async (t) => {
  const originalFetch = globalThis.fetch
  const originalEnvKey = process.env.GNANI_API_KEY

  beforeEach(() => {
    process.env.GNANI_API_KEY = FAKE_KEY
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    process.env.GNANI_API_KEY = originalEnvKey
  })

  await t.test('transcribe sends correct X-API-Key-ID header and parses response', async () => {
    let capturedHeaders = null
    let capturedMethod = null
    let capturedUrl = null

    globalThis.fetch = async (url, options) => {
      capturedUrl = url
      capturedMethod = options.method
      capturedHeaders = options.headers
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          request_id: 'req_test123',
          timestamp: '20261024_120000.000',
          transcript: 'வணக்கம், என் பெயர் குமார்',
        }),
      }
    }

    const dummyAudio = Buffer.from('RIFF....WAVEfmt ....data....')
    const result = await transcribe(dummyAudio, { language: 'ta-IN' })

    assert.equal(capturedUrl, `${GNANI_CONFIG.baseUrl}${GNANI_CONFIG.endpoints.stt}`)
    assert.equal(capturedMethod, 'POST')
    assert.equal(capturedHeaders['X-API-Key-ID'], FAKE_KEY)
    assert.equal(result.text, 'வணக்கம், என் பெயர் குமார்')
    assert.ok(result.latencyMs >= 0)
  })

  await t.test('speak sends correct headers and returns audioBuffer', async () => {
    let capturedHeaders = null
    let capturedBody = null

    globalThis.fetch = async (url, options) => {
      capturedHeaders = options.headers
      capturedBody = JSON.parse(options.body)
      return {
        ok: true,
        status: 200,
        headers: {
          get: (name) => (name.toLowerCase() === 'content-type' ? 'audio/wav' : null),
        },
        arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
      }
    }

    const result = await speak('வணக்கம்', { voice: 'Shivani', language: 'ta-IN' })

    assert.equal(capturedHeaders['X-API-Key-ID'], FAKE_KEY)
    assert.equal(capturedHeaders['Content-Type'], 'application/json')
    assert.equal(capturedBody.text, 'வணக்கம்')
    assert.equal(capturedBody.voice, 'Shivani')
    assert.equal(capturedBody.model, 'timbre-v3.0')
    assert.equal(result.mimeType, 'audio/wav')
    assert.equal(result.audioBuffer.length, 4)
  })

  await t.test('API key never appears in thrown errors on failure', async () => {
    globalThis.fetch = async () => {
      return {
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            message: `Invalid request containing secret ${FAKE_KEY}`,
          },
        }),
      }
    }

    const dummyAudio = Buffer.from('test audio')
    await assert.rejects(
      async () => {
        await transcribe(dummyAudio)
      },
      (err) => {
        assert.ok(!err.message.includes(FAKE_KEY), 'Error message must not include API key')
        assert.ok(err.message.includes('[REDACTED]'), 'Secret should be redacted')
        return true
      }
    )
  })

  await t.test('maps 401 to clear authentication error', async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'Unauthorized' } }),
    })

    await assert.rejects(
      async () => {
        await speak('test')
      },
      /authentication failed \(401\)/i
    )
  })

  await t.test('maps 429 to rate limit or credit exhausted error', async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'Rate limit exceeded' } }),
    })

    await assert.rejects(
      async () => {
        await speak('test')
      },
      /credit exhausted or rate limit reached \(429\)/i
    )
  })

  await t.test('maps 500 to server error', async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: 'Internal engine failure' } }),
    })

    await assert.rejects(
      async () => {
        await speak('test')
      },
      /server error \(500\)/i
    )
  })

  await t.test('timeout abort triggers clear timeout error', async () => {
    globalThis.fetch = async (_url, { signal }) => {
      return new Promise((_, reject) => {
        signal.addEventListener('abort', () => {
          const abortError = new Error('The operation was aborted')
          abortError.name = 'AbortError'
          reject(abortError)
        })
      })
    }

    // Override timeoutMs for test speed
    const originalTimeout = GNANI_CONFIG.timeoutMs
    GNANI_CONFIG.timeoutMs = 50

    try {
      await assert.rejects(
        async () => {
          await speak('test')
        },
        /timed out after 50ms/i
      )
    } finally {
      GNANI_CONFIG.timeoutMs = originalTimeout
    }
  })
})
