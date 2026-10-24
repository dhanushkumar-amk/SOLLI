import { CORRECTION_MARKERS, FILLERS } from './lexicon.js'

/**
 * Normalises Unicode to NFC, strips zero-width characters, and collapses whitespace.
 * @param {string} text
 * @returns {string}
 */
export function cleanUnicodeAndWhitespace(text) {
  if (!text || typeof text !== 'string') return ''

  return text
    .normalize('NFC')
    // Remove zero-width spaces, joiners, non-joiners, and BOM
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Normalize any line breaks or tabs to space
    .replace(/[\r\n\t]+/g, ' ')
    // Collapse multiple consecutive spaces
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Checks whether a transcript consists only of background noise, symbols, or uninformative repeats.
 * @param {string} text
 * @returns {boolean}
 */
export function isNoiseTranscript(text) {
  const clean = cleanUnicodeAndWhitespace(text)
  if (!clean || clean.length < 2) return true

  // Check if string contains ANY letter or digit in Latin or Tamil unicode scripts
  const hasAlphanumeric = /[\p{L}\p{N}]/u.test(clean)
  if (!hasAlphanumeric) return true

  // Check for repeated single character garbage (e.g., "...", "???", "-----")
  if (/^([^\p{L}\p{N}])\1*$/u.test(clean)) return true

  // Check for single short filler token only
  const lower = clean.toLowerCase()
  if (FILLERS.includes(lower)) return true

  return false
}

/**
 * Removes conversational speech fillers and discourse markers
 * @param {string} text
 * @param {string[]} [fillersList]
 * @returns {string}
 */
export function removeFillers(text, fillersList = FILLERS) {
  if (!text) return ''

  let result = text
  // Match fillers surrounded by word boundaries or punctuation
  for (const filler of fillersList) {
    const regex = new RegExp(`(^|\\s|[,.!?-])${filler}(\\s|[,.!?-]|$)`, 'gi')
    result = result.replace(regex, ' ')
  }

  return cleanUnicodeAndWhitespace(result)
}

/**
 * Detects conversational self-corrections (e.g. "March la... illai, May 5", "sorry wait Raman")
 * Returns the final corrected portion, and flags isCorrection = true.
 * @param {string} text
 * @returns {{ text: string, isCorrection: boolean, needsConfirmation: boolean }}
 */
export function detectAndApplySelfCorrection(text) {
  const clean = cleanUnicodeAndWhitespace(text)
  if (!clean) return { text: '', isCorrection: false, needsConfirmation: false }

  // Build regex matching correction markers
  const markerPattern = CORRECTION_MARKERS.map((m) =>
    m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  ).join('|')

  const regex = new RegExp(`(?:\\.{2,}|[,;!?-]|\\s)+(?:${markerPattern})(?:\\.{2,}|[,;!?-]|\\s)+`, 'iu')
  const match = regex.exec(clean)

  if (match) {
    const parts = clean.split(regex)
    const after = parts[parts.length - 1]?.trim()
    if (after && after.length > 0) {
      return {
        text: after,
        isCorrection: true,
        needsConfirmation: true, // Conservative policy: always verify self-corrections
      }
    }
  }

  return {
    text: clean,
    isCorrection: false,
    needsConfirmation: false,
  }
}

/**
 * Full normalisation pipeline
 * @param {string} rawTranscript
 * @returns {{ text: string, isNoise: boolean, isCorrection: boolean, needsConfirmation: boolean }}
 */
export function normalizeTranscript(rawTranscript) {
  const clean = cleanUnicodeAndWhitespace(rawTranscript)

  if (isNoiseTranscript(clean)) {
    return {
      text: '',
      isNoise: true,
      isCorrection: false,
      needsConfirmation: false,
    }
  }

  // 1. Detect and resolve self-corrections
  const correction = detectAndApplySelfCorrection(clean)

  // 2. Strip filler words from active text
  const stripped = removeFillers(correction.text)

  return {
    text: stripped,
    isNoise: false,
    isCorrection: correction.isCorrection,
    needsConfirmation: correction.needsConfirmation,
  }
}
