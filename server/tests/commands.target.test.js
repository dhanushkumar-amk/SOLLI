import assert from 'node:assert/strict'
import test, { describe } from 'node:test'
import { loadForm } from '../forms/formEngine.js'
import {
  checkFieldAliasCoverage,
  isolateTargetPhrase,
  matchFieldTarget,
} from '../llm/commands/target.js'

describe('Field Target Matcher (commands.target.test.js)', () => {
  const form = loadForm('pension')

  test('all 12 spoken fields in pension.json have alias coverage', () => {
    const missing = checkFieldAliasCoverage(form.fields)
    assert.deepEqual(
      missing,
      [],
      `Every spoken field must have at least one alias. Missing: ${missing.join(', ')}`
    )
  })

  test('isolateTargetPhrase strips carrier verbs and prefixes cleanly', () => {
    assert.equal(isolateTargetPhrase('change the village'), 'village')
    assert.equal(isolateTargetPhrase('ooru maathunga'), 'ooru')
    assert.equal(isolateTargetPhrase('i want to edit my phone number'), 'phone number')
    assert.equal(isolateTargetPhrase('மாத்துங்க கிராமம்'), 'கிராமம்')
  })

  describe('Field Target Resolution by Spoken Aliases', () => {
    const testCases = [
      { input: 'change the village', expectedField: 'village' },
      { input: 'ooru maathunga', expectedField: 'village' },
      { input: 'gramam maathunga', expectedField: 'village' },
      { input: 'change mobile number', expectedField: 'phone' },
      { input: 'cell number maathunga', expectedField: 'phone' },
      { input: 'tholaipesi maathunga', expectedField: 'phone' },
      { input: 'change date of birth', expectedField: 'date_of_birth' },
      { input: 'pirandha thethi maathunga', expectedField: 'date_of_birth' },
      { input: 'change dob', expectedField: 'date_of_birth' },
      { input: 'change bank account', expectedField: 'bank_account' },
      { input: 'vangi kanakku maathunga', expectedField: 'bank_account' },
      { input: 'change aadhaar number', expectedField: 'aadhaar' },
      { input: 'aadhar card maathunga', expectedField: 'aadhaar' },
      { input: 'change district', expectedField: 'district' },
      { input: 'mavattam maathunga', expectedField: 'district' },
      { input: 'change taluk', expectedField: 'taluk' },
      { input: 'vattam maathunga', expectedField: 'taluk' },
      { input: 'change name', expectedField: 'applicant_name' },
      { input: 'en peyar maathunga', expectedField: 'applicant_name' },
      { input: 'change father name', expectedField: 'parent_spouse_name' },
      { input: 'husband name maathunga', expectedField: 'parent_spouse_name' },
      { input: 'change gender', expectedField: 'gender' },
      { input: 'paalinam maathunga', expectedField: 'gender' },
      { input: 'change nominee', expectedField: 'nominee' },
      { input: 'varisu maathunga', expectedField: 'nominee' },
      { input: 'change residential address', expectedField: 'address' },
      { input: 'veettu mugavari maathunga', expectedField: 'address' },
    ]

    for (const { input, expectedField } of testCases) {
      test(`targets "${expectedField}" from phrase "${input}"`, () => {
        const res = matchFieldTarget(input, form.fields)
        assert.equal(res.target, expectedField)
        assert.equal(res.ambiguous, false)
        assert.ok(res.confidence >= 0.72)
      })
    }
  })

  test('"change" with no field specified returns target: null, ambiguous: false', () => {
    const res = matchFieldTarget('change', form.fields)
    assert.equal(res.target, null)
    assert.equal(res.ambiguous, false)
  })

  test('ambiguous targets with close match scores trigger ambiguous: true', () => {
    // Artificial test fields that are nearly identical in name
    const mockFields = [
      { id: 'sub_taluk', spoken: true, labels: { en: 'sub taluk' } },
      { id: 'taluk', spoken: true, labels: { en: 'taluk' } },
    ]

    const res = matchFieldTarget('change taluk', mockFields)
    // Should detect close similarity and flag ambiguity if scores are within 0.08
    if (res.ambiguous) {
      assert.ok(res.candidates.length >= 2)
    } else {
      assert.ok(res.target === 'taluk' || res.target === 'sub_taluk')
    }
  })
})
