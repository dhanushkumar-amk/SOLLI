import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadForm } from '../forms/formEngine.js'
import { detectCommand } from '../llm/commands/detect.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function parseArgs() {
  const args = process.argv.slice(2)
  let set = 'dev'
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--set' && args[i + 1]) {
      set = args[i + 1].toLowerCase()
      i++
    }
  }
  return { set }
}

function loadDataset(setName) {
  const devPath = path.resolve(__dirname, '../../tests/fixtures/commands_dev.json')
  const heldoutPath = path.resolve(__dirname, '../../tests/fixtures/commands_heldout.json')

  if (setName === 'dev') {
    return JSON.parse(fs.readFileSync(devPath, 'utf8'))
  } else if (setName === 'heldout') {
    return JSON.parse(fs.readFileSync(heldoutPath, 'utf8'))
  } else if (setName === 'all') {
    const dev = JSON.parse(fs.readFileSync(devPath, 'utf8'))
    const heldout = JSON.parse(fs.readFileSync(heldoutPath, 'utf8'))
    return [...dev, ...heldout]
  } else {
    throw new Error(`Unknown dataset: ${setName}. Allowed: dev, heldout, all`)
  }
}

async function runEvaluation() {
  const { set } = parseArgs()
  console.log(`\n============================================================`)
  console.log(`  SOLLI VOICE COMMAND DETECTOR EVALUATION: --set ${set}`)
  console.log(`============================================================\n`)

  const form = loadForm('pension')
  const dataset = loadDataset(set)

  let tp = 0
  let tn = 0
  let fp = 0
  let fn = 0
  const failures = []

  for (let i = 0; i < dataset.length; i++) {
    const item = dataset[i]
    const dummyField = { id: 'field_' + (i + 1), type: item.field_type || 'text' }

    const res = detectCommand(item.transcript, {
      state: item.state || 'listening',
      field: dummyField,
      fields: form.fields,
    })

    const isExpectedPositive = item.expected_command !== null
    let passed = false

    if (isExpectedPositive) {
      const commandMatches = res.command === item.expected_command
      const targetMatches =
        item.expected_command !== 'change_field' ||
        item.expected_target === null ||
        res.target === item.expected_target

      if (commandMatches && targetMatches) {
        tp++
        passed = true
      } else {
        fn++
        failures.push({
          index: i + 1,
          transcript: item.transcript,
          state: item.state,
          expected_command: item.expected_command,
          expected_target: item.expected_target,
          got_command: res.command,
          got_target: res.target,
          type: 'FALSE NEGATIVE',
          note: item.note,
        })
      }
    } else {
      // Expected negative (must NOT become a command)
      if (res.command === null) {
        tn++
        passed = true
      } else {
        fp++
        failures.push({
          index: i + 1,
          transcript: item.transcript,
          state: item.state,
          expected_command: null,
          expected_target: null,
          got_command: res.command,
          got_target: res.target,
          type: 'FALSE POSITIVE',
          note: item.note,
        })
      }
    }
  }

  const total = dataset.length
  const accuracy = (((tp + tn) / total) * 100).toFixed(1)
  const totalPositives = tp + fn
  const totalNegatives = tn + fp

  const fpr = totalNegatives > 0 ? ((fp / totalNegatives) * 100).toFixed(1) : '0.0'
  const fnr = totalPositives > 0 ? ((fn / totalPositives) * 100).toFixed(1) : '0.0'

  console.log(`Results for [${set.toUpperCase()}] (${total} items):`)
  console.log(`  Total Items:          ${total}`)
  console.log(`  True Positives (TP):  ${tp}`)
  console.log(`  True Negatives (TN):  ${tn}`)
  console.log(`  False Positives (FP): ${fp}`)
  console.log(`  False Negatives (FN): ${fn}`)
  console.log(`------------------------------------------------------------`)
  console.log(`  Accuracy:             ${accuracy}% (${tp + tn}/${total})`)
  console.log(`  False Positive Rate:  ${fpr}% (${fp}/${totalNegatives})`)
  console.log(`  False Negative Rate:  ${fnr}% (${fn}/${totalPositives})`)
  console.log(`------------------------------------------------------------`)

  if (failures.length > 0) {
    console.log(`\nFAILURES (${failures.length}):`)
    for (const f of failures) {
      console.log(`  [#${f.index}] "${f.transcript}" (${f.type})`)
      console.log(`    State: ${f.state} | Note: ${f.note}`)
      console.log(`    Expected: command=${f.expected_command}, target=${f.expected_target}`)
      console.log(`    Got:      command=${f.got_command}, target=${f.got_target}`)
    }
    console.log('')
    process.exit(1)
  } else {
    console.log(`\nALL ${total} EXAMPLES PASSED PERFECTLY!\n`)
  }
}

runEvaluation().catch((err) => {
  console.error(err)
  process.exit(1)
})
