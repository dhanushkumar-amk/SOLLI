import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import multer from 'multer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { GNANI_CONFIG } from './config.js'
import {
  buildFullSummary,
  getNextField,
  getProgress,
  loadForm,
  validateAnswer,
} from './forms/formEngine.js'
import { speak, transcribe } from './gnani.js'
import { getEvonStatus } from './llm/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Load environment variables from server/.env or parent .env
dotenv.config({ path: path.resolve(__dirname, '.env') })
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const app = express()
const port = process.env.PORT || 5000

// In-memory call counters and stats
const stats = {
  transcribe: {
    calls: 0,
    totalAudioSeconds: 0,
  },
  speak: {
    calls: 0,
    totalCharacters: 0,
  },
}

app.use(cors())
// Enforce 100 KB JSON body limit
app.use(express.json({ limit: '100kb' }))

// Memory storage with 5 MB limit for audio uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB limit
  },
})

/**
 * Calculates audio duration in seconds from a buffer (WAV header or 16kHz 16-bit mono fallback)
 */
function estimateAudioSeconds(buffer) {
  if (!buffer || buffer.length < 44) return 0
  // Check for 'RIFF' and 'WAVE'
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WAVE'
  ) {
    const byteRate = buffer.readUInt32LE(28)
    if (byteRate > 0) {
      const dataSize = buffer.length - 44
      return Math.round((dataSize / byteRate) * 10) / 10
    }
  }
  // Default estimate for 16kHz, 16-bit, 1 channel (32,000 B/s)
  return Math.round((buffer.length / 32000) * 10) / 10
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  const isConfigured = Boolean(process.env.GNANI_API_KEY && process.env.GNANI_API_KEY.trim() !== '')
  const { evonProvider, evonConfigured } = getEvonStatus()
  res.json({
    status: 'ok',
    keyLoaded: isConfigured,
    gnaniConfigured: isConfigured,
    evonProvider,
    evonConfigured,
  })
})

// In-memory stats endpoint (no personal data)
app.get('/api/stats', (_req, res) => {
  res.json({
    transcribe: { ...stats.transcribe },
    speak: { ...stats.speak },
  })
})

// ----------------------------------------------------
// Form Engine API Routes (Stateless, Zero-Network)
// ----------------------------------------------------

// GET /api/form/:id — Retrieve public form definition
app.get('/api/form/:id', (req, res) => {
  const formId = req.params.id
  console.log(`[route] GET /api/form/${formId}`)

  try {
    const form = loadForm(formId)
    // Strip internal-only keys (pdf.coords)
    const sanitizedFields = form.fields.map((f) => {
      const fieldCopy = { ...f }
      if (fieldCopy.pdf) {
        fieldCopy.pdf = { ...fieldCopy.pdf }
        delete fieldCopy.pdf.coords
      }
      return fieldCopy
    })

    res.json({
      ...form,
      fields: sanitizedFields,
    })
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: `Form "${formId}" not found` })
    }
    res.status(500).json({ error: err.message })
  }
})

// POST /api/form/:id/validate — Validate single field answer
app.post('/api/form/:id/validate', (req, res) => {
  const formId = req.params.id
  const { fieldId, value } = req.body || {}
  console.log(`[route] POST /api/form/${formId}/validate fieldId=${fieldId}`)

  if (!fieldId || typeof fieldId !== 'string') {
    return res.status(400).json({ error: 'fieldId is required' })
  }

  try {
    const form = loadForm(formId)
    const field = form.fields.find((f) => f.id === fieldId)
    if (!field) {
      return res.status(404).json({ error: `Field "${fieldId}" not found in form "${formId}"` })
    }

    const validationResult = validateAnswer(field, value)
    res.json(validationResult)
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: `Form "${formId}" not found` })
    }
    res.status(500).json({ error: err.message })
  }
})

