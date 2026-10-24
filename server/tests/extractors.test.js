import assert from 'node:assert/strict'
import test, { describe } from 'node:test'
import {
  extractAddress,
  extractChoice,
  extractName,
  extractText,
  extractYesNo,
} from '../llm/extractors/index.js'

describe('Dedicated Per-Type Extractors', () => {
  describe('Name Extractor', () => {
    test('1: clean full name preserved', () => {
      const res = extractName('Demo Anbu One')
      assert.equal(res.value, 'Demo Anbu One')
    })

    test('2: initials preserved: K. Muthulakshmi', () => {
      const res = extractName('K. Muthulakshmi')
      assert.equal(res.value, 'K. Muthulakshmi')
    })

    test('3: single letter initial without dot formatted: K Muthulakshmi -> K. Muthulakshmi', () => {
      const res = extractName('K Muthulakshmi')
      assert.equal(res.value, 'K. Muthulakshmi')
    })

    test('4: Tamil name preserved: முத்துலட்சுமி', () => {
      const res = extractName('முத்துலட்சுமி')
      assert.equal(res.value, 'முத்துலட்சுமி')
    })

    test('5: Tamil name with Tamil initial: க. முத்துலட்சுமி', () => {
      const res = extractName('க. முத்துலட்சுமி')
      assert.equal(res.value, 'க. முத்துலட்சுமி')
    })

    test('6: strips leading conversational prefix "en peru"', () => {
      const res = extractName('en peru Murugan')
      assert.equal(res.value, 'Murugan')
    })

    test('7: strips leading prefix "my name is"', () => {
      const res = extractName('my name is Selvan')
      assert.equal(res.value, 'Selvan')
    })

    test('8: title-cases Latin names: balan two -> Balan Two', () => {
      const res = extractName('balan two')
      assert.equal(res.value, 'Balan Two')
    })

    // Tricky cases
    test('tricky 1: strips leading "naan" prefix', () => {
      const res = extractName('naan Kannan')
      assert.equal(res.value, 'Kannan')
    })

    test('tricky 2: strips trailing polite particle "dhan"', () => {
      const res = extractName('Anbu dhan')
      assert.equal(res.value, 'Anbu')
    })

    test('tricky 3: strips father prefix "appa peru"', () => {
      const res = extractName('appa peru Murugan')
      assert.equal(res.value, 'Murugan')
    })

    test('tricky 4: strips husband prefix "husband name"', () => {
      const res = extractName('husband name Ramasamy')
      assert.equal(res.value, 'Ramasamy')
    })

    test('tricky 5: rejects long sentence as invalid name', () => {
      const res = extractName('naan ippo chennai la irunthu unga kitta pesikittu irukken')
      assert.equal(res.value, null)
      assert.equal(res.confidence < 0.5, true)
    })

    test('tricky 6: empty string returns null', () => {
      const res = extractName('')
      assert.equal(res.value, null)
    })
  })

  describe('Address Extractor', () => {
    test('1: clean address extracted', () => {
      const res = extractAddress('1 Example Street')
      assert.equal(res.value, '1 Example Street')
    })

    test('2: converts spoken leading number "number 2 Example Street" -> "2 Example Street"', () => {
      const res = extractAddress('number 2 Example Street')
      assert.equal(res.value, '2 Example Street')
    })

    test('3: converts number word "eight Example Street" -> "8 Example Street"', () => {
      const res = extractAddress('eight Example Street')
      assert.equal(res.value, '8 Example Street')
    })

    test('4: strips leading prefix "my address"', () => {
      const res = extractAddress('my address 5 North Street')
      assert.equal(res.value, '5 North Street')
    })

    test('5: always marks needsConfirmation = true', () => {
      const res = extractAddress('10 Bazaar Road')
      assert.equal(res.needsConfirmation, true)
    })
  })

  describe('Yes/No Extractor', () => {
    test('1: English "yes" -> yes', () => {
      assert.equal(extractYesNo('yes').value, 'yes')
    })

    test('2: Tamil script "ஆமா" -> yes', () => {
      assert.equal(extractYesNo('ஆமா').value, 'yes')
    })

    test('3: Roman script "aama" -> yes', () => {
      assert.equal(extractYesNo('aama').value, 'yes')
    })

    test('4: Casual affirmative "sari" / "சரி" -> yes', () => {
      assert.equal(extractYesNo('sari').value, 'yes')
      assert.equal(extractYesNo('சரி').value, 'yes')
    })

    test('5: English "no" -> no', () => {
      assert.equal(extractYesNo('no').value, 'no')
    })

    test('6: Tamil script "இல்லை" -> no', () => {
      assert.equal(extractYesNo('இல்லை').value, 'no')
    })

    test('7: Roman script "illai" -> no', () => {
      assert.equal(extractYesNo('illai').value, 'no')
    })

    test('8: Ambiguous "sari, aana illai" -> marks needsConfirmation true', () => {
      const res = extractYesNo('sari, aana illai')
      assert.equal(res.needsConfirmation, true)
      assert.equal(res.value, 'no') // Contrast resolution
    })
  })

  describe('Choice Extractor', () => {
    const fieldDef = {
      id: 'gender',
      validation: { choices: ['Male', 'Female', 'Other'] },
    }

    test('1: exact choice "Female" -> Female', () => {
      assert.equal(extractChoice('Female', { fieldDef }).value, 'Female')
    })

    test('2: case-insensitive "male" -> Male', () => {
      assert.equal(extractChoice('male', { fieldDef }).value, 'Male')
    })

    test('3: Tamil script "பெண்" -> Female', () => {
      assert.equal(extractChoice('பெண்', { fieldDef }).value, 'Female')
    })

    test('4: Tamil script "ஆண்" -> Male', () => {
      assert.equal(extractChoice('ஆண்', { fieldDef }).value, 'Male')
    })

    test('5: Roman Tamil "pen" -> Female', () => {
      assert.equal(extractChoice('pen', { fieldDef }).value, 'Female')
    })

    test('6: fuzzy matching with edit distance: "Femal" -> Female', () => {
      const res = extractChoice('Femal', { fieldDef })
      assert.equal(res.value, 'Female')
      assert.ok(res.confidence >= 0.7)
    })

    test('7: completely unmatching text returns null', () => {
      const res = extractChoice('SomethingElseEntirely', { fieldDef })
      assert.equal(res.value, null)
    })
  })
})
