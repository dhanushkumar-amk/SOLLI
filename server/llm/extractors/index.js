import { extractAddress } from './address.js'
import { extractChoice } from './choice.js'
import { extractName } from './name.js'
import { extractText } from './text.js'
import { extractYesNo } from './yesno.js'
import { extractDate } from './date.js'
import { extractPhone } from './phone.js'
import { extractAadhaar } from './aadhaar.js'
import { extractBankAccount } from './bank_account.js'
import { extractIfsc } from './ifsc.js'
import { extractNumber } from './number.js'
import { extractSpelledName } from './spell.js'

const EXTRACTOR_REGISTRY = {
  name: extractName,
  text: extractText,
  address: extractAddress,
  yes_no: extractYesNo,
  choice: extractChoice,
  date: extractDate,
  phone: extractPhone,
  aadhaar: extractAadhaar,
  bank_account: extractBankAccount,
  ifsc: extractIfsc,
  number: extractNumber,
  spell: extractSpelledName,
}

/**
 * Returns the dedicated extractor for a given field type, or null if unhandled.
 * @param {string} type - field type
 * @returns {Function | null}
 */
export function getExtractorForType(type) {
  return EXTRACTOR_REGISTRY[type] || null
}

export {
  extractAddress,
  extractChoice,
  extractName,
  extractText,
  extractYesNo,
  extractDate,
  extractPhone,
  extractAadhaar,
  extractBankAccount,
  extractIfsc,
  extractNumber,
  extractSpelledName,
}
