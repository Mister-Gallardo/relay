import { describe, expect, it } from 'vitest'
import { formatPhone, formatPhoneInput, isValidPhone, normalizePhone } from './phone'

describe('normalizePhone', () => {
  it('приводит российские номера к формату 7XXXXXXXXXX', () => {
    expect(normalizePhone('8 (999) 123-45-67')).toBe('79991234567')
    expect(normalizePhone('+7 999 123 45 67')).toBe('79991234567')
    expect(normalizePhone('9991234567')).toBe('79991234567')
  })

  it('не трогает белорусские номера', () => {
    expect(normalizePhone('+375 29 123-45-67')).toBe('375291234567')
  })
})

describe('isValidPhone', () => {
  it.each([
    ['+7 999 123-45-67', true],
    ['+7 999 123-45', false],
    ['+375 29 123-45-67', true],
    ['+375 29 123', false],
    ['+998 90 123 45 67', true],
    ['123', false],
  ])('%s → %s', (input, expected) => {
    expect(isValidPhone(input)).toBe(expected)
  })
})

describe('formatPhone', () => {
  it('форматирует номера РФ и РБ', () => {
    expect(formatPhone('79991234567')).toBe('+7 999 123-45-67')
    expect(formatPhone('375291234567')).toBe('+375 29 123-45-67')
  })

  it('оставляет прочие номера без группировки', () => {
    expect(formatPhone('998901234567')).toBe('+998901234567')
  })
})

describe('formatPhoneInput', () => {
  it('форматирует номер по мере ввода', () => {
    expect(formatPhoneInput('+')).toBe('+')
    expect(formatPhoneInput('7999')).toBe('+7 999')
    expect(formatPhoneInput('799912')).toBe('+7 999 12')
    expect(formatPhoneInput('79991234567')).toBe('+7 999 123-45-67')
  })

  it('заменяет ведущую 8 на +7', () => {
    expect(formatPhoneInput('8999')).toBe('+7 999')
  })
})
