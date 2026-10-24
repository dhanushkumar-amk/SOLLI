import assert from 'node:assert/strict'
import test, { describe } from 'node:test'
import { handlePartialCorrection } from '../llm/commands/partial.js'

describe('In-Answer Partial & Digit Corrections (commands.partial.test.js)', () => {
  const phoneField = { id: 'phone', type: 'phone' }
  const aadhaarField = { id: 'aadhaar', type: 'aadhaar' }
  const textField = { id: 'village', type: 'text' }

  describe('Digit-Level Corrections on Numbers', () => {
    test('edits last digit: "last digit is 7"', () => {
      const res = handlePartialCorrection('last digit is 7', {
        currentValue: '9840123456',
        field: phoneField,
      })
      assert.equal(res.handled, true)
      assert.equal(res.value, '9840123457')
      assert.equal(res.needsConfirmation, true)
    })

    test('edits last digit with Tamil word: "kadasila 3"', () => {
      const res = handlePartialCorrection('kadasila 3', {
        currentValue: '9840123450',
        field: phoneField,
      })
      assert.equal(res.handled, true)
      assert.equal(res.value, '9840123453')
      assert.equal(res.needsConfirmation, true)
    })

    test('edits first digit: "first digit is 8"', () => {
      const res = handlePartialCorrection('first digit is 8', {
        currentValue: '9840123456',
        field: phoneField,
      })
      assert.equal(res.handled, true)
      assert.equal(res.value, '8840123456')
      assert.equal(res.needsConfirmation, true)
    })

    test('edits ordinal digit: "third digit is 5"', () => {
      const res = handlePartialCorrection('third digit is 5', {
        currentValue: '9840123456', // index 2 is '4' -> changes to '5'
        field: phoneField,
      })
      assert.equal(res.handled, true)
      assert.equal(res.value, '9850123456')
      assert.equal(res.needsConfirmation, true)
    })

    test('edits 12-digit Aadhaar last digit', () => {
      const res = handlePartialCorrection('last digit is 9', {
        currentValue: '123456789012',
        field: aadhaarField,
      })
      assert.equal(res.handled, true)
      assert.equal(res.value, '123456789019')
      assert.equal(res.needsConfirmation, true)
    })

    test('rejects digit-level edit on non-numeric text fields', () => {
      const res = handlePartialCorrection('last digit is 7', {
        currentValue: 'Madurai',
        field: textField,
      })
      assert.equal(res.handled, false)
    })

    test('rejects digit edit if no currentValue is present', () => {
      const res = handlePartialCorrection('last digit is 7', {
        currentValue: null,
        field: phoneField,
      })
      assert.equal(res.handled, false)
    })
  })

  describe('Whole-Value Contrast Corrections', () => {
    test('resolves "the village is Salem, not Madurai" to "Salem"', () => {
      const res = handlePartialCorrection('the village is Salem, not Madurai', {
        currentValue: 'Madurai',
        field: textField,
      })
      assert.equal(res.handled, true)
      assert.equal(res.value, 'Salem')
      assert.equal(res.needsConfirmation, true)
    })

    test('resolves Tamil contrast: "Madurai illa Salem" to "Salem"', () => {
      const res = handlePartialCorrection('Madurai illa Salem', {
        currentValue: 'Madurai',
        field: textField,
      })
      assert.equal(res.handled, true)
      assert.equal(res.value, 'Salem')
      assert.equal(res.needsConfirmation, true)
    })

    test('resolves spoken numeric contrast: "three kilo-la illai, two"', () => {
      const res = handlePartialCorrection('three kilola illai two', {
        currentValue: '3',
        field: { id: 'rice_kg', type: 'number' },
      })
      assert.equal(res.handled, true)
      assert.equal(res.value, 'two')
      assert.equal(res.needsConfirmation, true)
    })
  })

  describe('Unparseable and Safe Fallback', () => {
    test('returns { handled: false } for vague statement', () => {
      const res = handlePartialCorrection('something is completely wrong here', {
        currentValue: 'Madurai',
        field: textField,
      })
      assert.equal(res.handled, false)
    })

    test('returns { handled: false } for empty or whitespace input', () => {
      assert.equal(handlePartialCorrection('').handled, false)
      assert.equal(handlePartialCorrection('   ').handled, false)
      assert.equal(handlePartialCorrection(null).handled, false)
    })
  })
})
