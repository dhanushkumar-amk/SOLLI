import assert from 'node:assert/strict'
import test, { describe } from 'node:test'
import { SCRIPT_VARIANTS } from '../llm/lexicon.js'
import {
  cleanUnicodeAndWhitespace,
  detectAndApplySelfCorrection,
  isNoiseTranscript,
  normalizeTranscript,
  removeFillers,
} from '../llm/normalize.js'

describe('Normalisation Layer Unit Tests', () => {
  describe('Fillers removal (at least 8 cases)', () => {
    test('1: removes "um" at start', () => {
      assert.equal(removeFillers('um Muthulakshmi'), 'Muthulakshmi')
    })
    test('2: removes "uh" in middle', () => {
      assert.equal(removeFillers('Demo uh Balan'), 'Demo Balan')
    })
    test('3: removes "so" filler', () => {
      assert.equal(removeFillers('so Kaatruvilai'), 'Kaatruvilai')
    })
    test('4: removes "ennada" filler', () => {
      assert.equal(removeFillers('ennada Murugan'), 'Murugan')
    })
    test('5: removes "appo" filler', () => {
      assert.equal(removeFillers('appo Salem'), 'Salem')
    })
    test('6: removes polite "sir" / "madam"', () => {
      assert.equal(removeFillers('sir Kannan'), 'Kannan')
      assert.equal(removeFillers('madam Selvi'), 'Selvi')
    })
    test('7: removes "noise" prefix token from fixtures', () => {
      assert.equal(removeFillers('noise 1 Example Street'), '1 Example Street')
    })
    test('8: removes multiple chained fillers', () => {
      assert.equal(removeFillers('uh um so Chennai'), 'Chennai')
    })
  })

  describe('Script variants handling (at least 8 cases)', () => {
    test('1: Tamil affirmative ஆமா -> yes', () => {
      assert.equal(SCRIPT_VARIANTS['ஆமா'], 'yes')
    })
    test('2: Tamil formal affirmative ஆம் / ஆமாம் -> yes', () => {
      assert.equal(SCRIPT_VARIANTS['ஆம்'], 'yes')
      assert.equal(SCRIPT_VARIANTS['ஆமாம்'], 'yes')
    })
    test('3: Roman script affirmative aama -> yes', () => {
      assert.equal(SCRIPT_VARIANTS['aama'], 'yes')
    })
    test('4: Casual affirmative sari / சரி -> yes', () => {
      assert.equal(SCRIPT_VARIANTS['sari'], 'yes')
      assert.equal(SCRIPT_VARIANTS['சரி'], 'yes')
    })
    test('5: Tamil negative இல்லை / இல்ல -> no', () => {
      assert.equal(SCRIPT_VARIANTS['இல்லை'], 'no')
      assert.equal(SCRIPT_VARIANTS['இல்ல'], 'no')
    })
    test('6: Roman script negative illai / illa -> no', () => {
      assert.equal(SCRIPT_VARIANTS['illai'], 'no')
      assert.equal(SCRIPT_VARIANTS['illa'], 'no')
    })
    test('7: Tamil gender பெண் -> Female', () => {
      assert.equal(SCRIPT_VARIANTS['பெண்'], 'Female')
    })
    test('8: Tamil gender ஆண் -> Male', () => {
      assert.equal(SCRIPT_VARIANTS['ஆண்'], 'Male')
    })
  })

  describe('Noise detection (at least 8 cases)', () => {
    test('1: empty string is noise', () => {
      assert.equal(isNoiseTranscript(''), true)
    })
    test('2: single character is noise', () => {
      assert.equal(isNoiseTranscript('a'), true)
    })
    test('3: punctuation only "..." is noise', () => {
      assert.equal(isNoiseTranscript('...'), true)
    })
    test('4: question marks "???" is noise', () => {
      assert.equal(isNoiseTranscript('???'), true)
    })
    test('5: whitespace with dashes "---" is noise', () => {
      assert.equal(isNoiseTranscript('---'), true)
    })
    test('6: single filler word "uh" alone is noise', () => {
      assert.equal(isNoiseTranscript('uh'), true)
    })
    test('7: single filler word "um" alone is noise', () => {
      assert.equal(isNoiseTranscript('um'), true)
    })
    test('8: legitimate word "Kannan" is NOT noise', () => {
      assert.equal(isNoiseTranscript('Kannan'), false)
    })
  })

  describe('Self-correction detection (at least 8 cases)', () => {
    test('1: Tamil marker "illai" detects correction', () => {
      const res = detectAndApplySelfCorrection('March la... illai, May 5')
      assert.equal(res.isCorrection, true)
      assert.equal(res.text, 'May 5')
    })
    test('2: Tamil marker "illa" detects correction', () => {
      const res = detectAndApplySelfCorrection('Raman illa Lakshmanan')
      assert.equal(res.isCorrection, true)
      assert.equal(res.text, 'Lakshmanan')
    })
    test('3: English marker "no no" detects correction', () => {
      const res = detectAndApplySelfCorrection('12 North Street no no 14 South Street')
      assert.equal(res.isCorrection, true)
      assert.equal(res.text, '14 South Street')
    })
    test('4: Marker "sorry" detects correction', () => {
      const res = detectAndApplySelfCorrection('Male sorry Female')
      assert.equal(res.isCorrection, true)
      assert.equal(res.text, 'Female')
    })
    test('5: Marker "wait" detects correction', () => {
      const res = detectAndApplySelfCorrection('Madurai wait Coimbatore')
      assert.equal(res.isCorrection, true)
      assert.equal(res.text, 'Coimbatore')
    })
    test('6: Marker "i mean" detects correction', () => {
      const res = detectAndApplySelfCorrection('Kumar i mean Murugan')
      assert.equal(res.isCorrection, true)
      assert.equal(res.text, 'Murugan')
    })
    test('7: Tamil marker "thappu" detects correction', () => {
      const res = detectAndApplySelfCorrection('Anbu thappu Ezhil')
      assert.equal(res.isCorrection, true)
      assert.equal(res.text, 'Ezhil')
    })
    test('8: clean text without markers flags isCorrection false', () => {
      const res = detectAndApplySelfCorrection('K. Muthulakshmi')
      assert.equal(res.isCorrection, false)
      assert.equal(res.text, 'K. Muthulakshmi')
    })
  })

  describe('Unicode & zero-width cleaning', () => {
    test('strips zero-width space and non-joiner', () => {
      const dirty = 'Mu\u200Bthu\u200Clakshmi'
      assert.equal(cleanUnicodeAndWhitespace(dirty), 'Muthulakshmi')
    })
  })
})
