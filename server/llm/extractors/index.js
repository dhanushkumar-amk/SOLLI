import { extractAddress } from './address.js'
import { extractChoice } from './choice.js'
import { extractName } from './name.js'
import { extractText } from './text.js'
import { extractYesNo } from './yesno.js'

const EXTRACTOR_REGISTRY = {
  name: extractName,
  text: extractText,
  address: extractAddress,
  yes_no: extractYesNo,
  choice: extractChoice,
}

/**
 * Returns the dedicated extractor for a given field type, or null if type is handled by general rules
 * @param {string} type - field type ('name', 'text', 'address', 'yes_no', 'choice')
 * @returns {Function | null}
 */
export function getExtractorForType(type) {
  return EXTRACTOR_REGISTRY[type] || null
}

export { extractAddress, extractChoice, extractName, extractText, extractYesNo }
