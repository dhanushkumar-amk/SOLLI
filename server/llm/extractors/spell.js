import { validateName } from '../../forms/validators.js'

/**
 * Letter mapping for spoken letter names in English and simple Romanized Tamil.
 */
const LETTER_NAMES = {
  // English alphabet spoken letters
  a: 'A',
  b: 'B',
  c: 'C',
  d: 'D',
  e: 'E',
  f: 'F',
  g: 'G',
  h: 'H',
  i: 'I',
  j: 'J',
  k: 'K',
  l: 'L',
  m: 'M',
  n: 'N',
  o: 'O',
  p: 'P',
  q: 'Q',
  r: 'R',
  s: 'S',
  t: 'T',
  u: 'U',
  v: 'V',
  w: 'W',
  x: 'X',
  y: 'Y',
  z: 'Z',
  dot: '.',
  space: ' ',
}

/**
 * Spelled-out name extractor for Solli forms.
 * Accepts letter-by-letter spoken input ("K space M U T H U"),
 * joins into words, preserves initials, and formats as Title Case.
 */
export function extractSpelledName(arg1, arg2, arg3) {
  const transcript = typeof arg1 === 'string' ? arg1 : arg2
  const options = typeof arg1 === 'object' && arg1 !== null ? arg1 : (arg2 || {})
  const field = typeof arg1 === 'object' && arg1 !== null && !options.fieldDef ? arg1 : (options.fieldDef || options)

  if (!transcript || typeof transcript !== 'string') {
    return {
      value: null,
      valid: false,
      validationError: 'EMPTY_INPUT',
      confidence: 0,
      needsConfirmation: true,
      raw: transcript,
    }
  }

  const clean = transcript.normalize('NFC').trim()
  const tokens = clean.split(/\s+/).filter(Boolean)

  let nameChars = []
  let sawInitials = false

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i].toLowerCase().replace(/[^a-z.]/g, '')
    if (!tok) continue

    if (tok === 'space' || tok === 'gap') {
      nameChars.push(' ')
      continue
    }

    if (tok === 'dot') {
      nameChars.push('.')
      nameChars.push(' ')
      sawInitials = true
      continue
    }

    if (tok.length === 1 && LETTER_NAMES[tok]) {
      nameChars.push(LETTER_NAMES[tok])
      continue
    }

    if (tok.length === 2 && tok.endsWith('.')) {
      nameChars.push(tok[0].toUpperCase())
      nameChars.push('.')
      nameChars.push(' ')
      sawInitials = true
      continue
    }

    // If multi-character token, treat each character if all alphabet
    if (/^[a-z]+$/i.test(tok) && tok.length <= 4) {
      for (const char of tok) {
        nameChars.push(char.toUpperCase())
      }
    }
  }

  let assembled = nameChars.join('').replace(/\s+/g, ' ').trim()

  // Format as title-case words, preserving dot initials (e.g. "K. Muthu")
  const parts = assembled.split(' ')
  const formattedParts = parts.map((part) => {
    if (part.includes('.')) {
      return part.toUpperCase()
    }
    if (part.length === 1) {
      return part.toUpperCase() + '.'
    }
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
  })

  const finalName = formattedParts.join(' ').replace(/\.\s+/g, '. ')
  const valResult = validateName(finalName)

  return {
    value: valResult.ok ? valResult.value : finalName || null,
    valid: valResult.ok,
    validationError: valResult.error || null,
    confidence: valResult.ok ? 0.9 : 0.4,
    needsConfirmation: true,
    isSpelled: true,
    notes: valResult.ok ? 'Spelled name assembled and formatted' : valResult.error,
    raw: transcript,
  }
}
