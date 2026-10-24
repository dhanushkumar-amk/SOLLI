// Pure validation functions for Solli form fields (Zero network dependencies)

// Verhoeff algorithm tables for Aadhaar checksum verification (when enabled)
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
]

const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]

function verhoeffCheck(numStr) {
  let c = 0
  const len = numStr.length
  for (let i = 0; i < len; i++) {
    const digit = parseInt(numStr.charAt(len - 1 - i), 10)
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][digit]]
  }
  return c === 0
}

/**
 * Validates ISO date "YYYY-MM-DD", checks calendar validity and leap years,
 * verifies date is not in the future, and calculates age.
 */
export function validateDate(val, { minAge = null, maxAge = null } = {}) {
  if (!val || typeof val !== 'string') {
    return {
      ok: false,
      value: null,
      error: 'INVALID_TYPE',
      message: { ta: 'தேதி தவறாக உள்ளது.', en: 'Date must be a string.' },
    }
  }

  const match = val.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    return {
      ok: false,
      value: null,
      error: 'INVALID_FORMAT',
      message: { ta: 'தேதி YYYY-MM-DD வடிவில் இருக்க வேண்டும்.', en: 'Date must be in YYYY-MM-DD format.' },
    }
  }

  const year = parseInt(match[1], 10)
  const month = parseInt(match[2], 10)
  const day = parseInt(match[3], 10)

  if (month < 1 || month > 12) {
    return {
      ok: false,
      value: null,
      error: 'INVALID_MONTH',
      message: { ta: 'மாதம் 1 முதல் 12 வரை இருக்க வேண்டும்.', en: 'Month must be between 1 and 12.' },
    }
  }

  // Days per month with leap-year rule for February
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  const daysInMonth = [0, 31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

  if (day < 1 || day > daysInMonth[month]) {
    return {
      ok: false,
      value: null,
      error: 'INVALID_DAY',
      message: {
        ta: `${year}-${String(month).padStart(2, '0')} இல் ${day} என்ற நாள் இல்லை.`,
        en: `Day ${day} is invalid for month ${month} in year ${year}.`,
      },
    }
  }

  const birthDate = new Date(year, month - 1, day)
  const today = new Date()

  if (birthDate > today) {
    return {
      ok: false,
      value: null,
      error: 'FUTURE_DATE',
      message: { ta: 'பிறந்த தேதி எதிர்காலத்தில் இருக்க முடியாது.', en: 'Date of birth cannot be in the future.' },
    }
  }

  // Calculate age
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  if (minAge !== null && age < minAge) {
    return {
      ok: false,
      value: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      age,
      error: 'AGE_TOO_LOW',
      message: {
        ta: `விண்ணப்பதாரரின் வயது ${minAge} அல்லது அதற்கு மேல் இருக்க வேண்டும் (தற்போதைய வயது: ${age}).`,
        en: `Applicant must be at least ${minAge} years old (calculated age: ${age}).`,
      },
    }
  }

  if (maxAge !== null && age > maxAge) {
    return {
      ok: false,
      value: null,
      age,
      error: 'AGE_TOO_HIGH',
      message: {
        ta: `வயது ${maxAge} ஐ விட அதிகமாக இருக்க முடியாது.`,
        en: `Age cannot exceed ${maxAge} years.`,
      },
    }
  }

  const normalized = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return { ok: true, value: normalized, age, error: null, message: null }
}

/**
 * Validates names in Tamil or Latin script, dots and initials allowed (2 to 60 characters).
 * Must contain at least 2 letters.
 */
