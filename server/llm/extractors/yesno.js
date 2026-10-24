import { SCRIPT_VARIANTS } from '../lexicon.js'
import { cleanUnicodeAndWhitespace } from '../normalize.js'

export function extractYesNo(rawText) {
  const cleaned = cleanUnicodeAndWhitespace(rawText).toLowerCase()
  if (!cleaned) {
    return { value: null, confidence: 0, needsConfirmation: false, reason: 'Empty yes/no transcript' }
  }

  // Check for direct lexicon match
  if (SCRIPT_VARIANTS[cleaned]) {
    return {
      value: SCRIPT_VARIANTS[cleaned],
      confidence: 0.95,
      needsConfirmation: false,
      reason: `Direct lexicon match: ${cleaned}`,
    }
  }

  // Detect affirmative cues
  const hasAffirmative = /\b(?:yes|yeah|yep|aama|aamam|aam|sari|correct|ok)\b/i.test(cleaned) ||
    /(?:ஆமா|ஆமாம்|ஆம்|சரி)/u.test(cleaned)

  // Detect negative cues
  const hasNegative = /\b(?:no|nope|illai|illa|ille|kidaiyathu)\b/i.test(cleaned) ||
    /(?:இல்லை|இல்ல|கிடையாது)/u.test(cleaned)

  // Ambiguous case (e.g. "sari, aana illai" or "yes but no")
  if (hasAffirmative && hasNegative) {
    // If negative occurs after "aana" or "but", treat as negative with confirmation needed
    const parts = cleaned.split(/\b(?:aana|but|aanal)\b/i)
    if (parts.length > 1) {
      const secondPart = parts[1]
      const secondNegative = /\b(?:no|illai|illa)\b/i.test(secondPart) || /(?:இல்லை|இல்ல)/u.test(secondPart)
      return {
        value: secondNegative ? 'no' : 'yes',
        confidence: 0.5,
        needsConfirmation: true,
        reason: 'Ambiguous affirmative/negative statement with contrast',
      }
    }

    return {
      value: null,
      confidence: 0.3,
      needsConfirmation: true,
      reason: 'Ambiguous transcript containing both yes and no cues',
    }
  }

  if (hasAffirmative) {
    return {
      value: 'yes',
      confidence: 0.9,
      needsConfirmation: false,
      reason: 'Affirmative response detected',
    }
  }

  if (hasNegative) {
    return {
      value: 'no',
      confidence: 0.9,
      needsConfirmation: false,
      reason: 'Negative response detected',
    }
  }

  return {
    value: null,
    confidence: 0.3,
    needsConfirmation: true,
    reason: 'Could not determine yes/no intent from transcript',
  }
}
