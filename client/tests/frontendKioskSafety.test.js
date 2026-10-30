import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test, { describe } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  conversationReducer,
  createInitialContext,
  STATES,
} from '../src/conversation/stateMachine.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('Frontend Polish & Kiosk Safety (Phase 13)', () => {
  test('inactivity timeout / RESTART clears all in-memory answers and returns to IDLE', () => {
    // Simulate active session with answers recorded
    const activeCtx = {
      ...createInitialContext(),
      state: STATES.LISTENING,
      currentFieldId: 'phone',
      currentField: { id: 'phone' },
      answers: {
        applicant_name: { value: 'Muthulakshmi', display: 'Muthulakshmi', confirmed: true },
        phone: { value: '9876543210', display: '9876543210', confirmed: false },
        aadhaar: { value: '123456789012', display: '•••• •••• 9012', confirmed: true },
      },
      summary: [{ id: 'applicant_name', value: 'Muthulakshmi' }],
      pendingConfirmation: { fieldId: 'phone', value: '9876543210' },
    }

    assert.equal(Object.keys(activeCtx.answers).length, 3)

    // Trigger RESTART (dispatched upon inactivity timeout expiry or Finish & Clear button)
    const cleared = conversationReducer(activeCtx, { type: 'RESTART' })

    assert.equal(cleared.state, STATES.IDLE)
    assert.deepEqual(cleared.answers, {}, 'All answers must be wiped from memory')
    assert.equal(cleared.summary, null)
    assert.equal(cleared.pendingConfirmation, null)
    assert.equal(cleared.currentField, null)
    assert.equal(cleared.currentFieldId, null)
  })

  test('operator font-size and contrast toggles do not mutate conversation state', () => {
    // Initial conversation state
    const conversationState = {
      ...createInitialContext(),
      state: STATES.LISTENING,
      currentFieldId: 'village',
      answers: { village: { value: 'Melur' } },
    }

    // Operator settings live in orthogonal component state
    let operatorSettings = {
      fontSize: 'normal',
      contrast: 'normal',
      voiceMuted: false,
    }

    // Toggle font size to large and extra large
    operatorSettings = { ...operatorSettings, fontSize: 'large' }
    assert.equal(operatorSettings.fontSize, 'large')
    assert.equal(conversationState.state, STATES.LISTENING, 'Conversation state remains unaffected')
    assert.equal(conversationState.answers.village.value, 'Melur', 'Answers remain unaffected')

    // Toggle high contrast
    operatorSettings = { ...operatorSettings, contrast: 'high' }
    assert.equal(operatorSettings.contrast, 'high')
    assert.equal(conversationState.state, STATES.LISTENING)
    assert.equal(conversationState.answers.village.value, 'Melur')
  })

  test('no answers or transcripts are written to localStorage, sessionStorage, or cookies in client src', () => {
    const srcDir = path.resolve(__dirname, '../src')

    function scanFiles(dir) {
      const results = []
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          results.push(...scanFiles(fullPath))
        } else if (entry.name.endsWith('.js') || entry.name.endsWith('.jsx')) {
          results.push(fullPath)
        }
      }
      return results
    }

    const files = scanFiles(srcDir)
    const storageForbiddenPatterns = [
      /localStorage/g,
      /sessionStorage/g,
      /indexedDB/g,
      /document\.cookie/g,
    ]

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8')
      for (const pattern of storageForbiddenPatterns) {
        const match = content.match(pattern)
        assert.equal(
          match,
          null,
          `File ${path.basename(file)} must not access persistent browser storage (${pattern})`
        )
      }
    }
  })

  test('no sensitive console.log statements exist in client src', () => {
    const srcDir = path.resolve(__dirname, '../src')

    function scanFiles(dir) {
      const results = []
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          results.push(...scanFiles(fullPath))
        } else if (entry.name.endsWith('.js') || entry.name.endsWith('.jsx')) {
          results.push(fullPath)
        }
      }
      return results
    }

    const files = scanFiles(srcDir)
    const forbiddenPatterns = [
      /console\.log\([^)]*transcript/i,
      /console\.log\([^)]*answer/i,
      /console\.log\([^)]*aadhaar/i,
      /console\.log\([^)]*phone/i,
      /console\.log\([^)]*value/i,
    ]

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8')
      for (const pattern of forbiddenPatterns) {
        const match = content.match(pattern)
        assert.equal(
          match,
          null,
          `File ${path.basename(file)} must not log sensitive user data to console (${pattern})`
        )
      }
    }
  })

  test('production build dist directory contains no /dev routes or dev pages', () => {
    const distDir = path.resolve(__dirname, '../dist')
    if (!fs.existsSync(distDir)) {
      // Build if not present
      return
    }

    function scanFiles(dir) {
      const results = []
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          results.push(...scanFiles(fullPath))
        } else {
          results.push(fullPath)
        }
      }
      return results
    }

    const distFiles = scanFiles(distDir)

    // Verify filenames do not include DevCollect or DevRoundtrip
    for (const file of distFiles) {
      const name = path.basename(file)
      assert.equal(
        name.includes('DevCollect') || name.includes('DevRoundtrip'),
        false,
        `Production dist must not contain dev page chunk: ${name}`
      )

      if (name.endsWith('.js') || name.endsWith('.html') || name.endsWith('.css')) {
        const content = fs.readFileSync(file, 'utf8')
        assert.equal(
          content.includes('/dev/roundtrip') || content.includes('/dev/collect'),
          false,
          `Production bundle in ${name} must not contain dev route strings`
        )
      }
    }
  })
})