export function validateName(val) {
  if (!val || typeof val !== 'string') {
    return {
      ok: false,
      value: null,
      error: 'INVALID_TYPE',
      message: { ta: 'பெயர் உள்ளிடப்பட வேண்டும்.', en: 'Name is required.' },
    }
  }

  const trimmed = val.trim().replace(/\s+/g, ' ')
  if (trimmed.length < 2 || trimmed.length > 60) {
    return {
      ok: false,
      value: null,
      error: 'INVALID_LENGTH',
      message: { ta: 'பெயர் 2 முதல் 60 எழுத்துகள் இருக்க வேண்டும்.', en: 'Name must be between 2 and 60 characters.' },
    }
  }

  // Reject digits
  if (/\d/.test(trimmed)) {
    return {
      ok: false,
      value: null,
      error: 'CONTAINS_DIGITS',
      message: { ta: 'பெயரில் எண்கள் இருக்கக்கூடாது.', en: 'Name must not contain numbers.' },
    }
  }

  // Allow Tamil script (\u0B80-\u0BFF), Latin letters (a-zA-Z), dots, spaces, hyphens
  const nameRegex = /^[\u0B80-\u0BFFa-zA-Z\s\.\-']+$/
  if (!nameRegex.test(trimmed)) {
    return {
      ok: false,
      value: null,
      error: 'INVALID_CHARACTERS',
      message: { ta: 'பெயரில் செல்லுபடியாகும் எழுத்துகள் மட்டுமே இருக்க வேண்டும்.', en: 'Name contains invalid characters.' },
    }
  }

  // Must contain at least 2 letters (Tamil or Latin)
  const letters = trimmed.match(/[\u0B80-\u0BFFa-zA-Z]/g) || []
  if (letters.length < 2) {
    return {
      ok: false,
      value: null,
      error: 'INSUFFICIENT_LETTERS',
      message: { ta: 'பெயரில் குறைந்தது 2 எழுத்துகள் இருக்க வேண்டும்.', en: 'Name must contain at least 2 letter characters.' },
    }
  }

  return { ok: true, value: trimmed, error: null, message: null }
}

/**
 * Validates 10-digit Indian phone numbers (starts with 6-9, or 00000 for fake fixtures in dev/test)
 */
export function validatePhone(val, { allowFake = process.env.NODE_ENV !== 'production' } = {}) {
  if (!val || (typeof val !== 'string' && typeof val !== 'number')) {
    return {
      ok: false,
      value: null,
      error: 'INVALID_TYPE',
      message: { ta: 'தொலைபேசி எண் தேவை.', en: 'Phone number is required.' },
    }
  }

  const rawStr = String(val).trim()
  if (/[^0-9\s\-]/.test(rawStr)) {
    return {
      ok: false,
      value: null,
      error: 'INVALID_CHARACTERS',
      message: { ta: 'தொலைபேசி எண்ணில் எண்கள் மட்டுமே இருக்க வேண்டும்.', en: 'Phone number must contain digits only.' },
    }
  }

  const digits = rawStr.replace(/\D/g, '')

  if (digits.length !== 10) {
    return {
      ok: false,
      value: null,
      error: 'INVALID_LENGTH',
      message: { ta: 'தொலைபேசி எண் 10 இலக்கங்களாக இருக்க வேண்டும்.', en: 'Phone number must be exactly 10 digits.' },
    }
  }

  const isRealMobile = /^[6-9]\d{9}$/.test(digits)
  const isFakeMobile = /^00000\d{5}$/.test(digits)

  if (!isRealMobile && !(allowFake && isFakeMobile)) {
    return {
      ok: false,
      value: null,
      error: 'INVALID_FORMAT',
      message: { ta: 'செல்லுபடியாகும் இந்திய மொபைல் எண்ணை உள்ளிடவும் (6-9 இல் தொடங்கும்).', en: 'Must be a valid Indian mobile number starting with 6-9.' },
    }
  }

  const normalized = `${digits.slice(0, 5)} ${digits.slice(5)}`
  return { ok: true, value: normalized, error: null, message: null }
}

/**
 * Validates 12-digit Aadhaar number format.
 * NOTE: Format check only; does not claim live verification.
 */
export function validateAadhaar(val, { checkVerhoeff = false } = {}) {
  if (!val || (typeof val !== 'string' && typeof val !== 'number')) {
    return {
      ok: false,
      value: null,
      error: 'INVALID_TYPE',
      message: { ta: 'ஆதார் எண் தேவை.', en: 'Aadhaar number is required.' },
    }
  }

  const rawStr = String(val).trim()
  if (/[^0-9\s\-]/.test(rawStr)) {
    return {
      ok: false,
      value: null,
      error: 'INVALID_CHARACTERS',
      message: { ta: 'ஆதார் எண்ணில் எண்கள் மட்டுமே இருக்க வேண்டும்.', en: 'Aadhaar number must contain digits only.' },
    }
  }

  const digits = rawStr.replace(/\D/g, '')

  if (digits.length !== 12) {
    return {
      ok: false,
      value: null,
      error: 'INVALID_LENGTH',
      message: { ta: 'ஆதார் எண் 12 இலக்கங்களாக இருக்க வேண்டும்.', en: 'Aadhaar number must be exactly 12 digits.' },
    }
  }

  // Verhoeff checksum validation if explicitly requested
  if (checkVerhoeff) {
    if (!verhoeffCheck(digits)) {
      return {
        ok: false,
        value: null,
        error: 'INVALID_CHECKSUM',
        message: { ta: 'ஆதார் சரிபார்ப்பு எண் தவறானது.', en: 'Invalid Aadhaar checksum.' },
      }
    }
  }

  const normalized = `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`
  return { ok: true, value: normalized, error: null, message: null }
}

/**
 * Validates bank account digits (TBD length range: 9 to 18 digits)
 */
export function validateBankAccount(val, { minLength = 9, maxLength = 18 } = {}) {
  if (!val || (typeof val !== 'string' && typeof val !== 'number')) {
    return {
      ok: false,
      value: null,
      error: 'INVALID_TYPE',
      message: { ta: 'வங்கி கணக்கு எண் தேவை.', en: 'Bank account number is required.' },
    }
  }

  const rawStr = String(val).trim()
  if (/[^0-9\s]/.test(rawStr)) {
    return {
      ok: false,
      value: null,
      error: 'INVALID_CHARACTERS',
      message: { ta: 'வங்கி கணக்கு எண்ணில் எண்கள் மட்டுமே இருக்க வேண்டும்.', en: 'Bank account number must contain digits only.' },
    }
  }

  const digits = rawStr.replace(/\D/g, '')

  if (digits.length < minLength || digits.length > maxLength) {
    return {
      ok: false,
      value: null,
      error: 'INVALID_LENGTH',
      message: {
        ta: `வங்கி கணக்கு எண் ${minLength} முதல் ${maxLength} இலக்கங்கள் வரை இருக்க வேண்டும்.`,
        en: `Bank account number must be between ${minLength} and ${maxLength} digits.`,
      },
    }
  }

  return { ok: true, value: digits, error: null, message: null }
}

/**
 * Validates 11-character Indian Financial System Code (IFSC)
 */
export function validateIfsc(val) {
  if (!val || typeof val !== 'string') {
    return {
      ok: false,
      value: null,
      error: 'INVALID_TYPE',
      message: { ta: 'IFSC குறியீடு தேவை.', en: 'IFSC code is required.' },
    }
  }

  const cleaned = val.trim().toUpperCase()
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/

  if (!ifscRegex.test(cleaned)) {
    return {
      ok: false,
      value: null,
      error: 'INVALID_FORMAT',
      message: {
        ta: 'IFSC குறியீடு 11 எழுத்துகள் (4 எழுத்து, 0, 6 எழுத்து/எண்) வடிவில் இருக்க வேண்டும்.',
        en: 'IFSC must be 11 characters (4 letters, "0", 6 alphanumeric).',
      },
    }
  }

  return { ok: true, value: cleaned, error: null, message: null }
}

/**
 * Validates numeric fields with optional min and max bounds
 */
export function validateNumber(val, { min = null, max = null } = {}) {
  if (val === null || val === undefined || val === '') {
    return {
      ok: false,
      value: null,
      error: 'REQUIRED',
      message: { ta: 'எண் தேவை.', en: 'Number is required.' },
    }
  }

  const num = Number(val)
  if (isNaN(num)) {
    return {
      ok: false,
      value: null,
      error: 'NOT_A_NUMBER',
      message: { ta: 'செல்லுபடியாகும் எண்ணை உள்ளிடவும்.', en: 'Must be a valid number.' },
    }
  }

  if (min !== null && num < min) {
    return {
      ok: false,
      value: num,
      error: 'MIN_VALUE',
      message: { ta: `மதிப்பு குறைந்தபட்சம் ${min} ஆக இருக்க வேண்டும்.`, en: `Value must be at least ${min}.` },
    }
  }

  if (max !== null && num > max) {
    return {
      ok: false,
      value: num,
      error: 'MAX_VALUE',
      message: { ta: `மதிப்பு அதிகபட்சம் ${max} வரை இருக்கலாம்.`, en: `Value cannot exceed ${max}.` },
    }
  }

  return { ok: true, value: num, error: null, message: null }
}

/**
 * Validates yes/no affirmation in English or Tamil
 */
export function validateYesNo(val) {
  if (!val) {
    return {
      ok: false,
      value: null,
      error: 'REQUIRED',
      message: { ta: 'ஆம் அல்லது இல்லை என்று தேர்வு செய்யவும்.', en: 'Please select yes or no.' },
    }
  }

  const str = String(val).trim().toLowerCase()
  if (/^(yes|y|true|aama|aamang|1)$/i.test(str)) {
    return { ok: true, value: 'yes', error: null, message: null }
  }
  if (/^(no|n|false|illai|illa|0)$/i.test(str)) {
    return { ok: true, value: 'no', error: null, message: null }
  }

  return {
    ok: false,
    value: null,
    error: 'INVALID_CHOICE',
    message: { ta: 'ஆம் அல்லது இல்லை என்று கூறவும்.', en: 'Must be "yes" or "no".' },
  }
}

/**
 * Validates choice from allowed list
 */
export function validateChoice(val, { choices = [] } = {}) {
  if (!val || typeof val !== 'string') {
    return {
      ok: false,
      value: null,
      error: 'REQUIRED',
      message: { ta: 'ஒரு தேர்வை தேர்ந்தெடுக்கவும்.', en: 'Please select an option.' },
    }
  }

  const trimmed = val.trim().toLowerCase()
  for (const choice of choices) {
    if (choice.toLowerCase() === trimmed) {
      return { ok: true, value: choice, error: null, message: null }
    }
  }

  return {
    ok: false,
    value: null,
    error: 'INVALID_CHOICE',
    message: {
      ta: `செல்லுபடியாகும் தேர்வை தேர்வு செய்யவும்: ${choices.join(', ')}.`,
      en: `Must be one of: ${choices.join(', ')}.`,
    },
  }
}

/**
 * Validates address string (length 3 to 200)
 */
export function validateAddress(val, { min = 3, max = 200 } = {}) {
  if (!val || typeof val !== 'string') {
    return {
      ok: false,
      value: null,
      error: 'REQUIRED',
      message: { ta: 'முகவரி தேவை.', en: 'Address is required.' },
    }
  }

  const trimmed = val.trim().replace(/\s+/g, ' ')
  if (trimmed.length < min || trimmed.length > max) {
    return {
      ok: false,
      value: null,
      error: 'INVALID_LENGTH',
      message: {
        ta: `முகவரி ${min} முதல் ${max} எழுத்துகள் வரை இருக்க வேண்டும்.`,
        en: `Address must be between ${min} and ${max} characters.`,
      },
    }
  }

  return { ok: true, value: trimmed, error: null, message: null }
}

/**
 * Masks sensitive values for screen display and logging.
 * Never logs or reveals full Aadhaar, Bank Account, or Phone.
 */
export function maskValue(value, type) {
  if (value === null || value === undefined || value === '') return ''
  const str = String(value).trim()

  switch (type) {
    case 'aadhaar': {
      const digits = str.replace(/\D/g, '')
      if (digits.length >= 4) {
        const last4 = digits.slice(-4)
        return `•••• •••• ${last4}`
      }
      return '•••• •••• ••••'
    }

    case 'bank_account': {
      const digits = str.replace(/\D/g, '')
      if (digits.length >= 4) {
        const last4 = digits.slice(-4)
        const maskedPrefix = '•'.repeat(Math.max(4, digits.length - 4))
        return `${maskedPrefix}${last4}`
      }
      return '••••••••'
    }

    case 'phone': {
      const digits = str.replace(/\D/g, '')
      if (digits.length === 10) {
        return `${digits.slice(0, 3)}•• ••${digits.slice(7)}`
      }
      return '••••• •••••'
    }

    default:
      return str
  }
}
