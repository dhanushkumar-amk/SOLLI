import { cleanUnicodeAndWhitespace } from '../normalize.js'
import { COMMAND_FILLERS, COMMAND_MAX_WORDS, COMMAND_PHRASES } from './lexicon.js'
import { matchFieldTarget } from './target.js'

/**
 * Strips leading/trailing conversational fillers from an utterance
 * e.g. "please repeat sir" -> "repeat"
 * e.g. "konjam thirumba sollunga pa" -> "thirumba sollunga"
 */
export function stripFillers(text) {
  const words = text.trim().split(/\s+/)
  let start = 0
  let end = words.length - 1

  while (start <= end && COMMAND_FILLERS.has(words[start].toLowerCase())) {
    start++
  }
  while (end >= start && COMMAND_FILLERS.has(words[end].toLowerCase())) {
    end--
  }

  if (start > end) return ''
  return words.slice(start, end + 1).join(' ')
}

/**
 * Pure voice command detector for Solli conversation loop.
 *
 * Designed with a "false-positive first" defensive strategy:
 * - A normal answer containing a command word must never be accidentally executed as a command.
 * - Long utterances (> COMMAND_MAX_WORDS) are immediately treated as answers.
 * - Context-aware gating prevents dangerous commands in confirmation states.
 *
 * @param {string} rawTranscript - input speech transcript or typed input
 * @param {Object} [context={}] - { state, field, fields }
 * @returns {{ command: string|null, confidence: number, target: string|null, ambiguous: boolean, candidates?: string[] }}
 */
export function detectCommand(rawTranscript, context = {}) {
  const { state = 'listening', field = null, fields = [] } = context

  if (!rawTranscript || typeof rawTranscript !== 'string') {
    return { command: null, confidence: 0, target: null, ambiguous: false }
  }

  const cleaned = cleanUnicodeAndWhitespace(rawTranscript).toLowerCase().trim()
  if (!cleaned) {
    return { command: null, confidence: 0, target: null, ambiguous: false }
  }

  const words = cleaned.split(/\s+/)

  // 1. Conservative length guard: long utterances (> 6 words) are answers, not commands
  if (words.length > COMMAND_MAX_WORDS) {
    return { command: null, confidence: 0, target: null, ambiguous: false }
  }

  const stripped = stripFillers(cleaned)
  const strippedWords = stripped ? stripped.split(/\s+/) : []

  // 2. Context rule: In confirmation states, only repeat, help, and operator are allowed
  const isConfirmState =
    state === 'listeningConfirm' ||
    state === 'speakingReadback' ||
    state === 'processingConfirm'

  // 3. Name, address, and text fields: require strict exact phrase matching
  // Prevents false positives like "Skandan", "back street", "next to temple", "bus stop street"
  const isFreeformTextField =
    field && (field.type === 'name' || field.type === 'address' || field.type === 'text')

  // Check each command category against canonical lexicon
  for (const [cmd, phrases] of Object.entries(COMMAND_PHRASES)) {
    // Confirmation context gating
    if (isConfirmState) {
      if (cmd !== 'repeat' && cmd !== 'help' && cmd !== 'operator') {
        continue
      }
    }

    for (const phrase of phrases) {
      const pNorm = phrase.toLowerCase()

      // Exact match on cleaned utterance or stripped utterance
      const isExactMatch = cleaned === pNorm || stripped === pNorm

      if (isExactMatch) {
        // Strict guard: In freeform text fields, "skip" and "dont_know" must be short exact phrases (<= 3 words)
        if (isFreeformTextField && (cmd === 'skip' || cmd === 'dont_know')) {
          if (words.length > 3) {
            continue
          }
        }

        // Special handling for change_field: extract field target
        if (cmd === 'change_field') {
          const targetRes = matchFieldTarget(cleaned, fields)
          return {
            command: 'change_field',
            confidence: 0.95,
            target: targetRes.target,
            ambiguous: targetRes.ambiguous,
            candidates: targetRes.candidates,
          }
        }

        return {
          command: cmd,
          confidence: 0.95,
          target: null,
          ambiguous: false,
        }
      }
    }
  }

  // 4. "change <X>" phrase patterns (e.g. "change the village", "ooru maathunga", "change phone")
  const hasChangeVerb =
    /\b(?:change|edit|modify|correct|update|maathunga|maathanum|maathu|thiruthunga|thiruthanum)\b/i.test(cleaned) ||
    /(?:மாத்துங்க|மாத்தணும்|மாற்று|மாற்றவும்|திருத்தவும்|சேஞ்ச்)/u.test(cleaned)

  if (hasChangeVerb && !isConfirmState) {
    // Negation guard: "illa", "illai", "not", "vendam" means NOT asking to change
    const hasNegation =
      /\b(?:illa|illai|ille|vendam|vendaam|no|not|illadha)\b/i.test(cleaned) ||
      /(?:இல்லை|இல்ல|வேண்டாம்)/u.test(cleaned)

    if (!hasNegation && words.length <= 5) {
      const targetRes = matchFieldTarget(cleaned, fields)
      // Only execute change_field if a concrete target field was matched or is ambiguous
      if (targetRes.target || targetRes.ambiguous) {
        return {
          command: 'change_field',
          confidence: targetRes.confidence || 0.85,
          target: targetRes.target,
          ambiguous: targetRes.ambiguous,
          candidates: targetRes.candidates,
        }
      }
    }
  }

  // 5. Negative keyword safety: ensure names, addresses, and answers with command substrings stay answers
  // If no confident command matched, return null
  return { command: null, confidence: 0, target: null, ambiguous: false }
}
