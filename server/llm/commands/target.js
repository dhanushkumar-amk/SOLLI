import { levenshteinDistance, similarityRatio } from '../extractors/choice.js'
import { cleanUnicodeAndWhitespace } from '../normalize.js'
import { FIELD_ALIASES } from './lexicon.js'

/**
 * Strips command carrier words to isolate the target field name
 * e.g. "change the village" -> "village"
 * e.g. "gramam maathunga" -> "gramam"
 */
export function isolateTargetPhrase(text) {
  let cleaned = cleanUnicodeAndWhitespace(text).toLowerCase()

  // Remove common carrier prefixes / suffixes
  cleaned = cleaned
    .replace(/\b(?:change|edit|modify|correct|update|switch|alter)\b/gi, '')
    .replace(/\b(?:maathunga|maathanum|maathu|thiruthunga|thiruthanum|thiruthu)\b/gi, '')
    .replace(/(?:மாத்துங்க|மாத்தணும்|மாற்று|மாற்றவும்|திருத்தவும்|திருத்து|சேஞ்ச் த|சேஞ்ச்)/u, '')
    .replace(/\b(?:i want to|want to|please|sir|the|my|and|kullu|la|oda)\b/gi, '')
    .trim()

  return cleaned
}

/**
 * Matches a spoken or typed target phrase against pension form fields.
 *
 * @param {string} rawTargetText - text containing field reference (e.g. "village", "ooru", "phone")
 * @param {Array<Object>} fields - list of form field definitions
 * @param {number} [threshold=0.72] - minimum similarity threshold
 * @returns {{ target: string|null, confidence: number, ambiguous: boolean, candidates?: string[] }}
 */
export function matchFieldTarget(rawTargetText, fields = [], threshold = 0.72) {
  if (!rawTargetText || typeof rawTargetText !== 'string') {
    return { target: null, confidence: 0, ambiguous: false }
  }

  const query = isolateTargetPhrase(rawTargetText)
  if (!query) {
    // "change" with no target specified -> ambiguous: false, target: null
    return { target: null, confidence: 0, ambiguous: false }
  }

  const scores = []

  for (const field of fields) {
    if (!field.spoken) continue

    // Collect all aliases for this field
    const aliases = new Set([
      field.id.toLowerCase(),
      field.id.replace(/_/g, ' ').toLowerCase(),
    ])

    if (field.labels?.en) aliases.add(field.labels.en.toLowerCase())
    if (field.labels?.ta) aliases.add(field.labels.ta.toLowerCase())
    if (field.labels?.printed) aliases.add(field.labels.printed.toLowerCase())

    const extraAliases = FIELD_ALIASES[field.id] || []
    for (const a of extraAliases) {
      aliases.add(a.toLowerCase())
    }

    let maxFieldScore = 0

    for (const alias of aliases) {
      const cleanAlias = alias.trim()
      if (!cleanAlias) continue

      // 1. Exact match
      if (query === cleanAlias) {
        maxFieldScore = 1.0
        break
      }

      // 2. Substring or multi-word match
      if (query.includes(cleanAlias) || cleanAlias.includes(query)) {
        // Compute relative coverage score
        const coverage = Math.min(query.length, cleanAlias.length) / Math.max(query.length, cleanAlias.length)
        const score = 0.85 + coverage * 0.14
        if (score > maxFieldScore) maxFieldScore = score
      }

      // 3. Word token intersection
      const qWords = query.split(/\s+/)
      const aWords = cleanAlias.split(/\s+/)
      const intersection = qWords.filter((w) => aWords.includes(w))
      if (intersection.length > 0 && intersection.some((w) => w.length >= 3)) {
        const tokenScore = 0.8 + (intersection.length / Math.max(qWords.length, aWords.length)) * 0.15
        if (tokenScore > maxFieldScore) maxFieldScore = tokenScore
      }

      // 4. Fuzzy Levenshtein similarity ratio
      const sim = similarityRatio(query, cleanAlias)
      if (sim > maxFieldScore) {
        maxFieldScore = sim
      }
    }

    if (maxFieldScore >= threshold) {
      scores.push({ fieldId: field.id, score: maxFieldScore })
    }
  }

  if (scores.length === 0) {
    return { target: null, confidence: 0, ambiguous: false }
  }

  // Sort descending by score
  scores.sort((a, b) => b.score - a.score)

  const top = scores[0]

  // Check for ambiguous closeness between top two candidates
  if (scores.length > 1) {
    const second = scores[1]
    if (top.score === 1.0) {
      if (second.score === 1.0 && top.fieldId !== second.fieldId) {
        return {
          target: null,
          confidence: 1.0,
          ambiguous: true,
          candidates: [top.fieldId, second.fieldId],
        }
      }
    } else if (top.score - second.score < 0.08 && top.fieldId !== second.fieldId) {
      return {
        target: null,
        confidence: top.score,
        ambiguous: true,
        candidates: [top.fieldId, second.fieldId],
      }
    }
  }

  return {
    target: top.fieldId,
    confidence: Math.round(top.score * 100) / 100,
    ambiguous: false,
  }
}

/**
 * Returns any spoken field in form definition that lacks alias coverage
 */
export function checkFieldAliasCoverage(fields = []) {
  const missing = []
  for (const field of fields) {
    if (!field.spoken) continue
    const aliases = FIELD_ALIASES[field.id]
    if (!aliases || aliases.length === 0) {
      missing.push(field.id)
    }
  }
  return missing
}
