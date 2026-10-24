import assert from 'node:assert/strict'
import test, { after, before, describe } from 'node:test'
import app from '../index.js'

describe('POST /api/form/:id/answer Route Tests', () => {
  let server
  let baseUrl

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port
        baseUrl = `http://127.0.0.1:${port}`
        resolve()
      })
    })
  })

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('valid name answer returns value, display, and valid=true', async () => {
    const res = await fetch(`${baseUrl}/api/form/pension/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fieldId: 'applicant_name',
        transcript: 'என் பெயர் கே. முத்துலட்சுமி',
      }),
    })

    assert.equal(res.status, 200)
    const data = await res.json()
    assert.equal(data.valid, true)
    assert.equal(data.validationError, null)
    assert.ok(typeof data.value === 'string' && data.value.length > 0)
    assert.equal(data.display, data.value)
  })

  test('valid sensitive answer (aadhaar) returns masked display (•••• •••• XXXX)', async () => {
    const res = await fetch(`${baseUrl}/api/form/pension/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fieldId: 'aadhaar',
        transcript: '0000 0000 0001',
      }),
    })

    assert.equal(res.status, 200)
    const data = await res.json()
    assert.equal(data.valid, true)
    assert.equal(data.validationError, null)
    assert.equal(data.display, '•••• •••• 0001')
  })

  test('invalid phone answer returns valid=false and error code', async () => {
    const res = await fetch(`${baseUrl}/api/form/pension/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fieldId: 'phone',
        transcript: '12345',
      }),
    })

    assert.equal(res.status, 200)
    const data = await res.json()
    assert.equal(data.valid, false)
    assert.ok(data.validationError)
  })

  test('empty transcript on required field returns valid=false and validationError=REQUIRED', async () => {
    const res = await fetch(`${baseUrl}/api/form/pension/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fieldId: 'applicant_name',
        transcript: '',
      }),
    })

    assert.equal(res.status, 200)
    const data = await res.json()
    assert.equal(data.valid, false)
    assert.equal(data.validationError, 'REQUIRED')
  })

  test('unknown field returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/form/pension/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fieldId: 'non_existent_field',
        transcript: 'some answer',
      }),
    })

    assert.equal(res.status, 404)
    const data = await res.json()
    assert.ok(data.error)
  })

  test('unknown form returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/form/unknown_form/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fieldId: 'applicant_name',
        transcript: 'some answer',
      }),
    })

    assert.equal(res.status, 404)
    const data = await res.json()
    assert.ok(data.error)
  })
})
