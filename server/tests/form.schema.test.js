import assert from 'node:assert/strict'
import test from 'node:test'
import { getSpokenFields, loadForm, validateFormSchema } from '../forms/formEngine.js'

test('Form Schema Tests (pension.json)', async (t) => {
  const form = loadForm('pension')

  await t.test('form loads and passes top-level schema validation', () => {
    assert.equal(form.id, 'pension')
    assert.ok(form.title)
    assert.ok(form.titleTa)
    assert.ok(form.version)
    assert.ok(form.disclaimer)
    assert.ok(Array.isArray(form.fields))
    assert.equal(form.fields.length, 16)
  })

  await t.test('all field IDs are unique and snake_case', () => {
    const ids = form.fields.map((f) => f.id)
    const uniqueIds = new Set(ids)
    assert.equal(uniqueIds.size, ids.length, 'Every field ID must be strictly unique')

    for (const id of ids) {
      assert.match(id, /^[a-z0-9_]+$/, `Field ID "${id}" must be lowercase snake_case`)
    }
  })

  await t.test('all field orders are strictly unique positive integers', () => {
    const orders = form.fields.map((f) => f.order)
    const uniqueOrders = new Set(orders)
    assert.equal(uniqueOrders.size, orders.length, 'Field order numbers must be strictly unique')

    for (const o of orders) {
      assert.ok(Number.isInteger(o) && o >= 1, `Order "${o}" must be positive integer`)
    }
  })

  await t.test('every spoken field has Tamil and English question, helpPrompt, and readback', () => {
    const spoken = getSpokenFields(form)
    assert.equal(spoken.length, 12, 'Must have exactly 12 spoken fields')

    for (const f of spoken) {
      assert.ok(f.question?.ta?.trim(), `Field "${f.id}" missing Tamil question`)
      assert.ok(f.question?.en?.trim(), `Field "${f.id}" missing English question`)
      assert.ok(f.helpPrompt?.ta?.trim(), `Field "${f.id}" missing Tamil help prompt`)
      assert.ok(f.helpPrompt?.en?.trim(), `Field "${f.id}" missing English help prompt`)
      assert.ok(f.readback?.ta?.includes('{value}'), `Field "${f.id}" missing {value} in Tamil readback`)
      assert.ok(f.readback?.en?.includes('{value}'), `Field "${f.id}" missing {value} in English readback`)
      assert.equal(f.skipReason, null, `Spoken field "${f.id}" should have null skipReason`)
    }
  })

  await t.test('every unspoken field provides a skipReason and confirm="never"', () => {
    const unspoken = form.fields.filter((f) => !f.spoken)
    assert.equal(unspoken.length, 4, 'Must have exactly 4 unspoken fields')

    for (const f of unspoken) {
      assert.ok(f.skipReason?.trim(), `Unspoken field "${f.id}" missing skipReason`)
      assert.equal(f.confirm, 'never', `Unspoken field "${f.id}" should have confirm="never"`)
    }
  })

  await t.test('schema validator catches duplicate IDs and missing fields', () => {
    const invalidForm = {
      id: 'test',
      title: 'Test',
      titleTa: 'டெஸ்ட்',
      language: 'ta-IN',
      version: '1.0',
      source: 'test',
      disclaimer: 'test',
      fields: [
        {
          id: 'field_one',
          order: 1,
          type: 'name',
          required: true,
          spoken: true,
          labels: { en: 'One', ta: 'ஒன்று' },
          question: { ta: 'கேள்வி', en: 'Question' },
          helpPrompt: { ta: 'உதவி', en: 'Help' },
          readback: { ta: '{value}', en: '{value}' },
        },
        {
          id: 'field_one', // duplicate ID
          order: 1, // duplicate order
          type: 'invalid_type',
          required: true,
          spoken: false,
          // missing skipReason
        },
      ],
    }

    assert.throws(
      () => validateFormSchema(invalidForm),
      /Schema validation failed/i
    )
  })
})
