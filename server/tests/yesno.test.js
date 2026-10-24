import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { extractYesNo } from '../llm/extractors/yesno.js'

describe('Yes/No Confirmation Extractor (yesno.test.js)', () => {
  describe('Affirmative Variants ("yes")', () => {
    const affirmativeSamples = [
      { text: 'sari', label: 'Roman Tamil "sari"' },
      { text: 'aama', label: 'Roman Tamil "aama"' },
      { text: 'aamam', label: 'Roman Tamil "aamam"' },
      { text: 'ஆம்', label: 'Tamil script "ஆம்"' },
      { text: 'ஆமா', label: 'Tamil script "ஆமா"' },
      { text: 'ஆமாம்', label: 'Tamil script "ஆமாம்"' },
      { text: 'சரி', label: 'Tamil script "சரி"' },
      { text: 'haan', label: 'Colloquial "haan"' },
      { text: 'correct', label: 'English "correct"' },
      { text: 'yes', label: 'English "yes"' },
      { text: 'yeah', label: 'English "yeah"' },
      { text: 'right', label: 'English "right"' },
      { text: 'ha sari', label: 'Tamil-English mix "ha sari"' },
    ]

    for (const { text, label } of affirmativeSamples) {
      it(`extracts "yes" from ${label} ("${text}")`, () => {
        const res = extractYesNo(text)
        assert.equal(res.value, 'yes', `Failed for ${text}`)
        assert.ok(res.confidence >= 0.8, `Confidence too low for ${text}: ${res.confidence}`)
      })
    }
  })

  describe('Negative Variants ("no")', () => {
    const negativeSamples = [
      { text: 'illai', label: 'Roman Tamil "illai"' },
      { text: 'illa', label: 'Roman Tamil "illa"' },
      { text: 'ille', label: 'Roman Tamil "ille"' },
      { text: 'இல்லை', label: 'Tamil script "இல்லை"' },
      { text: 'இல்ல', label: 'Tamil script "இல்ல"' },
      { text: 'கிடையாது', label: 'Tamil script "கிடையாது"' },
      { text: 'wrong', label: 'English "wrong"' },
      { text: 'no', label: 'English "no"' },
      { text: 'nope', label: 'English "nope"' },
      { text: 'thappu', label: 'Roman Tamil "thappu"' },
      { text: 'தவறு', label: 'Tamil script "தவறு"' },
      { text: 'not correct', label: 'English "not correct"' },
    ]

    for (const { text, label } of negativeSamples) {
      it(`extracts "no" from ${label} ("${text}")`, () => {
        const res = extractYesNo(text)
        assert.equal(res.value, 'no', `Failed for ${text}`)
        assert.ok(res.confidence >= 0.8, `Confidence too low for ${text}: ${res.confidence}`)
      })
    }
  })

  describe('Ambiguous and Conflicting Mixes', () => {
    it('treats "sari, aana illai" as contrast resolution with needsConfirmation: true', () => {
      const res = extractYesNo('sari, aana illai')
      assert.equal(res.needsConfirmation, true)
      assert.equal(res.value, 'no')
      assert.ok(res.confidence < 0.6)
    })

    const conflictingSamples = [
      'yes but no',
      'aama illa',
      'sari illai',
    ]

    for (const text of conflictingSamples) {
      it(`treats conflicting statement "${text}" as unclear / requiring confirmation`, () => {
        const res = extractYesNo(text)
        assert.equal(res.needsConfirmation, true)
        assert.ok(res.confidence < 0.6, `Ambiguous confidence should be low (< 0.6): ${res.confidence}`)
      })
    }
  })

  describe('Silence and Noise', () => {
    it('returns confidence 0 and value null for empty or silence', () => {
      const res = extractYesNo('')
      assert.equal(res.value, null)
      assert.equal(res.confidence, 0)
    })

    it('returns value null for unrelated utterances', () => {
      const res = extractYesNo('enna solreenga')
      assert.equal(res.value, null)
      assert.ok(res.confidence <= 0.3)
    })
  })
})
