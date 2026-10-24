import { describe, it } from 'node:test'
import assert from 'node:assert'
import { extractDate } from '../llm/extractors/date.js'

describe('Spoken Date Extractor Unit Tests (at least 20 cases)', () => {
  it('1: Day Month Year "5 May 1958"', () => {
    const res = extractDate('5 May 1958')
    assert.strictEqual(res.value, '1958-05-05')
    assert.strictEqual(res.valid, true)
  })

  it('2: Month Day Year "May 5th 1958"', () => {
    const res = extractDate('May 5th 1958')
    assert.strictEqual(res.value, '1958-05-05')
    assert.strictEqual(res.valid, true)
  })

  it('3: Tamil word order "1958 la May 5"', () => {
    const res = extractDate('1958 la May 5')
    assert.strictEqual(res.value, '1958-05-05')
    assert.strictEqual(res.valid, true)
  })

  it('4: Slash format "05/05/1958"', () => {
    const res = extractDate('05/05/1958')
    assert.strictEqual(res.value, '1958-05-05')
    assert.strictEqual(res.valid, true)
  })

  it('5: Dash format Indian independence "15-08-1947"', () => {
    const res = extractDate('15-08-1947')
    assert.strictEqual(res.value, '1947-08-15')
    assert.strictEqual(res.valid, true)
  })

  it('6: Slash format Republic day "26/01/1950"', () => {
    const res = extractDate('26/01/1950')
    assert.strictEqual(res.value, '1950-01-26')
    assert.strictEqual(res.valid, true)
  })

  it('7: Valid leap year day "29 February 1960"', () => {
    const res = extractDate('29 February 1960')
    assert.strictEqual(res.value, '1960-02-29')
    assert.strictEqual(res.valid, true)
  })

  it('8: Invalid leap year day "29 February 1961" rejected', () => {
    const res = extractDate('29 February 1961')
    assert.strictEqual(res.valid, false)
    assert.strictEqual(res.validationError, 'INVALID_DAY')
  })

  it('9: Impossible day "31 April 1965" rejected', () => {
    const res = extractDate('31 April 1965')
    assert.strictEqual(res.valid, false)
    assert.strictEqual(res.validationError, 'INVALID_DAY')
  })

  it('10: Future birth date "10 May 2055" rejected', () => {
    const res = extractDate('10 May 2055')
    assert.strictEqual(res.valid, false)
    assert.strictEqual(res.validationError, 'FUTURE_DATE')
  })

  it('11: Tamil script month "1958 மே 5"', () => {
    const res = extractDate('1958 மே 5')
    assert.strictEqual(res.value, '1958-05-05')
    assert.strictEqual(res.valid, true)
  })

  it('12: Tamil solar calendar month "15 சித்திரை 1958"', () => {
    const res = extractDate('15 சித்திரை 1958')
    assert.strictEqual(res.value, '1958-04-15')
    assert.strictEqual(res.valid, true)
  })

  it('13: Roman Tamil month "10 Aippasi 1952"', () => {
    const res = extractDate('10 Aippasi 1952')
    assert.strictEqual(res.value, '1952-10-10')
    assert.strictEqual(res.valid, true)
  })

  it('14: Roman phonetic Tamil month "1960 la Maarch 20"', () => {
    const res = extractDate('1960 la Maarch 20')
    assert.strictEqual(res.value, '1960-03-20')
    assert.strictEqual(res.valid, true)
  })

  it('15: Spoken English year "nineteen fifty-eight May five"', () => {
    const res = extractDate('nineteen fifty-eight May five')
    assert.strictEqual(res.value, '1958-05-05')
    assert.strictEqual(res.valid, true)
  })

  it('16: Speech self-correction "March la... illai, May 5 1958"', () => {
    const res = extractDate('March la... illai, May 5 1958')
    assert.strictEqual(res.value, '1958-05-05')
    assert.strictEqual(res.valid, true)
  })

  it('17: DD/MM vs MM/DD ambiguity flagged "04/06/1955"', () => {
    const res = extractDate('04/06/1955')
    assert.strictEqual(res.value, '1955-06-04')
    assert.strictEqual(res.ambiguous, true)
    assert.strictEqual(res.needsConfirmation, true)
  })

  it('18: Year-only partial date "year 1958"', () => {
    const res = extractDate('year 1958')
    assert.strictEqual(res.value, null)
    assert.strictEqual(res.partial, true)
    assert.deepStrictEqual(res.missing, ['month', 'day'])
    assert.strictEqual(res.needsConfirmation, true)
  })

  it('19: Month and year partial date "May 1958"', () => {
    const res = extractDate('May 1958')
    assert.strictEqual(res.value, null)
    assert.strictEqual(res.partial, true)
    assert.deepStrictEqual(res.missing, ['day'])
    assert.strictEqual(res.needsConfirmation, true)
  })

  it('20: Age-only answer "enakku 70 vayasu" does not fabricate birth date', () => {
    const res = extractDate('enakku 70 vayasu')
    assert.strictEqual(res.value, null)
    assert.strictEqual(res.type, 'age_only')
    assert.strictEqual(res.age, 70)
    assert.strictEqual(res.needsConfirmation, true)
  })

  it('21: Age-only Tamil answer "வயது 68" does not fabricate birth date', () => {
    const res = extractDate('வயது 68')
    assert.strictEqual(res.value, null)
    assert.strictEqual(res.type, 'age_only')
    assert.strictEqual(res.age, 68)
  })

  it('22: Two-digit year "May 5th 58" flags ambiguity with both century candidates', () => {
    const res = extractDate('May 5th 58')
    assert.strictEqual(res.value, null)
    assert.strictEqual(res.ambiguous, true)
    assert.deepStrictEqual(res.twoDigitCandidates, ['1958', '2058'])
    assert.strictEqual(res.needsConfirmation, true)
  })
})
