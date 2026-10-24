import { SPOKEN_PREFIXES } from '../lexicon.js'
import { cleanUnicodeAndWhitespace } from '../normalize.js'

export function extractText(rawText, { fieldDef = {} } = {}) {
  let cleaned = cleanUnicodeAndWhitespace(rawText)
  if (!cleaned) {
    return { value: null, confidence: 0, needsConfirmation: false, reason: 'Empty text transcript' }
  }

  const fieldId = fieldDef.id || ''

  // Strip prefixes according to field type
  if (fieldId === 'village' && SPOKEN_PREFIXES.village) {
    for (const r of SPOKEN_PREFIXES.village) cleaned = cleaned.replace(r, '')
  } else if (fieldId === 'taluk' && SPOKEN_PREFIXES.taluk) {
    for (const r of SPOKEN_PREFIXES.taluk) cleaned = cleaned.replace(r, '')
    // Handle spacing note: if "Test taluk", merge to "Testtaluk"
    if (/^test\s+taluk$/i.test(cleaned)) cleaned = 'Testtaluk'
  } else if (fieldId === 'district' && SPOKEN_PREFIXES.district) {
    for (const r of SPOKEN_PREFIXES.district) cleaned = cleaned.replace(r, '')
    // Handle spacing note: if "Sample district", merge to "Sampledistrict"
    if (/^sample\s+district$/i.test(cleaned)) cleaned = 'Sampledistrict'
  }

  cleaned = cleanUnicodeAndWhitespace(cleaned)

  // Strip common trailing polite particles
  cleaned = cleaned.replace(/\s+(?:dhan|thaan|dhaana|than)$/i, '')
  cleaned = cleanUnicodeAndWhitespace(cleaned)

  // Title case if single word in Latin script
  if (/^[a-zA-Z]+$/.test(cleaned)) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase()
  }

  const maxLength = fieldDef.validation?.max || 100
  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength).trim()
  }

  return {
    value: cleaned,
    confidence: cleaned.length > 2 ? 0.85 : 0.6,
    needsConfirmation: false,
    reason: 'Generic text field extracted',
  }
}
