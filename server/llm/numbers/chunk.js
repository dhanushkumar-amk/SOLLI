/**
 * Spoken number chunking, grouping, and read-back helper for Timbre TTS.
 * Zero external dependencies.
 */

const DIGIT_WORDS_EN = {
  '0': 'zero',
  '1': 'one',
  '2': 'two',
  '3': 'three',
  '4': 'four',
  '5': 'five',
  '6': 'six',
  '7': 'seven',
  '8': 'eight',
  '9': 'nine',
}

const DIGIT_WORDS_TA = {
  '0': 'பூஜ்ஜியம்',
  '1': 'ஒன்று',
  '2': 'இரண்டு',
  '3': 'மூன்று',
  '4': 'நான்கு',
  '5': 'ஐந்து',
  '6': 'ஆறு',
  '7': 'ஏழு',
  '8': 'எட்டு',
  '9': 'ஒன்பது',
}

/**
 * Groups digits according to field conventions:
 * - phone: 5 + 5 (or 3 + 3 + 4)
 * - aadhaar: 4 + 4 + 4
 * - bank_account: groups of 4 (e.g. 4 + 4 + 4 + 3)
 */
export function groupDigits(value, type = 'generic', config = {}) {
  if (!value) return []
  const clean = String(value).replace(/[^0-9]/g, '')
  if (!clean) return []

  if (type === 'phone') {
    const style = config.phoneStyle || '5+5'
    if (style === '3+3+4' && clean.length === 10) {
      return [clean.slice(0, 3), clean.slice(3, 6), clean.slice(6, 10)]
    }
    // Default 5 + 5
    if (clean.length === 10) {
      return [clean.slice(0, 5), clean.slice(5, 10)]
    }
  }

  if (type === 'aadhaar') {
    const chunks = []
    for (let i = 0; i < clean.length; i += 4) {
      chunks.push(clean.slice(i, i + 4))
    }
    return chunks
  }

  if (type === 'bank_account' || type === 'account') {
    const chunks = []
    for (let i = 0; i < clean.length; i += 4) {
      chunks.push(clean.slice(i, i + 4))
    }
    return chunks
  }

  // Generic: split in groups of 3 or 4
  const chunks = []
  for (let i = 0; i < clean.length; i += 3) {
    chunks.push(clean.slice(i, i + 3))
  }
  return chunks
}

/**
 * Builds a natural readback string for Timbre TTS with pauses between groups.
 * Uses standard punctuation (commas) for natural pauses.
 */
export function buildDigitReadback(value, lang = 'ta', type = 'generic') {
  const groups = groupDigits(value, type)
  if (groups.length === 0) return ''

  const wordMap = lang === 'ta' ? DIGIT_WORDS_TA : DIGIT_WORDS_EN

  const groupSpoken = groups.map((grp) => {
    return grp
      .split('')
      .map((d) => wordMap[d] || d)
      .join(' ')
  })

  // Commas between groups introduce natural rhythm in Timbre
  return groupSpoken.join(', ')
}

/**
 * Checks for partial capture of fixed-length numbers (e.g. 10-digit phone, 12-digit aadhaar).
 */
export function checkPartialCapture(digits, expectedLength) {
  const clean = String(digits || '').replace(/[^0-9]/g, '')
  const have = clean.length
  const needed = expectedLength - have

  if (have > 0 && have < expectedLength) {
    return {
      partial: true,
      have,
      need: needed,
      digits: clean,
      prompt: {
        en: `I heard ${have} digits. Please say the remaining ${needed}.`,
        ta: `${have} எண்கள் கேட்டன. மீதமுள்ள ${needed} எண்களை சொல்லுங்கள்.`,
      },
    }
  }

  return {
    partial: false,
    have,
    need: Math.max(0, needed),
    digits: clean,
    prompt: null,
  }
}
