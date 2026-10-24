import assert from 'node:assert/strict'
import test, { beforeEach, describe } from 'node:test'
import {
  clearTtsCache,
  getCachedAudio,
  getTtsCacheSize,
  setCachedAudio,
} from '../ttsCache.js'

describe('TTS Cache Unit Tests', () => {
  beforeEach(() => {
    clearTtsCache()
  })

  test('returns null on cache miss', () => {
    const cached = getCachedAudio('பெயர் என்ன?', { voice: 'female', language: 'ta-IN' })
    assert.equal(cached, null)
    assert.equal(getTtsCacheSize(), 0)
  })

  test('stores audio and returns cache hit on second identical request', () => {
    const text = 'உங்கள் பெயர் என்ன?'
    const fakeAudio = {
      audioBuffer: Buffer.from([1, 2, 3, 4]),
      mimeType: 'audio/wav',
      latencyMs: 120,
    }

    setCachedAudio(text, { voice: 'female', language: 'ta-IN' }, fakeAudio)
    assert.equal(getTtsCacheSize(), 1)

    const hit = getCachedAudio(text, { voice: 'female', language: 'ta-IN' })
    assert.ok(hit)
    assert.deepEqual(hit.audioBuffer, fakeAudio.audioBuffer)
    assert.equal(hit.mimeType, 'audio/wav')
    assert.equal(hit.latencyMs, 120)
  })

  test('differentiates by voice or language', () => {
    const text = 'வணக்கம்'
    const audioTa = { audioBuffer: Buffer.from([10, 20]), mimeType: 'audio/wav', latencyMs: 50 }
    setCachedAudio(text, { voice: 'female', language: 'ta-IN' }, audioTa)

    // Different language
    assert.equal(getCachedAudio(text, { voice: 'female', language: 'en-IN' }), null)
    // Different voice
    assert.equal(getCachedAudio(text, { voice: 'male', language: 'ta-IN' }), null)
  })

  test('sensitive text is NEVER cached (reads and writes bypassed)', () => {
    const sensitiveText = 'உங்கள் ஆதார் எண் 1234 5678 9012'
    const fakeAudio = { audioBuffer: Buffer.from([9, 9, 9]), mimeType: 'audio/wav', latencyMs: 80 }

    // Attempt to cache with sensitive: true
    setCachedAudio(sensitiveText, { voice: 'female', language: 'ta-IN', sensitive: true }, fakeAudio)
    assert.equal(getTtsCacheSize(), 0)

    // Attempt to read with sensitive: true
    const res = getCachedAudio(sensitiveText, { voice: 'female', language: 'ta-IN', sensitive: true })
    assert.equal(res, null)
  })

  test('evicts oldest entry when reaching max capacity', () => {
    // Fill up to 100 entries
    for (let i = 0; i < 100; i++) {
      setCachedAudio(`prompt-${i}`, { voice: 'v', language: 'ta' }, {
        audioBuffer: Buffer.from([i]),
        mimeType: 'audio/wav',
        latencyMs: 10,
      })
    }
    assert.equal(getTtsCacheSize(), 100)

    // Add 101st entry
    setCachedAudio('prompt-100', { voice: 'v', language: 'ta' }, {
      audioBuffer: Buffer.from([100]),
      mimeType: 'audio/wav',
      latencyMs: 10,
    })
    assert.equal(getTtsCacheSize(), 100)

    // Oldest entry (prompt-0) should have been evicted
    assert.equal(getCachedAudio('prompt-0', { voice: 'v', language: 'ta' }), null)
    // Recent entry should exist
    assert.ok(getCachedAudio('prompt-100', { voice: 'v', language: 'ta' }))
  })
})
