import assert from 'node:assert/strict'
import app from '../index.js'

async function runTypedModeCheck() {
  console.log('\n============================================================')
  console.log('  ACCEPTANCE CHECK 4: TYPED MODE FORM COMPLETION')
  console.log('============================================================\n')

  const server = app.listen(0)
  const port = server.address().port
  const baseUrl = `http://127.0.0.1:${port}`

  try {
    // 0. Check initial stats
    let statsRes = await (await fetch(`${baseUrl}/api/stats`)).json()
    const initialTranscribeCalls = statsRes.transcribe.calls
    const initialSpeakCalls = statsRes.speak.calls

    // 1. Fetch pension form
    const form = await (await fetch(`${baseUrl}/api/form/pension`)).json()
    assert.equal(form.id, 'pension')
    console.log('✔ Loaded form pension (12 spoken fields)')

    // 2. Question 1: applicant_name -> answer "Muthu"
    let ans1 = await (
      await fetch(`${baseUrl}/api/form/pension/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldId: 'applicant_name', transcript: 'Muthu' }),
      })
    ).json()
    assert.equal(ans1.valid, true)
    console.log('✔ Answered applicant_name: "Muthu"')

    // 3. Test "repeat" command
    let cmdRepeat = await (
      await fetch(`${baseUrl}/api/form/pension/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: 'repeat', state: 'listening', fieldId: 'applicant_name' }),
      })
    ).json()
    assert.equal(cmdRepeat.command, 'repeat')
    console.log('✔ Executed command: repeat')

    // 4. Test "back" command
    let cmdBack = await (
      await fetch(`${baseUrl}/api/form/pension/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: 'back', state: 'listening', fieldId: 'parent_spouse_name' }),
      })
    ).json()
    assert.equal(cmdBack.command, 'back')
    console.log('✔ Executed command: back')

    // 5. Answer phone "9840123450" then apply digit-level correction "last digit is 7"
    let partialPhone = await (
      await fetch(`${baseUrl}/api/form/pension/partial-correction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentValue: '9840123450',
          fieldId: 'phone',
          transcript: 'last digit is 7',
        }),
      })
    ).json()
    assert.equal(partialPhone.handled, true)
    assert.equal(partialPhone.value, '9840123457')
    assert.equal(partialPhone.needsConfirmation, true)
    console.log('✔ Digit-level correction on phone: 9840123450 -> 9840123457 (needs confirmation)')

    // 6. Test change_field: "change the village"
    let cmdChangeVillage = await (
      await fetch(`${baseUrl}/api/form/pension/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: 'change the village',
          state: 'listening',
          fieldId: 'taluk',
        }),
      })
    ).json()
    assert.equal(cmdChangeVillage.command, 'change_field')
    assert.equal(cmdChangeVillage.target, 'village')
    console.log('✔ Executed command: change_field (target: village)')

    // 7. Test dont_know on optional field (nominee)
    let cmdDontKnow = await (
      await fetch(`${baseUrl}/api/form/pension/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: "I don't know",
          state: 'listening',
          fieldId: 'nominee',
        }),
      })
    ).json()
    assert.equal(cmdDontKnow.command, 'dont_know')
    console.log('✔ Executed command: dont_know on nominee')

    // 8. Verify /api/stats (ZERO Gnani calls used in typed mode)
    statsRes = await (await fetch(`${baseUrl}/api/stats`)).json()
    const gnaniCallsUsed =
      (statsRes.transcribe.calls - initialTranscribeCalls) +
      (statsRes.speak.calls - initialSpeakCalls)
    assert.equal(gnaniCallsUsed, 0, `Expected 0 Gnani calls in typed mode, got ${gnaniCallsUsed}`)
    console.log('\n✔ /api/stats verification:');
    console.log('  Transcribe calls:', statsRes.transcribe.calls, '(0 in this run)')
    console.log('  Speak calls:     ', statsRes.speak.calls, '(0 in this run)')
    console.log('  Commands tracked:', statsRes.commands)
    console.log('\nALL TYPED MODE CHECKS PASSED WITH ZERO GNANI CALLS!\n')
  } finally {
    server.close()
  }
}

runTypedModeCheck().catch((err) => {
  console.error(err)
  process.exit(1)
})
