import { SCRIPT_VARIANTS } from '../lexicon.js'
import { cleanUnicodeAndWhitespace } from '../normalize.js'

export function extractYesNo(rawText) {
  let cleaned = cleanUnicodeAndWhitespace(rawText).toLowerCase()
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

  // Normalize negated affirmative phrases (e.g., "not correct", "not right")
  const hasNegatedAffirmative = /\bnot\s+(?:correct|right|true|ok)\b/i.test(cleaned)
  if (hasNegatedAffirmative) {
    cleaned = cleaned.replace(/\bnot\s+(?:correct|right|true|ok)\b/gi, 'wrong')
  }

  // Detect affirmative cues (Tamil, Roman, English)
  const hasAffirmative =
    /\b(?:yes|yeah|yep|aama|aamam|aam|aamaa|sari|correct|ok|haan|ha|right)\b/i.test(cleaned) ||
    /(?:ஆமா|ஆமாம்|ஆம்|சரி|ஹான்|கரெக்ட்|சரிதான்)/u.test(cleaned)

  // Detect negative cues (Tamil, Roman, English)
  const hasNegative =
    /\b(?:no|nope|illai|illa|ille|kidaiyathu|wrong|thappu|tappu|illaye)\b/i.test(cleaned) ||
    /(?:இல்லை|இல்ல|கிடையாது|தவறு|தப்பு|இல்லையே)/u.test(cleaned)

  // Ambiguous case (e.g. "sari, aana illai" or "yes but no" or "aama illa")
  if (hasAffirmative && hasNegative) {
    // If negative occurs after "aana" or "but", resolve contrast to negative with confirmation needed
    const parts = cleaned.split(/\b(?:aana|but|aanal)\b/i)
    if (parts.length > 1) {
      const secondPart = parts[1]
      const secondNegative =
        /\b(?:no|illai|illa|ille|wrong|thappu)\b/i.test(secondPart) || /(?:இல்லை|இல்ல|தவறு)/u.test(secondPart)
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
      reason: 'Ambiguous transcript containing conflicting yes and no cues',
    }
  }

  if (hasAffirmative) {
    return {
      value: 'yes',
      confidence: 0.95,
      needsConfirmation: false,
      reason: 'Affirmative response detected',
    }
  }

  if (hasNegative) {
    return {
      value: 'no',
      confidence: 0.95,
      needsConfirmation: false,
      reason: 'Negative response detected',
    }
  }

  return {
    value: null,
    confidence: 0.2,
    needsConfirmation: true,
    reason: 'Could not determine yes/no intent from transcript',
  }
}
