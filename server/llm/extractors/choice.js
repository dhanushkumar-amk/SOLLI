import { SCRIPT_VARIANTS } from '../lexicon.js'
import { cleanUnicodeAndWhitespace } from '../normalize.js'

/**
 * Pure Levenshtein distance implementation without external dependencies
 */
export function levenshteinDistance(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  const matrix = []
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Calculates similarity ratio between 0.0 and 1.0
 */
export function similarityRatio(s1, s2) {
  const longer = s1.length >= s2.length ? s1 : s2
  const shorter = s1.length < s2.length ? s1 : s2
  if (longer.length === 0) return 1.0
  const dist = levenshteinDistance(longer, shorter)
  return (longer.length - dist) / longer.length
}

export function extractChoice(rawText, { fieldDef = {} } = {}) {
  const cleaned = cleanUnicodeAndWhitespace(rawText)
  if (!cleaned) {
    return { value: null, confidence: 0, needsConfirmation: false, reason: 'Empty choice transcript' }
  }

  const choices = fieldDef.validation?.choices || ['Male', 'Female', 'Other']

  // 1. Check direct lexicon mapping for Tamil/English script variants
  const lower = cleaned.toLowerCase()
  if (SCRIPT_VARIANTS[cleaned] || SCRIPT_VARIANTS[lower]) {
    const canonical = SCRIPT_VARIANTS[cleaned] || SCRIPT_VARIANTS[lower]
    const matchedChoice = choices.find((c) => c.toLowerCase() === canonical.toLowerCase())
    if (matchedChoice) {
      return {
        value: matchedChoice,
        confidence: 0.95,
        needsConfirmation: false,
        reason: `Lexicon match to choice: ${matchedChoice}`,
      }
    }
  }

  // 2. Direct case-insensitive match against choices
  const exact = choices.find((c) => c.toLowerCase() === lower)
  if (exact) {
    return {
      value: exact,
      confidence: 0.95,
      needsConfirmation: false,
      reason: `Exact match to choice: ${exact}`,
    }
  }

  // 3. Check each token in input for substring/word boundary match
  const tokens = cleaned.split(/\s+/).map((t) => t.toLowerCase())
  for (const token of tokens) {
    if (SCRIPT_VARIANTS[token]) {
      const canonical = SCRIPT_VARIANTS[token]
      const matched = choices.find((c) => c.toLowerCase() === canonical.toLowerCase())
      if (matched) {
        return {
          value: matched,
          confidence: 0.9,
          needsConfirmation: false,
          reason: `Token lexicon match: ${matched}`,
        }
      }
    }
    const tokenMatch = choices.find((c) => c.toLowerCase() === token)
    if (tokenMatch) {
      return {
        value: tokenMatch,
        confidence: 0.9,
        needsConfirmation: false,
        reason: `Token match: ${tokenMatch}`,
      }
    }
  }

  // 4. Fuzzy matching with Levenshtein edit distance
  let bestChoice = null
  let bestSim = 0

  for (const choice of choices) {
    const choiceLower = choice.toLowerCase()
    // Compare full string
    const fullSim = similarityRatio(choiceLower, lower)
    if (fullSim > bestSim) {
      bestSim = fullSim
      bestChoice = choice
    }

    // Compare individual tokens
    for (const token of tokens) {
      const tokenSim = similarityRatio(choiceLower, token)
      if (tokenSim > bestSim) {
        bestSim = tokenSim
        bestChoice = choice
      }
    }
  }

  // Threshold: at least 0.7 similarity or edit distance <= 1 for short words
  if (bestChoice && bestSim >= 0.7) {
    return {
      value: bestChoice,
      confidence: Math.round(bestSim * 100) / 100,
      needsConfirmation: bestSim < 0.85,
      reason: `Fuzzy choice match (${Math.round(bestSim * 100)}% similarity): ${bestChoice}`,
    }
  }

  return {
    value: null,
    confidence: 0.2,
    needsConfirmation: true,
    reason: `Transcript did not match any allowed choices: ${choices.join(', ')}`,
  }
}
