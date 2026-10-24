import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { loadForm, validateAnswer } from '../forms/formEngine.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadFakeApplicants() {
  const possiblePaths = [
    path.resolve(__dirname, '../tests/fixtures/fake_applicants.json'),
    path.resolve(__dirname, '../../tests/fixtures/fake_applicants.json'),
    path.resolve(__dirname, '../../../tests/fixtures/fake_applicants.json'),
  ]

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8')).applicants
    }
  }
  throw new Error('Could not find fake_applicants.json')
}

test('Fake Applicants Fixtures Validation Report', async (t) => {
  const form = loadForm('pension')
  const applicants = loadFakeApplicants()
  assert.ok(Array.isArray(applicants) && applicants.length > 0)

  // Map fixture properties to form field IDs
  const propToFieldMap = {
    name: 'applicant_name',
    husband_name: 'parent_spouse_name',
    age: 'date_of_birth', // Fixture provides age number rather than ISO date
    village: 'village',
    phone: 'phone',
    bank_account: 'bank_account',
    aadhaar: 'aadhaar',
  }

  const report = []

  for (const applicant of applicants) {
    const applicantReport = { id: applicant.id, passed: [], failed: [] }

    for (const [prop, val] of Object.entries(applicant)) {
      if (prop === 'id') continue
      const fieldId = propToFieldMap[prop]
      const fieldDef = form.fields.find((f) => f.id === fieldId)

      if (!fieldDef) {
        applicantReport.failed.push({
          prop,
          val,
          error: 'NO_FIELD_MAPPING',
          reason: `No field definition found for "${prop}"`,
        })
        continue
      }

      const result = validateAnswer(fieldDef, val)
      if (result.ok) {
        applicantReport.passed.push({ fieldId, val, normalized: result.value })
      } else {
        applicantReport.failed.push({
          fieldId,
          val,
          error: result.error,
          reason: result.message?.en || result.error,
        })
      }
    }

    report.push(applicantReport)
  }

  // Acceptance Check 6: Log detailed report of fixture agreements and discrepancies
  console.log('\n--- Fake Applicants Validation Report ---')
  let totalProps = 0
  let totalPass = 0
  let totalFail = 0

  for (const r of report) {
    totalProps += r.passed.length + r.failed.length
    totalPass += r.passed.length
    totalFail += r.failed.length

    const status = r.failed.length === 0 ? 'ALL VALID' : `HAS ${r.failed.length} FAILURES`
    console.log(`[Applicant ${r.id}] ${status}`)
    for (const p of r.passed) {
      console.log(`  ✓ ${p.fieldId}: "${p.val}" -> "${p.normalized}"`)
    }
    for (const f of r.failed) {
      console.log(`  ✗ ${f.fieldId}: "${f.val}" failed with ${f.error} (${f.reason})`)
    }
  }
  console.log(`\nSummary: ${totalPass}/${totalProps} fields passed validation.`)
  console.log(`Note: "age" fails date_of_birth validation because the fixture contains an integer age (e.g. 68) instead of an ISO date string (YYYY-MM-DD).\n`)

  await t.test('phone, bank_account, aadhaar, name, and village pass for all fixtures', () => {
    for (const r of report) {
      const failuresExcludingAge = r.failed.filter((f) => f.fieldId !== 'date_of_birth')
      assert.equal(
        failuresExcludingAge.length,
        0,
        `Applicant ${r.id} had unexpected failures: ${JSON.stringify(failuresExcludingAge)}`
      )
    }
  })
})
