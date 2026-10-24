import { SPOKEN_PREFIXES } from '../lexicon.js'
import { cleanUnicodeAndWhitespace } from '../normalize.js'

/**
 * Title-cases Latin names while leaving Tamil script intact
 */
function titleCaseLatin(str) {
  return str.replace(/\b([a-zA-Z])([a-zA-Z]*)\b/g, (_m, first, rest) => {
    return first.toUpperCase() + rest.toLowerCase()
  })
}

/**
 * Normalises single-letter initials (e.g. "S Ramachandran" -> "S. Ramachandran")
 */
function formatInitials(name) {
  // Latin single initial at beginning: "S Ramachandran" -> "S. Ramachandran"
  let formatted = name.replace(/^([A-Za-z])\s+([A-Za-z])/g, '$1. $2')
  // Tamil single initial at beginning: "ச ராமச்சந்திரன்" -> "ச. ராமச்சந்திரன்"
  formatted = formatted.replace(/^([\u0B80-\u0BFF])\s+([\u0B80-\u0BFF])/gu, '$1. $2')
  return formatted
}

export function extractName(rawText, { fieldDef = {} } = {}) {
  let cleaned = cleanUnicodeAndWhitespace(rawText)
  if (!cleaned) {
    return { value: null, confidence: 0, needsConfirmation: false, reason: 'Empty name transcript' }
  }

  // Strip leading conversational prefixes ("en peru", "my name is", "naan", etc.)
  for (const regex of SPOKEN_PREFIXES.name) {
    cleaned = cleaned.replace(regex, '')
  }
  for (const regex of SPOKEN_PREFIXES.parent_spouse) {
    cleaned = cleaned.replace(regex, '')
  }
  for (const regex of SPOKEN_PREFIXES.nominee) {
    cleaned = cleaned.replace(regex, '')
  }

  cleaned = cleanUnicodeAndWhitespace(cleaned)

  // Strip common trailing polite tokens
  cleaned = cleaned.replace(/\s+(?:dhan|thaan|dhaana|than)$/i, '')
  cleaned = cleaned.replace(/\s+(?:தான்)$/u, '')
  cleaned = cleanUnicodeAndWhitespace(cleaned)

  // Reject sentences or absurdly long inputs
  const words = cleaned.split(/\s+/).filter(Boolean)
  if (words.length > 7 || cleaned.length > 60) {
    return {
      value: null,
      confidence: 0.2,
      needsConfirmation: true,
      reason: 'Input too long or sentence-like for a name',
    }
  }

  // Format initials and title-case
  let finalName = formatInitials(cleaned)
  // If predominantly Latin, apply Title Case
  if (/[a-zA-Z]/.test(finalName) && !/[\u0B80-\u0BFF]/.test(finalName)) {
    finalName = titleCaseLatin(finalName)
  }

  return {
    value: finalName,
    confidence: words.length >= 1 ? 0.9 : 0.6,
    needsConfirmation: true, // Names always require confirmation per policy
    reason: 'Name extracted and formatted with initial normalization',
  }
}