// POST /api/form/:id/next — Get next question and progress
app.post('/api/form/:id/next', (req, res) => {
  const formId = req.params.id
  const { answers, currentId } = req.body || {}
  console.log(`[route] POST /api/form/${formId}/next currentId=${currentId || 'start'}`)

  try {
    const form = loadForm(formId)
    const nextField = getNextField(form, answers || {}, currentId || null)
    const progress = getProgress(form, answers || {})

    // Strip pdf.coords from nextField if returned
    let sanitizedNext = null
    if (nextField) {
      sanitizedNext = { ...nextField }
      if (sanitizedNext.pdf) {
        sanitizedNext.pdf = { ...sanitizedNext.pdf }
        delete sanitizedNext.pdf.coords
      }
    }

    res.json({
      next: sanitizedNext,
      progress,
    })
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: `Form "${formId}" not found` })
    }
    res.status(500).json({ error: err.message })
  }
})

// POST /api/form/:id/summary — Build masked review summary
app.post('/api/form/:id/summary', (req, res) => {
  const formId = req.params.id
  const { answers, lang } = req.body || {}
  console.log(`[route] POST /api/form/${formId}/summary lang=${lang || 'en'}`)

  try {
    const form = loadForm(formId)
    const summary = buildFullSummary(form, answers || {}, lang || 'en')
    res.json({ summary })
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: `Form "${formId}" not found` })
    }
    res.status(500).json({ error: err.message })
  }
})

// ----------------------------------------------------
// Speech API Routes (Gnani AI)
// ----------------------------------------------------

// Speech-to-Text endpoint
app.post(
  '/api/transcribe',
  upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'audio_file', maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const uploadedFile = req.files?.audio?.[0] || req.files?.audio_file?.[0] || req.file
      if (!uploadedFile || !uploadedFile.buffer) {
        return res.status(400).json({ error: 'Audio file is required (field name: audio or audio_file)' })
      }

      const audioBuffer = uploadedFile.buffer
      const mimeType = uploadedFile.mimetype || 'audio/wav'
      const language = req.body?.language || GNANI_CONFIG.defaultLanguage

      const durationSec = estimateAudioSeconds(audioBuffer)
      if (durationSec > GNANI_CONFIG.maxAudioSeconds + 5) {
        return res.status(400).json({
          error: `Audio duration (~${durationSec}s) exceeds maximum allowed limit of ${GNANI_CONFIG.maxAudioSeconds} seconds`,
        })
      }

      const result = await transcribe(audioBuffer, { mimeType, language })

      // Update call stats
      stats.transcribe.calls += 1
      stats.transcribe.totalAudioSeconds = Math.round((stats.transcribe.totalAudioSeconds + durationSec) * 10) / 10

      res.json({
        text: result.text,
        latencyMs: result.latencyMs,
      })
    } catch (error) {
      next(error)
    }
  }
)

// Text-to-Speech endpoint
app.post('/api/speak', async (req, res, next) => {
  try {
    const { text, voice, language } = req.body || {}
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({ error: 'Text string is required' })
    }

    if (text.length > GNANI_CONFIG.maxTtsChars) {
      return res.status(400).json({
        error: `Text length (${text.length}) exceeds maximum limit of ${GNANI_CONFIG.maxTtsChars} characters`,
      })
    }

    const result = await speak(text, { voice, language })

    // Update call stats
    stats.speak.calls += 1
    stats.speak.totalCharacters += text.length

    res.set('Content-Type', result.mimeType)
    res.set('X-Latency-Ms', String(result.latencyMs))
    res.send(result.audioBuffer)
  } catch (error) {
    next(error)
  }
})

// Central error handler
app.use((err, _req, res, _next) => {
  const message = err.message || 'Internal server error'
  let statusCode = 500

  if (err.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400
  } else if (err.type === 'entity.too.large') {
    statusCode = 413
  } else if (message.includes('401')) {
    statusCode = 401
  } else if (message.includes('402') || message.includes('429')) {
    statusCode = 429
  } else if (message.includes('400') || message.includes('bad request') || message.includes('required')) {
    statusCode = 400
  } else if (err.status && typeof err.status === 'number') {
    statusCode = err.status
  }

  // Never leak sensitive values or keys
  const safeMessage = message.replace(/vach_[a-zA-Z0-9_-]+/g, '[REDACTED]')
  res.status(statusCode).json({ error: safeMessage })
})

// Start server if run directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => console.log(`Solli server listening on port ${port}`))
}

export default app
