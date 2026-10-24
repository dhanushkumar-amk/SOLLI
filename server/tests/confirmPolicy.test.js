import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { shouldConfirm } from '../forms/confirmPolicy.js'

describe('Confirmation Policy (confirmPolicy.js)', () => {
  const threshold = 0.8

  describe('field.confirm === "always"', () => {
    const field = { id: 'phone', confirm: 'always', type: 'phone' }

    it('confirms when confidence is high (1.0)', () => {
      const res = { valid: true, confidence: 1.0, needsConfirmation: false, isCorrection: false }
      assert.equal(shouldConfirm(field, res, threshold), true)
    })

    it('confirms when confidence is low (0.4)', () => {
      const res = { valid: true, confidence: 0.4, needsConfirmation: true, isCorrection: false }
      assert.equal(shouldConfirm(field, res, threshold), true)
    })

    it('confirms even if correction was detected', () => {
      const res = { valid: true, confidence: 0.95, needsConfirmation: false, isCorrection: true }
      assert.equal(shouldConfirm(field, res, threshold), true)
    })
  })

  describe('field.confirm === "if_uncertain"', () => {
    const field = { id: 'parent_spouse_name', confirm: 'if_uncertain', type: 'name' }

    it('does NOT confirm when extraction is valid and confident (>= 0.8) without correction', () => {
      const res = { valid: true, confidence: 0.9, needsConfirmation: false, isCorrection: false }
      assert.equal(shouldConfirm(field, res, threshold), false)
    })

    it('confirms when confidence is below threshold (< 0.8)', () => {
      const res = { valid: true, confidence: 0.75, needsConfirmation: false, isCorrection: false }
      assert.equal(shouldConfirm(field, res, threshold), true)
    })

    it('confirms when needsConfirmation flag is true', () => {
      const res = { valid: true, confidence: 0.95, needsConfirmation: true, isCorrection: false }
      assert.equal(shouldConfirm(field, res, threshold), true)
    })

    it('confirms when a self-correction was detected', () => {
      const res = { valid: true, confidence: 0.95, needsConfirmation: false, isCorrection: true }
      assert.equal(shouldConfirm(field, res, threshold), true)
    })

    it('confirms when value is invalid', () => {
      const res = { valid: false, confidence: 0.9, needsConfirmation: false, isCorrection: false }
      assert.equal(shouldConfirm(field, res, threshold), true)
    })
  })

  describe('field.confirm === "never"', () => {
    const field = { id: 'village', confirm: 'never', type: 'text' }

    it('never confirms when valid, confident, and no correction', () => {
      const res = { valid: true, confidence: 0.95, needsConfirmation: false, isCorrection: false }
      assert.equal(shouldConfirm(field, res, threshold), false)
    })

    it('confirms if extraction is invalid', () => {
      const res = { valid: false, confidence: 0.9, needsConfirmation: false, isCorrection: false }
      assert.equal(shouldConfirm(field, res, threshold), true)
    })

    it('confirms if correction occurred even with confirm="never"', () => {
      const res = { valid: true, confidence: 0.95, needsConfirmation: false, isCorrection: true }
      assert.equal(shouldConfirm(field, res, threshold), true)
    })

    it('confirms if confidence is severely low (< 0.5)', () => {
      const res = { valid: true, confidence: 0.4, needsConfirmation: true, isCorrection: false }
      assert.equal(shouldConfirm(field, res, threshold), true)
    })
  })

  describe('Defaults & Edge cases', () => {
    it('defaults to if_uncertain if confirm property is missing', () => {
      const field = { id: 'generic' }
      const highConf = { valid: true, confidence: 0.9, needsConfirmation: false, isCorrection: false }
      assert.equal(shouldConfirm(field, highConf, threshold), false)

      const lowConf = { valid: true, confidence: 0.6, needsConfirmation: false, isCorrection: false }
      assert.equal(shouldConfirm(field, lowConf, threshold), true)
    })

    it('handles null extraction result safely', () => {
      assert.equal(shouldConfirm({ id: 'test', confirm: 'if_uncertain' }, null), true)
    })
  })
})
