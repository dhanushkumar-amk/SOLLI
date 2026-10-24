import assert from 'node:assert/strict'
import test from 'node:test'
import {
  maskValue,
  validateAadhaar,
  validateAddress,
  validateBankAccount,
  validateChoice,
  validateDate,
  validateIfsc,
  validateName,
  validateNumber,
  validatePhone,
  validateYesNo,
} from '../forms/validators.js'

test('Validator Unit Tests', async (t) => {
  // ----------------------------------------------------
  // Date Validator Tests
  // ----------------------------------------------------
  await t.test('validateDate: 6 good inputs', () => {
    // 1. Standard DOB
    const r1 = validateDate('1958-05-05')
    assert.equal(r1.ok, true)
    assert.equal(r1.value, '1958-05-05')
    assert.ok(r1.age >= 60)

    // 2. Leap year Feb 29 (year 2000)
    const r2 = validateDate('2000-02-29')
    assert.equal(r2.ok, true)
    assert.equal(r2.value, '2000-02-29')

    // 3. Leap year Feb 29 (year 1964)
    const r3 = validateDate('1964-02-29')
    assert.equal(r3.ok, true)

    // 4. End of year Dec 31
    const r4 = validateDate('1950-12-31')
    assert.equal(r4.ok, true)

    // 5. Beginning of year Jan 01
    const r5 = validateDate('1960-01-01')
    assert.equal(r5.ok, true)

    // 6. Day 30 on 30-day month (April 30)
    const r6 = validateDate('1955-04-30')
    assert.equal(r6.ok, true)
  })

  await t.test('validateDate: 6 bad inputs', () => {
    // 1. Non-leap year Feb 29 (2021 is not a leap year)
    const r1 = validateDate('2021-02-29')
    assert.equal(r1.ok, false)
    assert.equal(r1.error, 'INVALID_DAY')

    // 2. Impossible date (Feb 30)
    const r2 = validateDate('1958-02-30')
    assert.equal(r2.ok, false)
    assert.equal(r2.error, 'INVALID_DAY')

    // 3. April 31 (April has 30 days)
    const r3 = validateDate('1958-04-31')
    assert.equal(r3.ok, false)
    assert.equal(r3.error, 'INVALID_DAY')

    // 4. Future date of birth
    const r4 = validateDate('2035-01-01')
    assert.equal(r4.ok, false)
    assert.equal(r4.error, 'FUTURE_DATE')

    // 5. Invalid month (13)
    const r5 = validateDate('1958-13-05')
    assert.equal(r5.ok, false)
    assert.equal(r5.error, 'INVALID_MONTH')

    // 6. Bad format (not YYYY-MM-DD)
    const r6 = validateDate('05-05-1958')
    assert.equal(r6.ok, false)
    assert.equal(r6.error, 'INVALID_FORMAT')
  })

  // ----------------------------------------------------
  // Phone Validator Tests
  // ----------------------------------------------------
  await t.test('validatePhone: 6 good inputs', () => {
    // Standard Indian numbers starting 6-9
    assert.equal(validatePhone('9876543210').ok, true)
    assert.equal(validatePhone('8765432109').ok, true)
    assert.equal(validatePhone('7654321098').ok, true)
    assert.equal(validatePhone('6543210987').ok, true)
    // Spaced format
    assert.equal(validatePhone('98765 43210').ok, true)
    // Fake test fixture starting 00000 (allowed in non-production)
    assert.equal(validatePhone('00000 00001', { allowFake: true }).ok, true)
  })

  await t.test('validatePhone: 6 bad inputs', () => {
    // 1. Only 9 digits
    assert.equal(validatePhone('987654321').ok, false)
    // 2. 11 digits
    assert.equal(validatePhone('98765432100').ok, false)
    // 3. Invalid starting digit (starts with 1)
    assert.equal(validatePhone('1234567890', { allowFake: false }).ok, false)
    // 4. Invalid starting digit (starts with 5)
    assert.equal(validatePhone('5234567890', { allowFake: false }).ok, false)
    // 5. Letters inside phone
    assert.equal(validatePhone('98765abcde').ok, false)
    // 6. Empty string
    assert.equal(validatePhone('').ok, false)
  })

  // ----------------------------------------------------
  // Aadhaar Validator Tests
  // ----------------------------------------------------
  await t.test('validateAadhaar: 6 good inputs', () => {
    assert.equal(validateAadhaar('0000 0000 0001').ok, true)
    assert.equal(validateAadhaar('000000000002').ok, true)
    assert.equal(validateAadhaar('1234 5678 9012').ok, true)
    assert.equal(validateAadhaar('9999 8888 7777').ok, true)
    assert.equal(validateAadhaar('2345 6789 0123').ok, true)
    assert.equal(validateAadhaar('3456 7890 1234').ok, true)
  })

  await t.test('validateAadhaar: 6 bad inputs', () => {
    // 1. 11 digits (too short)
    assert.equal(validateAadhaar('1234 5678 901').ok, false)
    // 2. 13 digits (too long)
    assert.equal(validateAadhaar('1234 5678 90123').ok, false)
    // 3. Letters inside
    assert.equal(validateAadhaar('1234 5678 901A').ok, false)
    // 4. Empty
    assert.equal(validateAadhaar('').ok, false)
    // 5. Special characters
    assert.equal(validateAadhaar('1234-5678-9012!').ok, false)
    // 6. Null
    assert.equal(validateAadhaar(null).ok, false)
  })

  // ----------------------------------------------------
  // IFSC Validator Tests
  // ----------------------------------------------------
  await t.test('validateIfsc: 6 good inputs', () => {
    assert.equal(validateIfsc('SBIN0001234').ok, true)
    assert.equal(validateIfsc('HDFC0000001').ok, true)
    assert.equal(validateIfsc('ICIC0000100').ok, true)
    assert.equal(validateIfsc('sbin0001234').ok, true) // case-insensitive
    assert.equal(validateIfsc('IOBA0000555').ok, true)
    assert.equal(validateIfsc('PUNB0123400').ok, true)
  })

  await t.test('validateIfsc: 6 bad inputs', () => {
    // 1. Only 10 characters
    assert.equal(validateIfsc('SBIN000123').ok, false)
    // 2. 12 characters
    assert.equal(validateIfsc('SBIN00012345').ok, false)
    // 3. 5th character is not '0'
    assert.equal(validateIfsc('SBIN1001234').ok, false)
    // 4. First 4 characters contain digits
    assert.equal(validateIfsc('SBI10001234').ok, false)
    // 5. Contains special characters
    assert.equal(validateIfsc('SBIN000-123').ok, false)
    // 6. Empty
    assert.equal(validateIfsc('').ok, false)
  })

  // ----------------------------------------------------
  // Name Validator Tests
  // ----------------------------------------------------
  await t.test('validateName: 6 good inputs', () => {
    // 1. Name with initial and dot
    assert.equal(validateName('K. Muthulakshmi').ok, true)
    // 2. Multi-word name
    assert.equal(validateName('Demo Anbu One').ok, true)
    // 3. Tamil script name
    assert.equal(validateName('முத்துலட்சுமி').ok, true)
    // 4. Tamil name with initial
    assert.equal(validateName('கே. முத்துலட்சுமி').ok, true)
    // 5. Name with hyphen
    assert.equal(validateName('Mary-Jane').ok, true)
    // 6. Long valid name
    assert.equal(validateName('Demo Verylong Exampleperson Name').ok, true)
  })

  await t.test('validateName: 6 bad inputs', () => {
    // 1. Too short (1 char)
    assert.equal(validateName('A').ok, false)
    // 2. Contains numbers
    assert.equal(validateName('John123').ok, false)
    // 3. Special punctuation symbols
    assert.equal(validateName('John@Doe').ok, false)
    // 4. Empty string
    assert.equal(validateName('   ').ok, false)
    // 5. Only symbols
    assert.equal(validateName('...').ok, false)
    // 6. Too long (> 60 chars)
    assert.equal(validateName('A'.repeat(61)).ok, false)
  })

  // ----------------------------------------------------
  // Number Validator Tests
  // ----------------------------------------------------
  await t.test('validateNumber: 6 good inputs', () => {
    assert.equal(validateNumber('68', { min: 60 }).ok, true)
    assert.equal(validateNumber(72, { min: 60 }).ok, true)
    assert.equal(validateNumber('0').ok, true)
    assert.equal(validateNumber('100', { min: 0, max: 100 }).ok, true)
    assert.equal(validateNumber('-5', { min: -10 }).ok, true)
    assert.equal(validateNumber(3.14).ok, true)
  })

  await t.test('validateNumber: 6 bad inputs', () => {
    // 1. Not a number
    assert.equal(validateNumber('abc').ok, false)
    // 2. Below min
    assert.equal(validateNumber('55', { min: 60 }).ok, false)
    // 3. Above max
    assert.equal(validateNumber('125', { max: 100 }).ok, false)
    // 4. Empty string
    assert.equal(validateNumber('').ok, false)
    // 5. Null
    assert.equal(validateNumber(null).ok, false)
    // 6. NaN
    assert.equal(validateNumber(NaN).ok, false)
  })

  // ----------------------------------------------------
  // Masking Tests
  // ----------------------------------------------------
  await t.test('maskValue: hides sensitive digits', () => {
    // Aadhaar: only last 4 digits
    assert.equal(maskValue('0000 0000 0001', 'aadhaar'), '•••• •••• 0001')
    assert.equal(maskValue('123456789012', 'aadhaar'), '•••• •••• 9012')

    // Bank Account: only last 4 digits
    assert.equal(maskValue('000000000000001', 'bank_account'), '•••••••••••0001')

    // Phone: middle 4 digits masked
    assert.equal(maskValue('9876543210', 'phone'), '987•• ••210')
    assert.equal(maskValue('0000000001', 'phone'), '000•• ••001')

    // Non-sensitive: unaltered
    assert.equal(maskValue('Demo Anbu', 'name'), 'Demo Anbu')
    assert.equal(maskValue('1958-05-05', 'date'), '1958-05-05')
  })
})
