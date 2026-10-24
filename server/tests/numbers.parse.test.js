import { describe, it } from 'node:test'
import assert from 'node:assert'
import { parseSpokenNumbers, expandRepetitions, normalizeNumberGlyphs } from '../llm/numbers/parse.js'

describe('Number Word Parser Unit Tests', () => {
  describe('English number cases (at least 12)', () => {
    const cases = [
      { text: 'twenty five', expectedDigits: '25' },
      { text: 'one hundred and two', expectedDigits: '102' },
      { text: 'seventy', expectedDigits: '70' },
      { text: 'six', expectedDigits: '6' },
      { text: 'zero', expectedDigits: '0' },
      { text: 'ninety nine', expectedDigits: '99' },
      { text: 'one thousand', expectedDigits: '1000' },
      { text: 'fourteen', expectedDigits: '14' },
      { text: 'eighty three', expectedDigits: '83' },
      { text: 'five hundred', expectedDigits: '500' },
      { text: 'forty two', expectedDigits: '42' },
      { text: 'ten', expectedDigits: '10' },
      { text: 'nine three four five', expectedDigits: '9345' },
    ]

    cases.forEach(({ text, expectedDigits }, idx) => {
      it(`EN-${idx + 1}: parses "${text}" -> "${expectedDigits}"`, () => {
        const res = parseSpokenNumbers(text)
        assert.strictEqual(res.digits, expectedDigits)
      })
    })
  })

  describe('Tamil and mixed number cases (at least 12)', () => {
    const cases = [
      { text: 'onnu', expectedDigits: '1' },
      { text: 'rendu', expectedDigits: '2' },
      { text: 'ஒன்று', expectedDigits: '1' },
      { text: 'இரண்டு', expectedDigits: '2' },
      { text: '௧ ௨ ௩', expectedDigits: '123' },
      { text: 'pathu', expectedDigits: '10' },
      { text: 'irubadhu aindhu', expectedDigits: '25' },
      { text: 'muppathi anju', expectedDigits: '35' },
      { text: 'aimbadhu', expectedDigits: '50' },
      { text: 'ஆறு', expectedDigits: '6' },
      { text: 'ஏழு எட்டு', expectedDigits: '78' },
      { text: '2 lakh 50 thousand', expectedDigits: '250000' },
      { text: 'பத்து', expectedDigits: '10' },
    ]

    cases.forEach(({ text, expectedDigits }, idx) => {
      it(`TA-${idx + 1}: parses "${text}" -> "${expectedDigits}"`, () => {
        const res = parseSpokenNumbers(text)
        assert.strictEqual(res.digits, expectedDigits)
      })
    })
  })

  describe('Double and triple repetition cases (at least 6)', () => {
    const cases = [
      { text: 'double five', expectedDigits: '55' },
      { text: 'triple zero', expectedDigits: '000' },
      { text: 'double 7', expectedDigits: '77' },
      { text: 'triple eight', expectedDigits: '888' },
      { text: 'double nine', expectedDigits: '99' },
      { text: 'டபுள் five', expectedDigits: '55' },
    ]

    cases.forEach(({ text, expectedDigits }, idx) => {
      it(`REP-${idx + 1}: expands and parses "${text}" -> "${expectedDigits}"`, () => {
        const res = parseSpokenNumbers(text)
        assert.strictEqual(res.digits, expectedDigits)
      })
    })
  })

  describe('Lakh and crore cases (at least 6)', () => {
    const cases = [
      { text: 'one lakh', expectedDigits: '100000' },
      { text: 'two crore', expectedDigits: '20000000' },
      { text: '5 lakh', expectedDigits: '500000' },
      { text: '10 crore', expectedDigits: '100000000' },
      { text: 'rendu latcham', expectedDigits: '200000' },
      { text: 'ஒரு கோடி', expectedDigits: '10000000' },
    ]

    cases.forEach(({ text, expectedDigits }, idx) => {
      it(`SCALE-${idx + 1}: scales "${text}" -> "${expectedDigits}"`, () => {
        const res = parseSpokenNumbers(text)
        assert.strictEqual(res.digits, expectedDigits)
      })
    })
  })
})
