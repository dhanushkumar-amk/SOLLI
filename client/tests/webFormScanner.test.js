import assert from 'node:assert/strict'
import test, { describe } from 'node:test'
import { generateWebFormSchema, setActiveCustomSchema, getActiveCustomSchema } from '../src/forms/index.js'
import { fetchForm, fetchNextField, submitAnswer } from '../src/api.js'

describe('Web Form Dynamic Scanner & Auto-Fill Engine', () => {
  const sampleGoogleFormFields = [
    {
      id: 'gform_field_email',
      order: 1,
      label: 'Email *',
      hint: 'Your email address',
      type: 'email',
      required: true,
      selector: '[data-solli-id="gform_field_email"]',
    },
    {
      id: 'gform_q_0',
      order: 2,
      label: 'Name: *',
      hint: 'Please type in your first and last name.',
      type: 'text',
      required: true,
      selector: '[data-solli-id="gform_q_0"]',
    },
    {
      id: 'gform_q_1',
      order: 3,
      label: 'Class Period: *',
      hint: '',
      type: 'dropdown',
      required: true,
      selector: '[data-solli-id="gform_q_1"]',
    },
  ]

  test('converts detected Google Form fields into a valid Solli Form Schema', () => {
    const schema = generateWebFormSchema(sampleGoogleFormFields, 'Google Forms - Quizzes')
    assert.ok(schema, 'Schema should be generated')
    assert.equal(schema.id, 'live_web_form')
    assert.equal(schema.fields.length, 3)

    // Check Question 1 (Email)
    const emailField = schema.fields[0]
    assert.equal(emailField.id, 'gform_field_email')
    assert.equal(emailField.labels.en, 'Email')
    assert.equal(emailField.question.ta, 'உங்கள் மின்னஞ்சல் முகவரி என்ன?')
    assert.equal(emailField.question.en, 'What is your email address?')
    assert.equal(emailField.spoken, true)

    // Check Question 2 (Name)
    const nameField = schema.fields[1]
    assert.equal(nameField.id, 'gform_q_0')
    assert.equal(nameField.labels.en, 'Name:')
    assert.equal(nameField.question.ta, 'உங்கள் முழு பெயர் என்ன?')
    assert.equal(nameField.question.en, 'What is your full name?')

    // Check Question 3 (Class Period)
    const classField = schema.fields[2]
    assert.equal(classField.id, 'gform_q_1')
    assert.ok(classField.question.en.includes('Class Period'))
  })

  test('active custom schema is served in fetchForm without network call or "Failed to fetch"', async () => {
    const schema = generateWebFormSchema(sampleGoogleFormFields, 'Google Forms - Quizzes')
    setActiveCustomSchema(schema)

    const fetched = await fetchForm('live_web_form')
    assert.equal(fetched.id, 'live_web_form')
    assert.equal(fetched.fields.length, 3)
  })

  test('fetchNextField traverses questions one by one sequentially', async () => {
    const schema = generateWebFormSchema(sampleGoogleFormFields, 'Google Forms - Quizzes')
    setActiveCustomSchema(schema)

    // First question
    const step1 = await fetchNextField({ formId: 'live_web_form', answers: {} })
    assert.equal(step1.next.id, 'gform_field_email')
    assert.equal(step1.progress.done, 0)
    assert.equal(step1.progress.total, 3)

    // After user answers email
    const answers = {
      gform_field_email: { value: 'test@example.com', confirmed: true },
    }
    const step2 = await fetchNextField({ formId: 'live_web_form', answers })
    assert.equal(step2.next.id, 'gform_q_0')
    assert.equal(step2.progress.done, 1)

    // After user answers name
    answers.gform_q_0 = { value: 'Dhanush Kumar', confirmed: true }
    const step3 = await fetchNextField({ formId: 'live_web_form', answers })
    assert.equal(step3.next.id, 'gform_q_1')
    assert.equal(step3.progress.done, 2)

    // After user answers all
    answers.gform_q_1 = { value: 'Period 1', confirmed: true }
    const step4 = await fetchNextField({ formId: 'live_web_form', answers })
    assert.equal(step4.next, null, 'All questions completed')
    assert.equal(step4.progress.done, 3)
  })

  test('built-in pension schema never throws "Failed to fetch" even if server is offline', async () => {
    // Calling fetchForm for pension when localhost:5000 is unreachable falls back to bundled schema
    const pension = await fetchForm('pension')
    assert.ok(pension)
    assert.equal(pension.id, 'pension')
    assert.ok(pension.fields.length > 0)
  })
})

