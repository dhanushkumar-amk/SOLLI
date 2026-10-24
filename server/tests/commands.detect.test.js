import assert from 'node:assert/strict'
import test, { describe } from 'node:test'
import { loadForm } from '../forms/formEngine.js'
import { detectCommand, stripFillers } from '../llm/commands/detect.js'

describe('Voice Command Detector (commands.detect.test.js)', () => {
  const form = loadForm('pension')

  describe('Filler Stripping', () => {
    test('strips leading and trailing conversational fillers', () => {
      assert.equal(stripFillers('please repeat sir'), 'repeat')
      assert.equal(stripFillers('konjam thirumba sollunga pa'), 'thirumba sollunga')
      assert.equal(stripFillers('sir meendum sollunga amma'), 'meendum sollunga')
    })

    test('returns empty string if only fillers provided', () => {
      assert.equal(stripFillers('sir please ppa'), '')
    })
  })

  describe('Positive Command Detection', () => {
    const positiveCases = [
      // Repeat (English, Roman Tamil, Tamil script)
      { input: 'repeat', expected: 'repeat' },
      { input: 'again', expected: 'repeat' },
      { input: 'meendum sollunga', expected: 'repeat' },
      { input: 'thirumba sollunga', expected: 'repeat' },
      { input: 'marupadiyum sollunga', expected: 'repeat' },
      { input: 'மீண்டும் சொல்லுங்கள்', expected: 'repeat' },
      { input: 'திரும்ப சொல்லுங்க', expected: 'repeat' },
      // Skip
      { input: 'skip', expected: 'skip' },
      { input: 'next', expected: 'skip' },
      { input: 'aduthadhu', expected: 'skip' },
      { input: 'idha thavirthudunga', expected: 'skip' },
      { input: 'அடுத்தது', expected: 'skip' },
      // Dont Know
      { input: 'dont know', expected: 'dont_know' },
      { input: "I don't know", expected: 'dont_know' },
      { input: 'theriyadhu', expected: 'dont_know' },
      { input: 'theriyala', expected: 'dont_know' },
      { input: 'தெரியாது', expected: 'dont_know' },
      // Back
      { input: 'back', expected: 'back' },
      { input: 'previous', expected: 'back' },
      { input: 'munnadi ponga', expected: 'back' },
      { input: 'pinnadi ponga', expected: 'back' },
      { input: 'முந்தைய கேள்வி', expected: 'back' },
      // Change Field
      { input: 'change the village', expected: 'change_field', target: 'village' },
      { input: 'ooru maathunga', expected: 'change_field', target: 'village' },
      { input: 'change mobile number', expected: 'change_field', target: 'phone' },
      { input: 'change', expected: 'change_field', target: null },
      { input: 'மாத்துங்க', expected: 'change_field', target: null },
      // Help
      { input: 'help', expected: 'help' },
      { input: 'udhavi', expected: 'help' },
      { input: 'உதவி', expected: 'help' },
      { input: 'help please', expected: 'help' },
      // Operator
      { input: 'operator', expected: 'operator' },
      { input: 'officer venum', expected: 'operator' },
      { input: 'adhigaari venum', expected: 'operator' },
      { input: 'ஆபரேட்டர்', expected: 'operator' },
      // Start Over
      { input: 'start over', expected: 'start_over' },
      { input: 'restart', expected: 'start_over' },
      { input: 'modhalilirundhu', expected: 'start_over' },
      { input: 'முதலில் இருந்து ஆரம்பி', expected: 'start_over' },
      // Stop
      { input: 'stop', expected: 'stop' },
      { input: 'pause', expected: 'stop' },
      { input: 'niruthunga', expected: 'stop' },
      { input: 'நிறுத்து', expected: 'stop' },
    ]

    for (const { input, expected, target } of positiveCases) {
      test(`detects "${input}" as command "${expected}"`, () => {
        const res = detectCommand(input, {
          state: 'listening',
          field: { type: 'text' },
          fields: form.fields,
        })
        assert.equal(res.command, expected)
        if (target !== undefined) {
          assert.equal(res.target, target)
        }
      })
    }
  })

  describe('Negative Cases (Answers That Must NOT Become Commands)', () => {
    const negativeCases = [
      { text: 'Skandan', type: 'name', note: 'Name sounding like an' },
      { text: '24 back street', type: 'address', note: 'Address containing back' },
      { text: 'next to temple', type: 'address', note: 'Address containing next' },
      { text: 'bus stop street', type: 'address', note: 'Address containing stop' },
      { text: 'railway stop theru', type: 'address', note: 'Tamil address with stop' },
      { text: 'theriyum', type: 'text', note: 'I know (opposite of theriyadhu)' },
      { text: 'enakku theriyum sir', type: 'text', note: 'Affirmative knowledge' },
      { text: 'Muthu Raman', type: 'name', note: 'Proper person name' },
      { text: 'Kallidaikurichi village', type: 'text', note: 'Village name with village' },
      { text: 'ooru Madurai', type: 'text', note: 'Town answer with ooru prefix' },
      { text: 'en peyar Selvam', type: 'name', note: 'Name with conversational prefix' },
      { text: 'chillara change illa', type: 'text', note: 'Sentence with change' },
      { text: 'en paiyan help pannuvan', type: 'text', note: 'Sentence with help' },
      { text: 'vangi kanakku illai', type: 'text', note: 'Answer stating no bank' },
      { text: 'marupadiyum hospital ponum', type: 'text', note: 'Sentence with marupadiyum' },
      { text: 'This is a long descriptive narrative about residence in the district', type: 'address', note: 'Over-length utterance' },
      { text: 'stop gate theru', type: 'address', note: 'Address with stop gate' },
    ]

    for (const { text, type, note } of negativeCases) {
      test(`NEGATIVE: "${text}" stays an answer (command: null) [${note}]`, () => {
        const res = detectCommand(text, {
          state: 'listening',
          field: { type },
          fields: form.fields,
        })
        assert.equal(
          res.command,
          null,
          `Expected command: null for "${text}" but got: ${res.command}`
        )
      })
    }
  })

  describe('Context-Aware Rules & Gating', () => {
    test('in confirmation state, allows repeat, help, and operator', () => {
      const confirmStates = ['listeningConfirm', 'speakingReadback', 'processingConfirm']
      for (const st of confirmStates) {
        assert.equal(detectCommand('repeat', { state: st }).command, 'repeat')
        assert.equal(detectCommand('help', { state: st }).command, 'help')
        assert.equal(detectCommand('operator', { state: st }).command, 'operator')
      }
    })

    test('in confirmation state, BLOCKS change_field, skip, back, start_over, stop', () => {
      const confirmStates = ['listeningConfirm', 'speakingReadback', 'processingConfirm']
      for (const st of confirmStates) {
        assert.equal(detectCommand('change the village', { state: st, fields: form.fields }).command, null)
        assert.equal(detectCommand('skip', { state: st }).command, null)
        assert.equal(detectCommand('back', { state: st }).command, null)
        assert.equal(detectCommand('start over', { state: st }).command, null)
        assert.equal(detectCommand('stop', { state: st }).command, null)
      }
    })

    test('utterances longer than COMMAND_MAX_WORDS (6) return null', () => {
      const res = detectCommand('please repeat the entire question one more time sir now', {
        state: 'listening',
      })
      assert.equal(res.command, null)
    })

    test('empty, null, or whitespace-only inputs return null', () => {
      assert.equal(detectCommand(null).command, null)
      assert.equal(detectCommand('').command, null)
      assert.equal(detectCommand('   ').command, null)
    })
  })
})
