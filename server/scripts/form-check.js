import { getSpokenFields, loadForm } from '../forms/formEngine.js'

function main() {
  console.log(`\n======================================================`)
  console.log(`Solli Form Schema Checker: pension.json`)
  console.log(`======================================================\n`)

  try {
    const form = loadForm('pension')

    const tableData = form.fields.map((f) => ({
      Order: f.order,
      ID: f.id,
      Type: f.type,
      Spoken: f.spoken ? 'YES' : 'NO',
      Confirm: f.confirm,
      Sensitive: f.sensitive ? 'YES' : 'NO',
      Required: f.required ? 'YES' : 'NO',
    }))

    console.table(tableData)

    const spokenFields = getSpokenFields(form)
    const nonSpokenFields = form.fields.filter((f) => !f.spoken)

    console.log(`\n---------------- Form Summary ----------------`)
    console.log(`Form ID:            ${form.id}`)
    console.log(`Title:              ${form.title} (${form.titleTa})`)
    console.log(`Total Fields:       ${form.fields.length}`)
    console.log(`Spoken Fields:      ${spokenFields.length}`)
    console.log(`Non-Spoken Fields:  ${nonSpokenFields.length}`)
    console.log(`Schema Validation:  PASSED (No violations found)`)
    console.log(`----------------------------------------------\n`)

    process.exit(0)
  } catch (err) {
    console.error(`\n❌ FORM SCHEMA CHECK FAILED:\n${err.message}\n`)
    process.exit(1)
  }
}

main()
