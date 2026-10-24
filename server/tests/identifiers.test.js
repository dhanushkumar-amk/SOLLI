import { describe, it } from 'node:test'
import assert from 'node:assert'
import { extractPhone } from '../llm/extractors/phone.js'
import { extractAadhaar } from '../llm/extractors/aadhaar.js'
import { extractBankAccount } from '../llm/extractors/bank_account.js'
import { extractIfsc } from '../llm/extractors/ifsc.js'

describe('Sensitive Identifier Extractors (Phone, Aadhaar, Bank, IFSC)', () => {
  describe('Phone Extractor', () => {
    it('extracts clean 10-digit phone', () => {
      const res = extractPhone('9876543210')
      assert.strictEqual(res.value, '98765 43210')
      assert.strictEqual(res.valid, true)
      assert.strictEqual(res.needsConfirmation, true)
    })

    it('strips +91 country code prefix', () => {
      const res = extractPhone('+91 9876543210')
      assert.strictEqual(res.value, '98765 43210')
      assert.strictEqual(res.valid, true)
    })

    it('strips spoken "plus nine one" prefix', () => {
      const res = extractPhone('plus nine one 9876543210')
      assert.strictEqual(res.value, '98765 43210')
      assert.strictEqual(res.valid, true)
    })

    it('strips trunk leading zero (09876543210 -> 10 digits)', () => {
      const res = extractPhone('09876543210')
      assert.strictEqual(res.value, '98765 43210')
      assert.strictEqual(res.valid, true)
    })

    it('detects partial phone capture (e.g. 6 digits)', () => {
      const res = extractPhone('987654')
      assert.strictEqual(res.partial, true)
      assert.strictEqual(res.have, 6)
      assert.strictEqual(res.need, 4)
      assert.ok(res.prompt.en.includes('I heard 6 digits'))
    })

    it('rejects invalid character or too long phone', () => {
      const res = extractPhone('987654321012')
      assert.strictEqual(res.valid, false)
      assert.strictEqual(res.validationError, 'INVALID_LENGTH')
    })
  })

  describe('Aadhaar Extractor', () => {
    it('extracts clean 12-digit Aadhaar grouped in 4s', () => {
      const res = extractAadhaar('987654321098')
      assert.strictEqual(res.value, '9876 5432 1098')
      assert.strictEqual(res.valid, true)
      assert.strictEqual(res.needsConfirmation, true)
    })

    it('strips verbal "aadhaar number" prefix', () => {
      const res = extractAadhaar('aadhaar number 9876 5432 1098')
      assert.strictEqual(res.value, '9876 5432 1098')
      assert.strictEqual(res.valid, true)
    })

    it('detects partial Aadhaar capture (e.g. 8 digits)', () => {
      const res = extractAadhaar('98765432')
      assert.strictEqual(res.partial, true)
      assert.strictEqual(res.have, 8)
      assert.strictEqual(res.need, 4)
      assert.ok(res.prompt.en.includes('I heard 8 digits'))
    })

    it('rejects wrong length Aadhaar', () => {
      const res = extractAadhaar('12345')
      assert.strictEqual(res.partial, true)
      assert.strictEqual(res.valid, false)
    })
  })

  describe('Bank Account Extractor', () => {
    it('extracts standard bank account digits', () => {
      const res = extractBankAccount('123456789012')
      assert.strictEqual(res.value, '123456789012')
      assert.strictEqual(res.valid, true)
      assert.strictEqual(res.needsConfirmation, true)
    })

    it('strips verbal prefix "account number"', () => {
      const res = extractBankAccount('account number 98765432109')
      assert.strictEqual(res.value, '98765432109')
      assert.strictEqual(res.valid, true)
    })

    it('rejects account shorter than 9 digits', () => {
      const res = extractBankAccount('12345')
      assert.strictEqual(res.valid, false)
      assert.strictEqual(res.validationError, 'INVALID_LENGTH')
    })
  })

  describe('IFSC Extractor', () => {
    it('extracts standard 11-char IFSC code', () => {
      const res = extractIfsc('SBIN0001234')
      assert.strictEqual(res.value, 'SBIN0001234')
      assert.strictEqual(res.valid, true)
      assert.strictEqual(res.needsConfirmation, true)
    })

    it('extracts spoken letters and digits "S B I N zero zero zero one two three four"', () => {
      const res = extractIfsc('S B I N zero zero zero one two three four')
      assert.strictEqual(res.value, 'SBIN0001234')
      assert.strictEqual(res.valid, true)
    })

    it('rejects invalid IFSC with non-zero 5th character', () => {
      const res = extractIfsc('SBIN1001234')
      assert.strictEqual(res.valid, false)
      assert.strictEqual(res.validationError, 'INVALID_FORMAT')
    })

    it('rejects invalid IFSC length', () => {
      const res = extractIfsc('SBIN123')
      assert.strictEqual(res.valid, false)
      assert.strictEqual(res.validationError, 'INVALID_FORMAT')
    })
  })

  describe('Security and Logging Verification', () => {
    it('sensitive extractors never log raw values to stdout/stderr', () => {
      let intercepted = ''
      const originalStdout = process.stdout.write
      process.stdout.write = (chunk) => {
        intercepted += chunk
        return true
      }

      try {
        extractAadhaar('9999 8888 7777')
        extractPhone('9876543210')
        extractBankAccount('98765432101234')
      } finally {
        process.stdout.write = originalStdout
      }

      assert.strictEqual(intercepted.includes('9999 8888 7777'), false)
      assert.strictEqual(intercepted.includes('9876543210'), false)
      assert.strictEqual(intercepted.includes('98765432101234'), false)
    })
  })
})
