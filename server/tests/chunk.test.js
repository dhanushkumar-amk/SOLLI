import { describe, it } from 'node:test'
import assert from 'node:assert'
import { groupDigits, buildDigitReadback, checkPartialCapture } from '../llm/numbers/chunk.js'

describe('Digit Chunking, Grouping, and Readback Tests', () => {
  it('groups 10-digit phone number as 5 + 5 by default', () => {
    const groups = groupDigits('9876543210', 'phone')
    assert.deepStrictEqual(groups, ['98765', '43210'])
  })

  it('groups 10-digit phone number as 3 + 3 + 4 when configured', () => {
    const groups = groupDigits('9876543210', 'phone', { phoneStyle: '3+3+4' })
    assert.deepStrictEqual(groups, ['987', '654', '3210'])
  })

  it('groups 12-digit Aadhaar number into 4 + 4 + 4', () => {
    const groups = groupDigits('123456789012', 'aadhaar')
    assert.deepStrictEqual(groups, ['1234', '5678', '9012'])
  })

  it('groups 15-digit bank account into groups of 4', () => {
    const groups = groupDigits('123456789012345', 'bank_account')
    assert.deepStrictEqual(groups, ['1234', '5678', '9012', '345'])
  })

  it('builds English readback with group pauses (commas)', () => {
    const spoken = buildDigitReadback('9876543210', 'en', 'phone')
    assert.strictEqual(
      spoken,
      'nine eight seven six five, four three two one zero'
    )
  })

  it('builds Tamil readback with group pauses (commas)', () => {
    const spoken = buildDigitReadback('9876543210', 'ta', 'phone')
    assert.strictEqual(
      spoken,
      'ஒன்பது எட்டு ஏழு ஆறு ஐந்து, நான்கு மூன்று இரண்டு ஒன்று பூஜ்ஜியம்'
    )
  })

  it('detects partial capture when fewer digits provided', () => {
    const res = checkPartialCapture('987654', 10)
    assert.strictEqual(res.partial, true)
    assert.strictEqual(res.have, 6)
    assert.strictEqual(res.need, 4)
    assert.strictEqual(res.prompt.en, 'I heard 6 digits. Please say the remaining 4.')
    assert.strictEqual(res.prompt.ta, '6 எண்கள் கேட்டன. மீதமுள்ள 4 எண்களை சொல்லுங்கள்.')
  })

  it('returns partial false when exact digits provided', () => {
    const res = checkPartialCapture('9876543210', 10)
    assert.strictEqual(res.partial, false)
    assert.strictEqual(res.have, 10)
    assert.strictEqual(res.need, 0)
    assert.strictEqual(res.prompt, null)
  })
})
