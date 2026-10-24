import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test, { describe } from 'node:test'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('Held-out Set Leakage Guard Test', () => {
  test('none of the held-out spoken strings appear in server/llm source files', () => {
    // 1. Load held-out set
    const heldoutPath = path.resolve(__dirname, '../../tests/fixtures/spoken_heldout.json')
    assert.ok(fs.existsSync(heldoutPath), 'spoken_heldout.json must exist')
    const heldout = JSON.parse(fs.readFileSync(heldoutPath, 'utf8'))
    assert.ok(heldout.length > 0, 'heldout set must not be empty')

    // 2. Read all JS files in server/llm/ (recursive)
    const llmDir = path.resolve(__dirname, '../llm')
    function getJsFiles(dir) {
      let results = []
      const list = fs.readdirSync(dir)
      for (const file of list) {
        const fullPath = path.join(dir, file)
        const stat = fs.statSync(fullPath)
        if (stat.isDirectory()) {
          results = results.concat(getJsFiles(fullPath))
        } else if (file.endsWith('.js')) {
          results.push(fullPath)
        }
      }
      return results
    }

    const jsFiles = getJsFiles(llmDir)
    assert.ok(jsFiles.length > 0, 'server/llm files must exist')

    const fileContents = jsFiles.map((f) => ({
      path: f,
      content: fs.readFileSync(f, 'utf8'),
    }))

    const leaks = []

    for (const item of heldout) {
      const spoken = String(item.spoken || '').trim()
      // Skip trivial strings (e.g. single digits or short words like "yes", "no", "aama", "Other", "Female") that could be in schemas
      if (spoken.length <= 6) continue

      for (const { path: filePath, content } of fileContents) {
        if (content.includes(spoken)) {
          leaks.push({
            spoken,
            file: path.basename(filePath),
            field_id: item.field_id,
          })
        }
      }
    }

    if (leaks.length > 0) {
      console.error('LEAK DETECTED: Held-out strings found in server/llm:', leaks)
    }

    assert.equal(
      leaks.length,
      0,
      `Held-out contamination detected: ${leaks.length} strings from held-out set appear in server/llm/*.js`
    )
  })

  test('none of the held-out command phrases appear in server/llm source files', () => {
    const heldoutCmdPath = path.resolve(__dirname, '../../tests/fixtures/commands_heldout.json')
    assert.ok(fs.existsSync(heldoutCmdPath), 'commands_heldout.json must exist')
    const heldoutCmds = JSON.parse(fs.readFileSync(heldoutCmdPath, 'utf8'))
    assert.ok(heldoutCmds.length > 0, 'heldout commands set must not be empty')

    const llmDir = path.resolve(__dirname, '../llm')
    function getJsFiles(dir) {
      let results = []
      const list = fs.readdirSync(dir)
      for (const file of list) {
        const fullPath = path.join(dir, file)
        const stat = fs.statSync(fullPath)
        if (stat.isDirectory()) {
          results = results.concat(getJsFiles(fullPath))
        } else if (file.endsWith('.js')) {
          results.push(fullPath)
        }
      }
      return results
    }

    const jsFiles = getJsFiles(llmDir)
    const fileContents = jsFiles.map((f) => ({
      path: f,
      content: fs.readFileSync(f, 'utf8'),
    }))

    const leaks = []

    for (const item of heldoutCmds) {
      const transcript = String(item.transcript || '').trim()
      // Skip very short single words that are command IDs or basic stopwords
      if (transcript.length <= 6) continue

      for (const { path: filePath, content } of fileContents) {
        if (content.toLowerCase().includes(transcript.toLowerCase())) {
          leaks.push({
            transcript,
            file: path.basename(filePath),
          })
        }
      }
    }

    if (leaks.length > 0) {
      console.error('LEAK DETECTED: Held-out command phrases found in server/llm:', leaks)
    }

    assert.equal(
      leaks.length,
      0,
      `Held-out command contamination detected: ${leaks.length} phrases appear in server/llm/*.js`
    )
  })
})
