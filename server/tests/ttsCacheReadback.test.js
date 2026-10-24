import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { STATIC_CONFIRM_PROMPT } from '../forms/formEngine.js'
import { clearTtsCache, getCachedAudio, getTtsCacheSize, setCachedAudio } from '../ttsCache.js'

describe('TTS Cache Read-back Rules (ttsCacheReadback.test.js)', () => {
  beforeEach(() => {
    clearTtsCache()
  })

  it('read-back text with a dynamic value is NEVER cached (noCache: true / sensitive: true)', () => {
    const dynamicValueReadback = 'உங்கள் பெயர் ரங்கநாதன்.'
    const fakeAudio = {
      audioBuffer: Buffer.from([1, 2, 3]),
      mimeType: 'audio/wav',
      latencyMs: 150,
    }

    // 1. Attempt to set cache with noCache: true
    setCachedAudio(
      dynamicValueReadback,
      { voice: 'Shivani', language: 'ta-IN', noCache: true },
      fakeAudio
    )
    assert.equal(getTtsCacheSize(), 0, 'Dynamic value readback should not be written to cache')

    // 2. Attempt to read cache
    const cached = getCachedAudio(dynamicValueReadback, {
      voice: 'Shivani',
      language: 'ta-IN',
      noCache: true,
    })
    assert.equal(cached, null, 'Cache lookup for dynamic value readback should return null')

    // 3. Attempt with sensitive: true (for numbers / identifiers)
    const phoneReadback = 'எண் ஒன்பது எட்டு ஏழு ஆறு ஐந்து.'
    setCachedAudio(
      phoneReadback,
      { voice: 'Shivani', language: 'ta-IN', sensitive: true },
      fakeAudio
    )
    assert.equal(getTtsCacheSize(), 0, 'Sensitive readback should not be written to cache')
  })

  it('static confirmation questions ARE cached (cache MISS then cache HIT)', () => {
    const staticQuestion = STATIC_CONFIRM_PROMPT.ta // 'இது சரியா? ஆம் அல்லது இல்லை என்று சொல்லுங்கள்.'
    const fakeAudio = {
      audioBuffer: Buffer.from([10, 20, 30, 40]),
      mimeType: 'audio/wav',
      latencyMs: 120,
    }

    // 1. Initial check: Cache MISS
    const miss = getCachedAudio(staticQuestion, {
      voice: 'Shivani',
      language: 'ta-IN',
      sensitive: false,
      noCache: false,
    })
    assert.equal(miss, null, 'First call should be a cache MISS')

    // 2. Save static prompt to cache
    setCachedAudio(
      staticQuestion,
      { voice: 'Shivani', language: 'ta-IN', sensitive: false, noCache: false },
      fakeAudio
    )
    assert.equal(getTtsCacheSize(), 1, 'Static prompt should be successfully cached')

    // 3. Subsequent check: Cache HIT!
    const hit = getCachedAudio(staticQuestion, {
      voice: 'Shivani',
      language: 'ta-IN',
      sensitive: false,
      noCache: false,
    })
    assert.ok(hit, 'Subsequent call should be a cache HIT')
    assert.deepEqual(hit.audioBuffer, fakeAudio.audioBuffer)
  })

  it('English static prompt is also cached independently', () => {
    const staticQuestionEn = STATIC_CONFIRM_PROMPT.en // 'Is this correct? Please say yes or no.'
    const fakeAudio = {
      audioBuffer: Buffer.from([55, 66]),
      mimeType: 'audio/wav',
      latencyMs: 90,
    }

    setCachedAudio(
      staticQuestionEn,
      { voice: 'Shivani', language: 'en-IN', sensitive: false, noCache: false },
      fakeAudio
    )
    const hit = getCachedAudio(staticQuestionEn, {
      voice: 'Shivani',
      language: 'en-IN',
      sensitive: false,
      noCache: false,
    })
    assert.ok(hit)
    assert.deepEqual(hit.audioBuffer, fakeAudio.audioBuffer)
  })
})
