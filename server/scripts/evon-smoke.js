import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractWithProvider, getSelectedProvider } from '../llm/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Helper to pause between calls
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  let limit = 10
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10) || 10
      i++
    } else if (args[i] === '--all') {
      limit = 9999
    }
  }
  return { limit }
}

// Locate spoken_answers.json fixture
function loadFixtures() {
  const possiblePaths = [
    path.resolve(__dirname, '../tests/fixtures/spoken_answers.json'),
    path.resolve(__dirname, '../../tests/fixtures/spoken_answers.json'),
    path.resolve(__dirname, '../../../tests/fixtures/spoken_answers.json'),
  ]

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8'))
    }
  }
  throw new Error('Could not find tests/fixtures/spoken_answers.json')
}

// Simple normalization for comparing values
function isMatch(expected, got) {
  if (expected === got) return true
  if (expected == null || got == null) return false
  const normExpected = String(expected).trim().toLowerCase().replace(/\s+/g, ' ')
  const normGot = String(got).trim().toLowerCase().replace(/\s+/g, ' ')
  return normExpected === normGot
}

async function main() {
  const { limit } = parseArgs()
  const provider = getSelectedProvider()
  const allFixtures = loadFixtures()

  const fixtures = allFixtures.slice(0, Math.min(limit, allFixtures.length))

  console.log(`\n======================================================`)
  console.log(`Running Evon Smoke Benchmark`)
  console.log(`Provider: ${provider} (Selected via EVON_PROVIDER, defaults to rules)`)
  console.log(`Fixtures to run: ${fixtures.length} of ${allFixtures.length}`)
  console.log(`======================================================\n`)

  const results = []
  let totalLatency = 0

  for (let i = 0; i < fixtures.length; i++) {
    const item = fixtures[i]
    const extractResult = await extractWithProvider({
      field: item.field_id,
      transcript: item.spoken,
    })

    const got = extractResult.value
    const correct = isMatch(item.expected, got)
    totalLatency += extractResult.latencyMs

    results.push({
      index: i + 1,
      field_id: item.field_id,
      spoken: item.spoken,
      expected: item.expected,
      got: got ?? '(null)',
      correct: correct ? 'YES' : 'NO',
      difficulty: item.difficulty || 'medium',
      latency: `${extractResult.latencyMs}ms`,
      provider: extractResult.provider,
    })

    // Pause between calls
    await sleep(50)
  }

  // Print console table
  console.table(
    results.map((r) => ({
      '#': r.index,
      Field: r.field_id,
      Spoken: r.spoken.length > 25 ? r.spoken.slice(0, 22) + '...' : r.spoken,
      Expected: r.expected,
      Got: r.got,
      'Correct?': r.correct,
      Diff: r.difficulty,
      Latency: r.latency,
      Provider: r.provider,
    }))
  )

  const correctCount = results.filter((r) => r.correct === 'YES').length
  const accuracy = Math.round((correctCount / results.length) * 100)
  const avgLatency = Math.round(totalLatency / results.length)

  // Difficulty breakdowns
  const diffGroups = { easy: { total: 0, correct: 0 }, medium: { total: 0, correct: 0 }, hard: { total: 0, correct: 0 } }
  for (const r of results) {
    const d = r.difficulty || 'medium'
    if (!diffGroups[d]) diffGroups[d] = { total: 0, correct: 0 }
    diffGroups[d].total += 1
    if (r.correct === 'YES') diffGroups[d].correct += 1
  }

  console.log(`\n---------------- Summary ----------------`)
  console.log(`Total Tested:  ${results.length}`)
  console.log(`Overall Acc:   ${accuracy}% (${correctCount}/${results.length})`)
  for (const [diff, data] of Object.entries(diffGroups)) {
    if (data.total > 0) {
      const pct = Math.round((data.correct / data.total) * 100)
      console.log(`  - ${diff.toUpperCase().padEnd(6)} Acc: ${pct}% (${data.correct}/${data.total})`)
    }
  }
  console.log(`Avg Latency:   ${avgLatency} ms`)
  console.log(`Provider:      ${provider}`)
  console.log(`-----------------------------------------\n`)

  // Save report to docs/results/
  const dateStr = new Date().toISOString().slice(0, 10)
  const outputDir = path.resolve(__dirname, '../../docs/results')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const filename = `evon-smoke-${provider.replace(/[^a-z0-9_-]/gi, '_')}-${dateStr}.md`
  const filePath = path.join(outputDir, filename)

  const markdownContent = `# Evon Smoke Benchmark: ${provider} (${dateStr})

- **Provider**: \`${provider}\`
- **Total Tested**: ${results.length} fixtures
- **Overall Accuracy**: **${accuracy}%** (${correctCount}/${results.length})
- **Average Latency**: **${avgLatency} ms**
- **Difficulty Breakdown**:
${Object.entries(diffGroups)
  .filter(([_, d]) => d.total > 0)
  .map(([diff, d]) => `  - **${diff.toUpperCase()}**: ${Math.round((d.correct / d.total) * 100)}% (${d.correct}/${d.total})`)
  .join('\n')}

## Detailed Results

| # | Field | Spoken Transcript | Expected | Got | Correct? | Difficulty | Latency | Provider |
|---|---|---|---|---|---|---|---|---|
${results
  .map(
    (r) =>
      `| ${r.index} | \`${r.field_id}\` | "${r.spoken.replace(/\|/g, '\\|')}" | \`${r.expected}\` | \`${r.got}\` | ${r.correct === 'YES' ? '✅' : '❌'} | ${r.difficulty} | ${r.latency} | \`${r.provider}\` |`
  )
  .join('\n')}
`

  fs.writeFileSync(filePath, markdownContent, 'utf-8')
  console.log(`Report written to ${filePath}`)

  // Also sync to workspace root docs/results if exists
  const parentOutputDir = path.resolve(__dirname, '../../../docs/results')
  if (fs.existsSync(path.resolve(__dirname, '../../../docs'))) {
    if (!fs.existsSync(parentOutputDir)) fs.mkdirSync(parentOutputDir, { recursive: true })
    fs.writeFileSync(path.join(parentOutputDir, filename), markdownContent, 'utf-8')
  }
}

main().catch((err) => {
  console.error('Benchmark failed:', err)
  process.exit(1)
})
