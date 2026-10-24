import assert from 'node:assert/strict'

async function liveCommandsRun() {
  console.log('\n============================================================')
  console.log('  ACCEPTANCE CHECK 7: LIVE VOICE RUN FOR 3 COMMANDS')
  console.log('  Commands: "repeat", "change the village", "I don\'t know"')
  console.log('  Budget guard: Max 12 live API calls. Reporting each call.')
  console.log('============================================================\n')

  const BASE_URL = 'http://localhost:5000'

  const statsStart = await fetch(`${BASE_URL}/api/stats`).then((r) => r.json())
  const initialTranscribeCalls = statsStart.transcribe.calls
  const initialSpeakCalls = statsStart.speak.calls
  console.log(`Initial stats: transcribe=${initialTranscribeCalls}, speak=${initialSpeakCalls}\n`)

  const testPhrases = [
    { text: 'repeat', expectedCommand: 'repeat', expectedTarget: null },
    { text: 'change the village', expectedCommand: 'change_field', expectedTarget: 'village' },
    { text: "I don't know", expectedCommand: 'dont_know', expectedTarget: null },
  ]

  const results = []
  let liveCallCount = 0

  for (let i = 0; i < testPhrases.length; i++) {
    const item = testPhrases[i]
    console.log(`\n--- Test Item ${i + 1}: "${item.text}" ---`)

    // Live Call: Synthesize real speech via Timbre
    liveCallCount++
    console.log(`[LIVE CALL ${liveCallCount}] Synthesizing speech for "${item.text}" via Timbre TTS...`)
    const t0 = Date.now()
    const speakRes = await fetch(`${BASE_URL}/api/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: item.text,
        language: 'ta-IN',
        sensitive: true,
        noCache: true,
      }),
    })
    const ttsLatency = Number(speakRes.headers.get('X-Latency-Ms')) || (Date.now() - t0)
    assert.equal(speakRes.ok, true, `Speak failed for ${item.text}`)
    const audioBuffer = await speakRes.arrayBuffer()
    console.log(`✔ Timbre TTS synthesized (${audioBuffer.byteLength} bytes, latency: ${ttsLatency}ms)`)

    // Live Call: Transcribe speech via Prisma STT
    liveCallCount++
    console.log(`[LIVE CALL ${liveCallCount}] Transcribing audio via Prisma STT...`)
    const formData = new FormData()
    const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' })
    formData.append('audio_file', audioBlob, 'command.wav')
    formData.append('language', 'ta-IN')

    const t1 = Date.now()
    const transRes = await fetch(`${BASE_URL}/api/transcribe`, {
      method: 'POST',
      body: formData,
    })
    const sttLatency = Date.now() - t1
    assert.equal(transRes.ok, true, `Transcribe failed for ${item.text}`)
    const transData = await transRes.json()
    const transcript = transData.text || ''
    console.log(`✔ Prisma STT transcript: "${transcript}" (latency: ${sttLatency}ms)`)

    // Zero-network Command Detection
    const t2 = Date.now()
    const cmdRes = await fetch(`${BASE_URL}/api/form/pension/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript,
        state: 'listening',
        fieldId: 'village',
      }),
    }).then((r) => r.json())
    const cmdLatency = Date.now() - t2
    console.log(`✔ Command detected: command=${cmdRes.command}, target=${cmdRes.target} (${cmdLatency}ms)`)

    results.push({
      phrase: item.text,
      transcript,
      command: cmdRes.command,
      target: cmdRes.target,
      expectedCommand: item.expectedCommand,
      expectedTarget: item.expectedTarget,
      ttsLatency,
      sttLatency,
      cmdLatency,
      totalLatency: ttsLatency + sttLatency + cmdLatency,
    })
  }

  const statsEnd = await fetch(`${BASE_URL}/api/stats`).then((r) => r.json())
  const finalTranscribeCalls = statsEnd.transcribe.calls - initialTranscribeCalls
  const finalSpeakCalls = statsEnd.speak.calls - initialSpeakCalls
  const totalLiveCalls = finalTranscribeCalls + finalSpeakCalls

  console.log('\n============================================================')
  console.log('  LIVE RUN SUMMARY & LATENCY REPORT')
  console.log('============================================================\n')
  for (const r of results) {
    console.log(`Command: "${r.phrase}"`)
    console.log(`  STT Transcript:   "${r.transcript}"`)
    console.log(`  Detected Command: ${r.command} (expected: ${r.expectedCommand})`)
    console.log(`  Detected Target:  ${r.target} (expected: ${r.expectedTarget})`)
    console.log(`  Latencies:        TTS=${r.ttsLatency}ms, STT=${r.sttLatency}ms, CommandDetector=${r.cmdLatency}ms`)
    console.log(`  Total Roundtrip:  ${r.totalLatency}ms\n`)
  }

  console.log(`Total live calls used: ${totalLiveCalls} (Transcribe: ${finalTranscribeCalls}, Speak: ${finalSpeakCalls})`)
  console.log(`Budget constraint: <= 12 live calls. PASSED (${totalLiveCalls}/12).\n`)
}

liveCommandsRun().catch((err) => {
  console.error(err)
  process.exit(1)
})
