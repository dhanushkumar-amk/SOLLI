import assert from 'node:assert/strict'
import test, { describe } from 'node:test'
import { getNextField, getProgress, isComplete } from '../forms/formEngine.js'

describe('Conversation Loop with dependsOn Rules', () => {
  // Mock form with conditional branching
  const conditionalForm = {
    id: 'conditional_test',
    fields: [
      {
        id: 'applicant_name',
        order: 1,
        type: 'name',
        spoken: true,
        required: true,
      },
      {
        id: 'has_disability',
        order: 2,
        type: 'yes_no',
        spoken: true,
        required: true,
      },
      {
        id: 'disability_percentage',
        order: 3,
        type: 'number',
        spoken: true,
        required: true,
        dependsOn: {
          field: 'has_disability',
          equals: 'yes',
        },
      },
      {
        id: 'village',
        order: 4,
        type: 'text',
        spoken: true,
        required: true,
      },
    ],
  }

  test('when condition does NOT match, dependent field is skipped in getNextField', () => {
    // Applicant answers has_disability = "no"
    const answers = {
      applicant_name: { value: 'Muthu', confirmed: true },
      has_disability: { value: 'no', confirmed: true },
    }

    // Next field after has_disability should skip disability_percentage and go directly to village
    const next = getNextField(conditionalForm, answers, 'has_disability')
    assert.ok(next)
    assert.equal(next.id, 'village')
  })

  test('when condition matches, dependent field IS asked', () => {
    // Applicant answers has_disability = "yes"
    const answers = {
      applicant_name: { value: 'Muthu', confirmed: true },
      has_disability: { value: 'yes', confirmed: true },
    }

    // Next field after has_disability should be disability_percentage
    const next = getNextField(conditionalForm, answers, 'has_disability')
    assert.ok(next)
    assert.equal(next.id, 'disability_percentage')
  })

  test('progress and completion calculation ignores skipped dependent fields', () => {
    // Case 1: has_disability = "no" (disability_percentage is not applicable)
    const answersNo = {
      applicant_name: { value: 'Muthu', confirmed: true },
      has_disability: { value: 'no', confirmed: true },
      village: { value: 'Madurai', confirmed: true },
    }

    const progressNo = getProgress(conditionalForm, answersNo)
    assert.equal(progressNo.done, 3)
    assert.equal(progressNo.total, 3) // total active fields is 3
    assert.equal(isComplete(conditionalForm, answersNo), true)

    // Case 2: has_disability = "yes" but disability_percentage not yet answered
    const answersYesPartial = {
      applicant_name: { value: 'Muthu', confirmed: true },
      has_disability: { value: 'yes', confirmed: true },
      village: { value: 'Madurai', confirmed: true },
    }

    assert.equal(isComplete(conditionalForm, answersYesPartial), false)

    // Case 3: has_disability = "yes" and disability_percentage answered
    const answersYesFull = {
      ...answersYesPartial,
      disability_percentage: { value: 60, confirmed: true },
    }
    const progressYes = getProgress(conditionalForm, answersYesFull)
    assert.equal(progressYes.done, 4)
    assert.equal(progressYes.total, 4)
    assert.equal(isComplete(conditionalForm, answersYesFull), true)
  })
})
