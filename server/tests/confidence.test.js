import assert from 'node:assert/strict'
import test, { describe } from 'node:test'
import { CONFIRM_THRESHOLD } from '../config.js'
import { evaluateConfidenceAndConfirmation } from '../llm/confidence.js'

describe('Confidence & Confirmation Policy Unit Tests', () => {
  test('CONFIRM_THRESHOLD defaults to 0.8', () => {
    assert.equal(CONFIRM_THRESHOLD, 0.8)
  })

  test('confidence < CONFIRM_THRESHOLD triggers needsConfirmation=true when if_uncertain', () => {
    const res = evaluateConfidenceAndConfirmation({
      value: 'SomeValue',
      baseConfidence: 0.75,
      fieldDef: { confirm: 'if_uncertain' },
    })
    assert.equal(res.needsConfirmation, true)
  })

  test('confidence >= CONFIRM_THRESHOLD does NOT trigger needsConfirmation when if_uncertain', () => {
    const res = evaluateConfidenceAndConfirmation({
      value: 'SomeValue',
      baseConfidence: 0.9,
      fieldDef: { confirm: 'if_uncertain' },
    })
    assert.equal(res.needsConfirmation, false)
  })

  test('confirm="always" forces needsConfirmation=true regardless of high confidence', () => {
    const res = evaluateConfidenceAndConfirmation({
      value: 'K. Muthulakshmi',
      baseConfidence: 0.99,
      fieldDef: { confirm: 'always' },
    })
    assert.equal(res.needsConfirmation, true)
  })

  test('confirm="never" forces needsConfirmation=false', () => {
    const res = evaluateConfidenceAndConfirmation({
      value: 'SomeNote',
      baseConfidence: 0.6,
      fieldDef: { confirm: 'never' },
    })
    assert.equal(res.needsConfirmation, false)
  })

  test('detected self-correction triggers needsConfirmation=true', () => {
    const res = evaluateConfidenceAndConfirmation({
      value: 'May 5 1958',
      baseConfidence: 0.95,
      isCorrection: true,
      fieldDef: { confirm: 'if_uncertain' },
    })
    assert.equal(res.needsConfirmation, true)
  })

  test('validation failure applies confidence penalty', () => {
    const res = evaluateConfidenceAndConfirmation({
      value: '12345',
      baseConfidence: 0.9,
      valid: false,
    })
    assert.ok(res.confidence <= 0.4)
  })
})
