import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildFullSummary,
  buildReadback,
  getNextField,
  getProgress,
  getSpokenFields,
  isComplete,
  loadForm,
  validateAnswer,
} from '../forms/formEngine.js'

test('Form Engine Unit Tests', async (t) => {
  const form = loadForm('pension')

  await t.test('getNextField starts with order 1 (applicant_name)', () => {
    const next = getNextField(form, {})
    assert.ok(next)
    assert.equal(next.id, 'applicant_name')
    assert.equal(next.order, 1)
  })

  await t.test('getNextField advances to next unanswered field and skips unspoken fields', () => {
    // Fill all 12 spoken fields
    const spoken = getSpokenFields(form)
    const answers = {}
    for (const f of spoken) {
      answers[f.id] = { value: 'Valid Test Answer', confirmed: true }
    }

    // Now all 12 spoken fields are answered. Unspoken fields (order 13-16) must be skipped.
    const next = getNextField(form, answers)
    assert.equal(next, null, 'Should return null when all spoken fields are answered')
  })

  await t.test('getNextField honors dependsOn conditional question rules', () => {
    // Synthetic mock form with dependsOn
    const conditionalForm = {
      id: 'cond_form',
      fields: [
        {
          id: 'has_disability',
          order: 1,
          type: 'yes_no',
          spoken: true,
          required: true,
        },
        {
          id: 'disability_percentage',
          order: 2,
          type: 'number',
          spoken: true,
          required: true,
          dependsOn: { field: 'has_disability', equals: 'yes' },
        },
        {
          id: 'bank_account',
          order: 3,
          type: 'bank_account',
          spoken: true,
          required: true,
        },
      ],
    }

    // When has_disability is "no", disability_percentage must be skipped!
    const answersNo = {
      has_disability: { value: 'no' },
    }
    const nextWhenNo = getNextField(conditionalForm, answersNo, 'has_disability')
    assert.equal(nextWhenNo.id, 'bank_account', 'Should skip disability_percentage when has_disability is "no"')

    // When has_disability is "yes", disability_percentage must be asked!
    const answersYes = {
      has_disability: { value: 'yes' },
    }
    const nextWhenYes = getNextField(conditionalForm, answersYes, 'has_disability')
    assert.equal(nextWhenYes.id, 'disability_percentage')
  })

  await t.test('getProgress calculates done and total accurately', () => {
    const emptyProgress = getProgress(form, {})
    assert.equal(emptyProgress.done, 0)
    assert.equal(emptyProgress.total, 12)

    const partialAnswers = {
      applicant_name: { value: 'Demo Anbu' },
      parent_spouse_name: { value: 'Demo Parent' },
      date_of_birth: { value: '1958-05-05' },
    }
    const partialProgress = getProgress(form, partialAnswers)
    assert.equal(partialProgress.done, 3)
    assert.equal(partialProgress.total, 12)
  })

  await t.test('buildReadback replaces {value} in Tamil and English', () => {
    const nameField = form.fields.find((f) => f.id === 'applicant_name')
    const taReadback = buildReadback(nameField, 'அன்பு', 'ta')
    assert.equal(taReadback, 'உங்கள் பெயர் அன்பு. சரியா?')

    const enReadback = buildReadback(nameField, 'Anbu', 'en')
    assert.equal(enReadback, 'Your name is Anbu. Is this correct?')
  })

  await t.test('buildFullSummary strictly masks sensitive numbers (Aadhaar & Bank Account)', () => {
    const rawAnswers = {
      applicant_name: { value: 'Demo Anbu One', confirmed: true },
      aadhaar: { value: '0000 0000 0001', confirmed: true },
      bank_account: { value: '000000000000001', confirmed: true },
      phone: { value: '00000 00001', confirmed: true },
    }

    const summary = buildFullSummary(form, rawAnswers, 'en')

    const aadhaarEntry = summary.find((s) => s.id === 'aadhaar')
    assert.ok(aadhaarEntry)
    assert.equal(aadhaarEntry.display, '•••• •••• 0001')
    assert.ok(!aadhaarEntry.display.includes('0000 0000 0001'))

    const bankEntry = summary.find((s) => s.id === 'bank_account')
    assert.ok(bankEntry)
    assert.equal(bankEntry.display, '•••••••••••0001')
    assert.ok(!bankEntry.display.includes('000000000000001'))

    const phoneEntry = summary.find((s) => s.id === 'phone')
    assert.ok(phoneEntry)
    assert.equal(phoneEntry.display, '000•• ••001')

    // Name is not sensitive so it is shown in full
    const nameEntry = summary.find((s) => s.id === 'applicant_name')
    assert.equal(nameEntry.display, 'Demo Anbu One')
  })

  await t.test('isComplete returns true only when all required spoken fields are answered', () => {
    assert.equal(isComplete(form, {}), false)

    const fullAnswers = {}
    for (const f of getSpokenFields(form)) {
      fullAnswers[f.id] = { value: 'Valid Value' }
    }
    assert.equal(isComplete(form, fullAnswers), true)
  })
})
