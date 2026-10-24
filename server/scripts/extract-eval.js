import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractField } from '../extract.js'
import { getSelectedProvider } from '../llm/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Simple normalization for evaluating match between expected and extracted values
function isMatch(expected, got) {
  if (expected === got) return true
  if (expected == null || got == null) return false
  const normExpected = String(expected).trim().toLowerCase().replace(/\s+/g, ' ')
  const normGot = String(got).trim().toLowerCase().replace(/\s+/g, ' ')
  return normExpected === normGot
}

function parseArgs() {
  const args = process.argv.slice(2)
  let set = 'dev'
  let provider = null
  let limit = 9999

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--set' && args[i + 1]) {
      set = args[i + 1].toLowerCase()
      i++
    } else if (args[i] === '--provider' && args[i + 1]) {
      provider = args[i + 1]
      i++
    } else if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10) || 9999
      i++
    }
  }

  return { set, provider, limit }
}

function loadDataSet(setName) {
  let relativePath
  if (setName === 'dev') {
    relativePath = '../../tests/fixtures/spoken_dev.json'
  } else if (setName === 'heldout') {
    relativePath = '../../tests/fixtures/spoken_heldout.json'
  } else if (setName === 'real') {
    relativePath = '../../samples/real_transcripts.json'
  } else if (setName === 'all') {
    relativePath = '../../tests/fixtures/spoken_answers.json'
  } else {
    throw new Error(`Unknown dataset name: "${setName}". Expected dev, heldout, real, or all.`)
  }

  const fullPath = path.resolve(__dirname, relativePath)
  if (!fs.existsSync(fullPath)) {
    if (setName === 'real') {
      return [] // Real samples file may not exist yet
    }
    throw new Error(`Dataset file not found: ${fullPath}`)
  }

  return JSON.parse(fs.readFileSync(fullPath, 'utf8'))
}

