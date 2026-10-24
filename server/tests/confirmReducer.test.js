import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  conversationReducer,
  createInitialContext,
  RETRY_PROMPTS,
  STATES,
} from '../../client/src/conversation/stateMachine.js'

describe('Confirmation State Machine Reducer (confirmReducer.test.js)', () => {
  const mockField1 = {
    id: 'applicant_name',
    type: 'name',
    question: { ta: 'உங்கள் பெயர் என்ன?', en: 'What is your name?' },
  }

  const mockField2 = {
    id: 'phone',
    type: 'phone',
    sensitive: true,
    question: { ta: 'தொலைபேசி எண் என்ன?', en: 'What is your phone number?' },
  }

  function getBaseState() {
    const s = createInitialContext()
    s.state = STATES.PROCESSING
    s.currentField = mockField1
    s.currentFieldId = mockField1.id
    return s
  }

  it('ANSWER_VALID with shouldConfirm transitions to SPEAKING_READBACK and stores pending confirmation', () => {
    const base = getBaseState()
    const action = {
      type: 'ANSWER_VALID',
      payload: {
        fieldId: 'applicant_name',
        value: 'ரங்கநாதன்',
        display: 'ரங்கநாதன்',
        shouldConfirm: true,
        readbackText: 'உங்கள் பெயர் ரங்கநாதன். சரியா?',
        nextField: mockField2,
        progress: { done: 1, total: 12 },
      },
    }

    const nextState = conversationReducer(base, action)
    assert.equal(nextState.state, STATES.SPEAKING_READBACK)
    assert.ok(nextState.pendingConfirmation)
    assert.equal(nextState.pendingConfirmation.value, 'ரங்கநாதன்')
    assert.equal(nextState.pendingConfirmation.confirmAttempts, 0)
    // Field should NOT be marked confirmed yet
    assert.equal(nextState.answers['applicant_name']?.confirmed, undefined)
  })

  it('AUDIO_ENDED from SPEAKING_READBACK transitions to LISTENING_CONFIRM with showConfirmButtons', () => {
    const base = getBaseState()
    base.state = STATES.SPEAKING_READBACK
    base.pendingConfirmation = { fieldId: 'applicant_name', value: 'ரங்கநாதன்', confirmAttempts: 0 }

    const nextState = conversationReducer(base, { type: 'AUDIO_ENDED' })
    assert.equal(nextState.state, STATES.LISTENING_CONFIRM)
    assert.equal(nextState.showConfirmButtons, true)
  })

  it('CONFIRM_ANSWER "yes" marks confirmed:true, clears pending, and advances to next field', () => {
    const base = getBaseState()
    base.state = STATES.PROCESSING_CONFIRM
    base.pendingConfirmation = {
      fieldId: 'applicant_name',
      value: 'ரங்கநாதன்',
      display: 'ரங்கநாதன்',
      nextField: mockField2,
      confirmAttempts: 0,
    }

    const nextState = conversationReducer(base, {
      type: 'CONFIRM_ANSWER',
      payload: { answer: 'yes' },
    })

    assert.equal(nextState.state, STATES.SPEAKING_QUESTION)
    assert.equal(nextState.currentFieldId, mockField2.id)
    assert.equal(nextState.answers['applicant_name'].confirmed, true)
    assert.equal(nextState.answers['applicant_name'].value, 'ரங்கநாதன்')
    assert.equal(nextState.pendingConfirmation, null)
  })

  it('CONFIRM_ANSWER "no" clears value, speaks sorry prompt, and re-asks the SAME field', () => {
    const base = getBaseState()
    base.state = STATES.PROCESSING_CONFIRM
    base.pendingConfirmation = {
      fieldId: 'applicant_name',
      value: 'தவறான பெயர்',
      display: 'தவறான பெயர்',
      nextField: mockField2,
      confirmAttempts: 0,
    }

    const nextState = conversationReducer(base, {
      type: 'CONFIRM_ANSWER',
      payload: { answer: 'no' },
    })

    assert.equal(nextState.state, STATES.SPEAKING_ERROR)
    assert.equal(nextState.advanceAfterAudio, false) // Re-asks same question!
    assert.equal(nextState.answers['applicant_name'].value, null)
    assert.equal(nextState.answers['applicant_name'].confirmed, false)
    assert.equal(nextState.pendingConfirmation, null)
  })

  it('CONFIRM_ANSWER unclear twice re-prompts and displays on-screen Yes/No buttons', () => {
    const base = getBaseState()
    base.state = STATES.PROCESSING_CONFIRM
    base.pendingConfirmation = {
      fieldId: 'phone',
      value: '9876543210',
      display: '9876543210',
      confirmAttempts: 0,
      nextField: mockField2,
    }

    // Round 1 unclear
    const stateRound1 = conversationReducer(base, {
      type: 'CONFIRM_ANSWER',
      payload: { answer: 'unclear' },
    })
    assert.equal(stateRound1.state, STATES.SPEAKING_READBACK)
    assert.equal(stateRound1.showConfirmButtons, true)
    assert.equal(stateRound1.pendingConfirmation.confirmAttempts, 1)

    // Round 2 unclear
    stateRound1.state = STATES.PROCESSING_CONFIRM
    const stateRound2 = conversationReducer(stateRound1, {
      type: 'CONFIRM_ANSWER',
      payload: { answer: 'unclear' },
    })
    assert.equal(stateRound2.state, STATES.SPEAKING_READBACK)
    assert.equal(stateRound2.showConfirmButtons, true)
    assert.equal(stateRound2.pendingConfirmation.confirmAttempts, 2)
  })

  it('CONFIRM_ANSWER unclear 3 rounds moves on, marks needsOperatorHelp, and NEVER marks confirmed', () => {
    const base = getBaseState()
    base.state = STATES.PROCESSING_CONFIRM
    base.pendingConfirmation = {
      fieldId: 'phone',
      value: '9876543210',
      display: '9876543210',
      confirmAttempts: 2, // 2 prior attempts
      nextField: mockField2,
      progress: { done: 1, total: 12 },
    }

    const nextState = conversationReducer(base, {
      type: 'CONFIRM_ANSWER',
      payload: { answer: 'unclear' },
    })

    // Moves on after audio
    assert.equal(nextState.state, STATES.SPEAKING_ERROR)
    assert.equal(nextState.advanceAfterAudio, true)

    // Critical assertion: Sensitive unconfirmed value is NEVER marked confirmed
    const ans = nextState.answers['phone']
    assert.equal(ans.confirmed, false, 'Unconfirmed sensitive field must never be marked confirmed!')
    assert.equal(ans.needsOperatorHelp, true, 'Field must be marked needsOperatorHelp')
    assert.equal(nextState.pendingConfirmation, null)
  })

  it('silence during confirmation counts as unclear and NEVER as yes', () => {
    const base = getBaseState()
    base.state = STATES.PROCESSING_CONFIRM
    base.pendingConfirmation = {
      fieldId: 'phone',
      value: '9876543210',
      confirmAttempts: 0,
      nextField: mockField2,
    }

    const nextState = conversationReducer(base, {
      type: 'CONFIRM_ANSWER',
      payload: { answer: 'unclear' }, // silence translates to unclear
    })

    assert.notEqual(nextState.state, STATES.SPEAKING_QUESTION)
    assert.equal(nextState.answers['phone']?.confirmed, undefined)
  })
})
