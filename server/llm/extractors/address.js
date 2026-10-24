import { SPOKEN_PREFIXES } from '../lexicon.js'
import { cleanUnicodeAndWhitespace } from '../normalize.js'

const SPOKEN_NUMBERS = {
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ten: '10',
  ondru: '1',
  onnu: '1',
  irandu: '2',
  rendu: '2',
  moondru: '3',
  moonu: '3',
  naangu: '4',
  naalu: '4',
  aindhu: '5',
  anju: '5',
}

export function extractAddress(rawText) {
  let cleaned = cleanUnicodeAndWhitespace(rawText)
  if (!cleaned) {
    return { value: null, confidence: 0, needsConfirmation: true, reason: 'Empty address transcript' }
  }

  // Strip address prefixes
  for (const r of SPOKEN_PREFIXES.address) {
    cleaned = cleaned.replace(r, '')
  }
  cleaned = cleanUnicodeAndWhitespace(cleaned)

  // Strip leading "number" or "no" or "door number"
  cleaned = cleaned.replace(/^(?:door\s+no|door\s+number|number|no\.?)\s+/i, '')

  // Convert leading spoken number (e.g. "three Market Road" -> "3 Market Road")
  const words = cleaned.split(/\s+/)
  if (words.length > 0) {
    const firstLower = words[0].toLowerCase()
    if (SPOKEN_NUMBERS[firstLower]) {
      words[0] = SPOKEN_NUMBERS[firstLower]
      cleaned = words.join(' ')
    }
  }

  // Title case Latin street parts
  cleaned = cleaned.replace(/\b([a-zA-Z])([a-zA-Z]*)\b/g, (_m, first, rest) => {
    return first.toUpperCase() + rest.toLowerCase()
  })

  return {
    value: cleaned,
    confidence: 0.8,
    needsConfirmation: true, // Addresses ALWAYS require confirmation
    reason: 'Address extracted with lead-in prefix stripping',
  }
}