export async function runEvaluation({ set = 'dev', providerOverride = null, limit = 9999 } = {}) {
  if (providerOverride) {
    process.env.EVON_PROVIDER = providerOverride
  }

  const provider = getSelectedProvider()
  const dataset = loadDataSet(set)
  const items = dataset.slice(0, Math.min(limit, dataset.length))

  console.log(`\n======================================================`)
  console.log(`Solli Extraction Evaluation`)
  console.log(`Dataset:    ${set.toUpperCase()} (${items.length} items)`)
  console.log(`Provider:   ${provider}`)
  console.log(`Timestamp:  ${new Date().toISOString()}`)
  console.log(`======================================================\n`)

  if (items.length === 0) {
    console.log(`No items found in dataset "${set}".`)
    return {
      accuracy: 0,
      total: 0,
      correct: 0,
      byField: {},
      byDifficulty: {},
      failures: [],
    }
  }

  const results = []
  const failures = []
  const byField = {}
  const byDifficulty = {}

  let totalLatency = 0

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const startTime = Date.now()
    const extracted = await extractField(item.field_id, item.spoken, item.context || {})
    const latency = Date.now() - startTime
    totalLatency += latency

    const correct = isMatch(item.expected, extracted.value)

    const record = {
      index: i + 1,
      field_id: item.field_id,
      spoken: item.spoken,
      expected: item.expected,
      got: extracted.value,
      valid: extracted.valid,
      validationError: extracted.validationError,
      confidence: extracted.confidence,
      needsConfirmation: extracted.needsConfirmation,
      isCorrection: extracted.isCorrection,
      correct,
      latency,
      difficulty: item.difficulty || 'unknown',
    }

    results.push(record)

    if (!correct) {
      failures.push(record)
    }

    // Stats by field
    if (!byField[item.field_id]) byField[item.field_id] = { correct: 0, total: 0 }
    byField[item.field_id].total++
    if (correct) byField[item.field_id].correct++

    // Stats by difficulty
    const diff = item.difficulty || 'unknown'
    if (!byDifficulty[diff]) byDifficulty[diff] = { correct: 0, total: 0 }
    byDifficulty[diff].total++
    if (correct) byDifficulty[diff].correct++
  }

  const correctCount = results.filter((r) => r.correct).length
  const accuracyPct = ((correctCount / results.length) * 100).toFixed(1)
  const avgLatency = Math.round(totalLatency / results.length)

  console.log(`--- Overall Accuracy ---`)
  console.log(`Accuracy:     ${accuracyPct}% (${correctCount}/${results.length})`)
  console.log(`Avg Latency:  ${avgLatency} ms`)
  console.log(`Provider:     ${provider}\n`)

  console.log(`--- Accuracy by Field ---`)
  for (const [fId, data] of Object.entries(byField)) {
    const pct = ((data.correct / data.total) * 100).toFixed(1)
    console.log(`  - ${fId.padEnd(24)}: ${pct}% (${data.correct}/${data.total})`)
  }

  console.log(`\n--- Accuracy by Difficulty ---`)
  for (const [diff, data] of Object.entries(byDifficulty)) {
    const pct = ((data.correct / data.total) * 100).toFixed(1)
    console.log(`  - ${diff.padEnd(10)}: ${pct}% (${data.correct}/${data.total})`)
  }

  if (failures.length > 0) {
    console.log(`\n--- Failed Cases (${failures.length}) ---`)
    for (const f of failures) {
      console.log(`  [#${f.index}] Field: ${f.field_id} (Diff: ${f.difficulty})`)
      console.log(`       Spoken:   "${f.spoken}"`)
      console.log(`       Expected: "${f.expected}"`)
      console.log(`       Got:      "${f.got}" (valid: ${f.valid}, err: ${f.validationError})`)
    }
  } else {
    console.log(`\nAll ${results.length} samples extracted correctly!`)
  }

  // Write markdown report
  const dateStr = new Date().toISOString().slice(0, 10)
  const resultsDir = path.resolve(__dirname, '../../docs/results')
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true })
  }

  const reportFileName = `extract-eval-${set}-${provider}-${dateStr}.md`
  const reportPath = path.join(resultsDir, reportFileName)

  let mdContent = `# Extraction Evaluation Report: ${set.toUpperCase()} (${provider})

- **Date:** ${new Date().toISOString()}
- **Dataset:** \`${set}\` (${results.length} items)
- **Provider:** \`${provider}\`
- **Overall Accuracy:** **${accuracyPct}%** (${correctCount}/${results.length})
- **Average Latency:** ${avgLatency} ms

## Accuracy by Field

| Field ID | Correct | Total | Accuracy |
|---|---:|---:|---:|
`
  for (const [fId, data] of Object.entries(byField)) {
    const pct = ((data.correct / data.total) * 100).toFixed(1)
    mdContent += `| \`${fId}\` | ${data.correct} | ${data.total} | ${pct}% |\n`
  }

  mdContent += `\n## Accuracy by Difficulty\n\n| Difficulty | Correct | Total | Accuracy |\n|---|---:|---:|---:|\n`
  for (const [diff, data] of Object.entries(byDifficulty)) {
    const pct = ((data.correct / data.total) * 100).toFixed(1)
    mdContent += `| ${diff} | ${data.correct} | ${data.total} | ${pct}% |\n`
  }

  if (failures.length > 0) {
    mdContent += `\n## Failures List (${failures.length})\n\n| # | Field | Spoken | Expected | Got | Valid |\n|---|---|---|---|---|---|\n`
    for (const f of failures) {
      mdContent += `| ${f.index} | \`${f.field_id}\` | "${f.spoken}" | "${f.expected}" | "${f.got ?? 'null'}" | ${f.valid} |\n`
    }
  }

  fs.writeFileSync(reportPath, mdContent, 'utf8')
  console.log(`\nReport written to docs/results/${reportFileName}\n`)

  return {
    accuracy: Number(accuracyPct),
    total: results.length,
    correct: correctCount,
    byField,
    byDifficulty,
    failures,
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = parseArgs()
  runEvaluation({ set: args.set, providerOverride: args.provider, limit: args.limit })
}
