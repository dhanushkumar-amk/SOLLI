import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildReadback,
  formatDateForReadback,
  formatValueForReadback,
  getReadbackAudioParts,
  STATIC_CONFIRM_PROMPT,
} from '../forms/formEngine.js'

describe('Read-back Text Builders (readback.test.js)', () => {
  describe('Date of Birth Read-back', () => {
    const dateField = {
      id: 'date_of_birth',
      type: 'date',
      readback: {
        ta: 'பிறந்த தேதி {value}. சரியா?',
        en: 'Your date of birth is {value}. Is this correct?',
      },
    }

    it('formats date as day, month name, year in English', () => {
      const enFormatted = formatDateForReadback('1958-05-15', 'en')
      assert.equal(enFormatted, '15 May 1958')

      const readbackEn = buildReadback(dateField, '1958-05-15', 'en')
      assert.equal(readbackEn, 'Your date of birth is 15 May 1958. Is this correct?')
      assert.ok(readbackEn.length < 200, `Length ${readbackEn.length} exceeds 200`)
    })

    it('formats date as day, month name, year in Tamil', () => {
      const taFormatted = formatDateForReadback('1958-05-05', 'ta')
      assert.equal(taFormatted, '5 மே 1958')

      const readbackTa = buildReadback(dateField, '1958-05-05', 'ta')
      assert.equal(readbackTa, 'பிறந்த தேதி 5 மே 1958. சரியா?')
      assert.ok(readbackTa.length < 200, `Length ${readbackTa.length} exceeds 200`)
    })
  })

  describe('Phone Number Read-back', () => {
    const phoneField = {
      id: 'phone',
      type: 'phone',
      sensitive: true,
      readback: {
        ta: 'எண் {value}. சரியா?',
        en: 'Phone number is {value}. Is this correct?',
      },
    }

    it('reads all 10 digits in small groups (5+5) with commas for natural pauses', () => {
      const readbackEn = buildReadback(phoneField, '9876543210', 'en')
      assert.ok(readbackEn.includes('nine eight seven six five, four three two one zero'))
      assert.ok(readbackEn.length < 200, `Length ${readbackEn.length} exceeds 200`)

      const readbackTa = buildReadback(phoneField, '9876543210', 'ta')
      assert.ok(readbackTa.includes('ஒன்பது எட்டு ஏழு ஆறு ஐந்து, நான்கு மூன்று இரண்டு ஒன்று பூஜ்ஜியம்'))
      assert.ok(readbackTa.length < 200, `Length ${readbackTa.length} exceeds 200`)
    })
  })

  describe('Aadhaar Number Read-back', () => {
    const aadhaarField = {
      id: 'aadhaar',
      type: 'aadhaar',
      sensitive: true,
      readback: {
        ta: 'ஆதார் எண் {value}. சரியா?',
        en: 'Aadhaar number is {value}. Is this correct?',
      },
    }

    it('groups 12 digits into 4+4+4 with commas and stays under 200 chars in Tamil & English', () => {
      const readbackEn = buildReadback(aadhaarField, '987654321098', 'en')
      assert.ok(readbackEn.length < 200, `Length ${readbackEn.length} exceeds 200`)
      // Verify grouping of 4
      const commaCount = (readbackEn.match(/,/g) || []).length
      assert.ok(commaCount >= 2, 'Should have at least 2 pause commas for 3 groups')

      const readbackTa = buildReadback(aadhaarField, '987654321098', 'ta')
      assert.ok(readbackTa.length < 200, `Tamil Aadhaar readback length ${readbackTa.length} exceeds 200`)
      assert.ok(readbackTa.includes('ஒன்பது எட்டு ஏழு ஆறு'))
    })
  })

  describe('Bank Account Number Read-back', () => {
    const bankField = {
      id: 'bank_account',
      type: 'bank_account',
      sensitive: true,
      readback: {
        ta: 'வங்கி கணக்கு எண் {value}. சரியா?',
        en: 'Account number is {value}. Is this correct?',
      },
    }

    it('reads long account number in groups of 4 with pauses and stays under 200 chars', () => {
      const accountVal = '123456789012'
      const readbackTa = buildReadback(bankField, accountVal, 'ta')
      assert.ok(readbackTa.length < 200, `Bank account readback length ${readbackTa.length} exceeds 200`)
      assert.ok(readbackTa.includes('வங்கி கணக்கு எண்'))

      const readbackEn = buildReadback(bankField, accountVal, 'en')
      assert.ok(readbackEn.length < 200, `Bank account readback length ${readbackEn.length} exceeds 200`)
    })
  })

  describe('Applicant Name Read-back', () => {
    const nameField = {
      id: 'applicant_name',
      type: 'name',
      sensitive: false,
      readback: {
        ta: 'உங்கள் பெயர் {value}. சரியா?',
        en: 'Your name is {value}. Is this correct?',
      },
    }

    it('interpolates name directly without modification and stays under 200 chars', () => {
      const readbackTa = buildReadback(nameField, 'ரங்கநாதன்', 'ta')
      assert.equal(readbackTa, 'உங்கள் பெயர் ரங்கநாதன். சரியா?')
      assert.ok(readbackTa.length < 200)

      const readbackEn = buildReadback(nameField, 'Ranganathan', 'en')
      assert.equal(readbackEn, 'Your name is Ranganathan. Is this correct?')
      assert.ok(readbackEn.length < 200)
    })
  })

  describe('Split Audio Parts (TTS Cache Separation)', () => {
    const nameField = {
      id: 'applicant_name',
      type: 'name',
      readback: {
        ta: 'உங்கள் பெயர் {value}. சரியா?',
        en: 'Your name is {value}. Is this correct?',
      },
    }

    it('splits into dynamic value readback and static cached question', () => {
      const partsTa = getReadbackAudioParts(nameField, 'ரங்கநாதன்', 'ta')
      assert.equal(partsTa.valuePrompt, 'உங்கள் பெயர் ரங்கநாதன்.')
      assert.equal(partsTa.staticConfirmPrompt, STATIC_CONFIRM_PROMPT.ta)
      assert.ok(partsTa.valuePrompt.length < 150)

      const partsEn = getReadbackAudioParts(nameField, 'Ranganathan', 'en')
      assert.equal(partsEn.valuePrompt, 'Your name is Ranganathan.')
      assert.equal(partsEn.staticConfirmPrompt, STATIC_CONFIRM_PROMPT.en)
    })
  })
})
