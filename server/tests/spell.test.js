import { describe, it } from 'node:test'
import assert from 'node:assert'
import { extractSpelledName } from '../llm/extractors/spell.js'

describe('Spelled-out Name Extractor Unit Tests', () => {
  it('joins letter-by-letter spelling "M U T H U"', () => {
    const res = extractSpelledName('M U T H U')
    assert.strictEqual(res.value, 'Muthu')
    assert.strictEqual(res.valid, true)
    assert.strictEqual(res.isSpelled, true)
  })

  it('handles letter spelling with initial "K space M U T H U"', () => {
    const res = extractSpelledName('K space M U T H U')
    assert.strictEqual(res.value, 'K. Muthu')
    assert.strictEqual(res.valid, true)
  })

  it('handles "dot" verbal token for initial "S dot R A M A N"', () => {
    const res = extractSpelledName('S dot R A M A N')
    assert.strictEqual(res.value, 'S. Raman')
    assert.strictEqual(res.valid, true)
  })

  it('handles long name spelling "M U T H U L A K S H M I"', () => {
    const res = extractSpelledName('M U T H U L A K S H M I')
    assert.strictEqual(res.value, 'Muthulakshmi')
    assert.strictEqual(res.valid, true)
  })

  it('handles multi-word name "R A M A N space K U M A R"', () => {
    const res = extractSpelledName('R A M A N space K U M A R')
    assert.strictEqual(res.value, 'Raman Kumar')
    assert.strictEqual(res.valid, true)
  })

  it('rejects empty or single letter spelling (under min length)', () => {
    const res = extractSpelledName('A')
    assert.strictEqual(res.valid, false)
    assert.strictEqual(res.validationError, 'INSUFFICIENT_LETTERS')
  })
})
