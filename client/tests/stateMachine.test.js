import assert from 'node:assert/strict'
import test, { describe } from 'node:test'
import {
  conversationReducer,
  createInitialContext,
  MAX_ATTEMPTS_PER_FIELD,
  STATES,
} from '../src/conversation/stateMachine.js'

describe('Conversation State Machine Reducer', () => {
  test('initial state is idle', () => {
    const ctx = createInitialContext()
    assert.equal(ctx.state, STATES.IDLE)
    assert.equal(ctx.currentField, null)
    assert.equal(ctx.error, null)
  })

  test('legal transition: IDLE -> START -> loadingForm', () => {
    const ctx = createInitialContext()
    const next = conversationReducer(ctx, { type: 'START' })
    assert.equal(next.state, STATES.LOADING_FORM)
  })

  test('illegal transition rejected: IDLE -> AUDIO_ENDED remains IDLE', () => {
    const ctx = createInitialContext()
    const next = conversationReducer(ctx, { type: 'AUDIO_ENDED' })
    assert.equal(next.state, STATES.IDLE)
  })

  test('FORM_LOADED sets first field and enters speakingQuestion', () => {
    const ctx = { ...createInitialContext(), state: STATES.LOADING_FORM }
    const field = { id: 'applicant_name', question: { ta: 'பெயர் என்ன?', en: 'What is your name?' } }
    const next = conversationReducer(ctx, {
      type: 'FORM_LOADED',
      payload: { form: { id: 'pension' }, firstField: field, progress: { done: 0, total: 12 } },
    })
    assert.equal(next.state, STATES.SPEAKING_QUESTION)
    assert.equal(next.currentFieldId, 'applicant_name')
    assert.equal(next.activePromptText.ta, 'பெயர் என்ன?')
  })

  test('AUDIO_ENDED in speakingQuestion transitions to listening', () => {
    const ctx = { ...createInitialContext(), state: STATES.SPEAKING_QUESTION }
    const next = conversationReducer(ctx, { type: 'AUDIO_ENDED' })
    assert.equal(next.state, STATES.LISTENING)
  })

  test('silence counts as attempt and speaks helpPrompt on attempt 1', () => {
    const field = { id: 'phone', helpPrompt: { ta: 'போன் எண் சொல்லவும்' } }
    const ctx = {
      ...createInitialContext(),
      state: STATES.PROCESSING,
      currentFieldId: 'phone',
      currentField: field,
      answers: {},
    }

    const next = conversationReducer(ctx, { type: 'ANSWER_SILENCE' })
    assert.equal(next.state, STATES.SPEAKING_HELP)
    assert.equal(next.answers.phone.attempts, 1)
    assert.equal(next.advanceAfterAudio, false)
    assert.equal(next.activePromptText.ta, 'போன் எண் சொல்லவும்')
  })

  test('retry limit moves on after 2 failures and marks needsOperatorHelp', () => {
    const field = { id: 'bank_account', errorMessage: { ta: 'வங்கி கணக்கு எண் தவறானது' } }
    const ctx = {
      ...createInitialContext(),
      state: STATES.PROCESSING,
      currentFieldId: 'bank_account',
      currentField: field,
      answers: {
        bank_account: { attempts: 1 },
      },
    }

    // Second failure on invalid answer
    const next = conversationReducer(ctx, {
      type: 'ANSWER_INVALID',
      payload: { fieldId: 'bank_account', validationError: 'INVALID_LENGTH' },
    })

    assert.equal(next.state, STATES.SPEAKING_ERROR)
    assert.equal(next.advanceAfterAudio, true)
    assert.equal(next.answers.bank_account.attempts, 2)
    assert.equal(next.answers.bank_account.needsOperatorHelp, true)
  })

  test('valid answer advances to next question', () => {
    const currentField = { id: 'applicant_name' }
    const nextField = { id: 'parent_spouse_name', question: { ta: 'தந்தை பெயர்?' } }
    const ctx = {
      ...createInitialContext(),
      state: STATES.PROCESSING,
      currentFieldId: 'applicant_name',
      currentField,
      answers: {},
    }

    const next = conversationReducer(ctx, {
      type: 'ANSWER_VALID',
      payload: {
        fieldId: 'applicant_name',
        value: 'Muthulakshmi',
        display: 'Muthulakshmi',
        nextField,
        progress: { done: 1, total: 12 },
      },
    })

    assert.equal(next.state, STATES.SPEAKING_QUESTION)
    assert.equal(next.currentFieldId, 'parent_spouse_name')
    assert.equal(next.answers.applicant_name.value, 'Muthulakshmi')
    assert.equal(next.progress.done, 1)
  })

  test('valid answer on final field transitions to review screen', () => {
    const currentField = { id: 'aadhaar' }
    const ctx = {
      ...createInitialContext(),
      state: STATES.PROCESSING,
      currentFieldId: 'aadhaar',
      currentField,
      answers: {},
    }

    const next = conversationReducer(ctx, {
      type: 'ANSWER_VALID',
      payload: {
        fieldId: 'aadhaar',
        value: '123456789012',
        display: '•••• •••• 9012',
        nextField: null,
        isFinished: true,
        summary: [{ id: 'aadhaar', display: '•••• •••• 9012' }],
      },
    })

    assert.equal(next.state, STATES.REVIEW)
    assert.equal(next.currentField, null)
    assert.equal(next.summary?.length, 1)
  })
})
