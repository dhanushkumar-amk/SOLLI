import assert from 'node:assert/strict'
import { GNANI_CONFIG } from '../config.js'
import { buildReadback, getReadbackAudioParts, loadForm } from '../forms/formEngine.js'

async function liveRun() {
  console.log('=== PHASE 11: LIVE VOICE RUN ON 3 FIELDS ===')
  console.log('Budget guard: Max 12 live API calls. Reporting each call.\n')

  const BASE_URL = 'http://localhost:5000'
  const form = loadForm('pension')

  const statsStart = await fetch(`${BASE_URL}/api/stats`).then((r) => r.json())
  const startLiveCalls = statsStart.liveCallsInLastHour
  console.log(`Initial live calls in last hour: ${startLiveCalls}\n`)

  const stepsReport = []

  // -------------------------------------------------------------
  // FIELD 1: Applicant Name
  // -------------------------------------------------------------
  console.log('--- 1. Field: applicant_name ("ரங்கநாதன்") ---')
  const fieldName = form.fields.find((f) => f.id === 'applicant_name')
  const nameParts = getReadbackAudioParts(fieldName, 'ரங்கநாதன்', 'ta')

  // Live Call 1: Dynamic value read-back
  console.log('[LIVE CALL 1] Requesting Timbre TTS for dynamic value: "' + nameParts.valuePrompt + '"')
  const t0 = Date.now()
  const nameValRes = await fetch(`${BASE_URL}/api/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: nameParts.valuePrompt,
      sensitive: true,
      noCache: true,
      isReadback: true,
    }),
  })
  const latNameVal = Number(nameValRes.headers.get('X-Latency-Ms')) || (Date.now() - t0)
  const cacheNameVal = nameValRes.headers.get('X-Cache')
  assert.equal(nameValRes.ok, true)
  assert.equal(cacheNameVal, 'MISS')
  console.log(`-> Dynamic read-back spoken. Latency: ${latNameVal}ms, Cache: ${cacheNameVal}`)
  stepsReport.push({ step: 'applicant_name dynamic readback', latencyMs: latNameVal, cache: cacheNameVal })

  // Live Call 2: Static confirmation prompt (first time -> MISS, populates cache)
  console.log('[LIVE CALL 2] Requesting Timbre TTS for static prompt: "' + nameParts.staticConfirmPrompt + '"')
  const t1 = Date.now()
  const staticRes1 = await fetch(`${BASE_URL}/api/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: nameParts.staticConfirmPrompt,
      sensitive: false,
      noCache: false,
      isReadback: true,
    }),
  })
  const latStatic1 = Number(staticRes1.headers.get('X-Latency-Ms')) || (Date.now() - t1)
  const cacheStatic1 = staticRes1.headers.get('X-Cache')
  assert.equal(staticRes1.ok, true)
  console.log(`-> Static prompt spoken. Latency: ${latStatic1}ms, Cache: ${cacheStatic1}`)
  stepsReport.push({ step: 'static confirm prompt (initial)', latencyMs: latStatic1, cache: cacheStatic1 })

  // Confirmation with "aama"
  const tConf1 = Date.now()
  const confName = await fetch(`${BASE_URL}/api/form/pension/confirm-input`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fieldId: 'applicant_name', transcript: 'aama' }),
  }).then((r) => r.json())
  const latConf1 = Date.now() - tConf1
  assert.equal(confName.answer, 'yes')
  console.log(`-> Confirmation transcript "aama" processed: answer="${confName.answer}" (${latConf1}ms)`)
  stepsReport.push({ step: 'confirm "aama" -> yes', latencyMs: latConf1, cache: 'N/A' })

  // -------------------------------------------------------------
  // FIELD 2: Date of Birth
  // -------------------------------------------------------------
  console.log('\n--- 2. Field: date_of_birth ("15 மே 1958") ---')
  const fieldDob = form.fields.find((f) => f.id === 'date_of_birth')
  const dobParts = getReadbackAudioParts(fieldDob, '1958-05-15', 'ta')

  // Live Call 3: Dynamic date read-back
  console.log('[LIVE CALL 3] Requesting Timbre TTS for date readback: "' + dobParts.valuePrompt + '"')
  const t2 = Date.now()
  const dobValRes = await fetch(`${BASE_URL}/api/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: dobParts.valuePrompt,
      sensitive: true,
      noCache: true,
      isReadback: true,
    }),
  })
  const latDobVal = Number(dobValRes.headers.get('X-Latency-Ms')) || (Date.now() - t2)
  const cacheDobVal = dobValRes.headers.get('X-Cache')
  assert.equal(dobValRes.ok, true)
  assert.equal(cacheDobVal, 'MISS')
  console.log(`-> Date read-back spoken. Latency: ${latDobVal}ms, Cache: ${cacheDobVal}`)
  stepsReport.push({ step: 'date_of_birth dynamic readback', latencyMs: latDobVal, cache: cacheDobVal })

  // Static confirmation prompt (Second time -> CACHE HIT! 0 credits)
  console.log('[CACHE CHECK] Requesting static prompt (expected cache HIT)...')
  const t3 = Date.now()
  const staticRes2 = await fetch(`${BASE_URL}/api/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: dobParts.staticConfirmPrompt,
      sensitive: false,
      noCache: false,
      isReadback: true,
    }),
  })
  const latStatic2 = Number(staticRes2.headers.get('X-Latency-Ms')) || (Date.now() - t3)
  const cacheStatic2 = staticRes2.headers.get('X-Cache')
  assert.equal(staticRes2.ok, true)
  assert.equal(cacheStatic2, 'HIT', 'Expected cache HIT for static confirm prompt')
  console.log(`-> Static prompt retrieved from cache! Latency: ${latStatic2}ms, Cache: ${cacheStatic2}`)
  stepsReport.push({ step: 'static confirm prompt (cached)', latencyMs: latStatic2, cache: cacheStatic2 })

  // User says "illai" -> re-asks
  const tConf2 = Date.now()
  const confDob = await fetch(`${BASE_URL}/api/form/pension/confirm-input`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fieldId: 'date_of_birth', transcript: 'illai' }),
  }).then((r) => r.json())
  const latConf2 = Date.now() - tConf2
  assert.equal(confDob.answer, 'no')
  console.log(`-> Confirmation transcript "illai" processed: answer="${confDob.answer}" -> Re-ask triggered! (${latConf2}ms)`)
  stepsReport.push({ step: 'confirm "illai" -> no (re-ask)', latencyMs: latConf2, cache: 'N/A' })

  // -------------------------------------------------------------
  // FIELD 3: Phone Number
  // -------------------------------------------------------------
  console.log('\n--- 3. Field: phone ("9876543210") ---')
  const fieldPhone = form.fields.find((f) => f.id === 'phone')
  const phoneParts = getReadbackAudioParts(fieldPhone, '9876543210', 'ta')

  // Live Call 4: Dynamic phone read-back (all digits spoken, sensitive, no-cache)
  console.log('[LIVE CALL 4] Requesting Timbre TTS for phone readback: "' + phoneParts.valuePrompt + '"')
  const t4 = Date.now()
  const phoneValRes = await fetch(`${BASE_URL}/api/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: phoneParts.valuePrompt,
      sensitive: true,
      noCache: true,
      isReadback: true,
    }),
  })
  const latPhoneVal = Number(phoneValRes.headers.get('X-Latency-Ms')) || (Date.now() - t4)
  const cachePhoneVal = phoneValRes.headers.get('X-Cache')
  assert.equal(phoneValRes.ok, true)
  assert.equal(cachePhoneVal, 'MISS')
  console.log(`-> Phone read-back spoken. Latency: ${latPhoneVal}ms, Cache: ${cachePhoneVal}`)
  stepsReport.push({ step: 'phone dynamic readback', latencyMs: latPhoneVal, cache: cachePhoneVal })

  // Static prompt: CACHE HIT!
  const staticRes3 = await fetch(`${BASE_URL}/api/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: phoneParts.staticConfirmPrompt,
      sensitive: false,
      noCache: false,
      isReadback: true,
    }),
  })
  assert.equal(staticRes3.headers.get('X-Cache'), 'HIT')

  // User confirms phone with "aama"
  const tConf3 = Date.now()
  const confPhone = await fetch(`${BASE_URL}/api/form/pension/confirm-input`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fieldId: 'phone', transcript: 'aama' }),
  }).then((r) => r.json())
  const latConf3 = Date.now() - tConf3
  assert.equal(confPhone.answer, 'yes')
  console.log(`-> Confirmation transcript "aama" processed: answer="${confPhone.answer}" (${latConf3}ms)`)
  stepsReport.push({ step: 'confirm "aama" -> yes', latencyMs: latConf3, cache: 'N/A' })

  // -------------------------------------------------------------
  // Live Calls & Budget Summary
  // -------------------------------------------------------------
  const statsEnd = await fetch(`${BASE_URL}/api/stats`).then((r) => r.json())
  const totalLiveUsed = statsEnd.liveCallsInLastHour - startLiveCalls
  console.log('\n=== LIVE RUN SUMMARY ===')
  console.log(`Live calls used in this run: ${totalLiveUsed}`)
  console.log(`Total live calls in last hour: ${statsEnd.liveCallsInLastHour} / 120`)
  console.log('Step Latencies:');
  console.table(stepsReport)

  assert.ok(totalLiveUsed <= 12, `Exceeded live call budget: ${totalLiveUsed} > 12`)
  console.log('✅ Check 3 PASSED successfully within budget!')
}

liveRun().catch((err) => {
  console.error('Live run failed:', err)
  process.exit(1)
})
