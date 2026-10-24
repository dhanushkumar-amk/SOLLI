import assert from 'node:assert/strict'
import test, { describe } from 'node:test'
import { loadForm } from '../forms/formEngine.js'
import {
  conversationReducer,
  createInitialContext,
  STATES,
} from '../../client/src/conversation/stateMachine.js'

describe('Client State Machine Command Handling (commands.reducer.test.js)', () => {
  const form = loadForm('pension')
  const firstSpoken = form.fields.find((f) => f.spoken)
  const secondSpoken = form.fields.filter((f) => f.spoken)[1]

  function getBaseListeningState() {
    return {
      ...createInitialContext(),
      state: STATES.LISTENING,
      form,
      currentField: firstSpoken,
      currentFieldId: firstSpoken.id,
      answers: {
        [firstSpoken.id]: {
          value: 'Old Value',
          display: 'Old Value',
          confirmed: true,
          attempts: 0,
        },
      },
    }
  }

  test('repeat: replays current question in listening state', () => {
    const s0 = getBaseListeningState()
    const s1 = conversationReducer(s0, {
      type: 'EXECUTE_COMMAND',
      payload: { command: 'repeat' },
    })
    assert.equal(s1.state, STATES.SPEAKING_QUESTION)
    assert.deepEqual(s1.activePromptText, firstSpoken.question)
  })

  test('repeat: replays read-back in listeningConfirm state', () => {
    const s0 = {
      ...getBaseListeningState(),
      state: STATES.LISTENING_CONFIRM,
      pendingConfirmation: {
        fieldId: firstSpoken.id,
        value: 'Test Value',
        readbackText: 'Readback prompt',
      },
    }
    const s1 = conversationReducer(s0, {
      type: 'EXECUTE_COMMAND',
      payload: { command: 'repeat' },
    })
    assert.equal(s1.state, STATES.SPEAKING_READBACK)
    assert.equal(s1.activePromptText.ta, 'Readback prompt')
  })

  test('skip on required field is REFUSED and offers dont_know', () => {
    const requiredField = form.fields.find((f) => f.spoken && f.required)
    const s0 = {
      ...getBaseListeningState(),
      currentField: requiredField,
      currentFieldId: requiredField.id,
    }
    const s1 = conversationReducer(s0, {
      type: 'EXECUTE_COMMAND',
      payload: { command: 'skip' },
    })
    assert.equal(s1.state, STATES.SPEAKING_HELP)
    assert.ok(s1.activePromptText.ta.includes('கண்டிப்பாக தேவை'))
  })

  test('dont_know: marks field needsOperatorHelp with reason "dont_know" and advances', () => {
    const s0 = getBaseListeningState()
    const s1 = conversationReducer(s0, {
      type: 'EXECUTE_COMMAND',
      payload: {
        command: 'dont_know',
        payload: { nextField: secondSpoken, isFinished: false },
      },
    })
    assert.equal(s1.state, STATES.SPEAKING_QUESTION)
    assert.equal(s1.answers[firstSpoken.id].needsOperatorHelp, true)
    assert.equal(s1.answers[firstSpoken.id].reason, 'dont_know')
    assert.equal(s1.answers[firstSpoken.id].value, null)
  })

  test('back: at first field stops at first field', () => {
    const s0 = getBaseListeningState()
    const s1 = conversationReducer(s0, {
      type: 'EXECUTE_COMMAND',
      payload: { command: 'back' },
    })
    assert.equal(s1.currentFieldId, firstSpoken.id)
  })

  test('back: moves to previous spoken field keeping answers intact', () => {
    const s0 = {
      ...getBaseListeningState(),
      currentField: secondSpoken,
      currentFieldId: secondSpoken.id,
    }
    const s1 = conversationReducer(s0, {
      type: 'EXECUTE_COMMAND',
      payload: { command: 'back' },
    })
    assert.equal(s1.currentFieldId, firstSpoken.id)
    assert.equal(s1.answers[firstSpoken.id].value, 'Old Value')
  })

  test('change_field: keeps the old value until new value confirmed (failed attempt does not erase data)', () => {
    const s0 = {
      ...getBaseListeningState(),
      answers: {
        village: { value: 'Madurai', display: 'Madurai', confirmed: true },
      },
    }
    // Command change_field village
    const s1 = conversationReducer(s0, {
      type: 'EXECUTE_COMMAND',
      payload: { command: 'change_field', target: 'village' },
    })
    assert.equal(s1.state, STATES.SPEAKING_QUESTION)
    assert.equal(s1.currentFieldId, 'village')
    // Crucial check: old value is still present!
    assert.equal(s1.answers.village.value, 'Madurai')
  })

  test('start_over: requires confirmation, cancel keeps all data, confirm clears all', () => {
    const s0 = {
      ...getBaseListeningState(),
      answers: {
        applicant_name: { value: 'Muthu', display: 'Muthu' },
        village: { value: 'Madurai', display: 'Madurai' },
      },
    }

    // Step 1: Voice command "start over"
    const s1 = conversationReducer(s0, {
      type: 'EXECUTE_COMMAND',
      payload: { command: 'start_over' },
    })
    assert.equal(s1.state, STATES.CONFIRM_START_OVER)
    assert.equal(s1.showStartOverConfirm, true)

    // Step 2: User says "no" or clicks cancel
    const s2No = conversationReducer(s1, {
      type: 'CONFIRM_START_OVER_NO',
    })
    assert.equal(s2No.state, STATES.LISTENING)
    assert.equal(s2No.answers.applicant_name.value, 'Muthu')
    assert.equal(s2No.answers.village.value, 'Madurai')

    // Step 3: User says "yes" or clicks confirm
    const s2Yes = conversationReducer(s1, {
      type: 'CONFIRM_START_OVER_YES',
    })
    assert.equal(s2Yes.state, STATES.SPEAKING_QUESTION)
    assert.deepEqual(s2Yes.answers, {})
  })

  test('commands are ignored while Solli is actively speaking audio', () => {
    const speakingStates = [
      STATES.SPEAKING_QUESTION,
      STATES.SPEAKING_READBACK,
      STATES.SPEAKING_HELP,
      STATES.SPEAKING_ERROR,
    ]

    for (const st of speakingStates) {
      const s0 = {
        ...getBaseListeningState(),
        state: st,
      }
      const s1 = conversationReducer(s0, {
        type: 'EXECUTE_COMMAND',
        payload: { command: 'repeat' },
      })
      assert.equal(s1.state, st, `Command should be ignored in state ${st}`)
    }
  })

  test('a command is not counted as a failed attempt', () => {
    const s0 = {
      ...getBaseListeningState(),
      answers: {
        [firstSpoken.id]: { value: null, display: '', confirmed: false, attempts: 1 },
      },
    }
    const s1 = conversationReducer(s0, {
      type: 'EXECUTE_COMMAND',
      payload: { command: 'repeat' },
    })
    assert.equal(s1.answers[firstSpoken.id].attempts, 1)
  })
})
