const MIN_LENGTH = 10
const MAX_LENGTH = 15

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

export function normalizePhone(value: string): string {
  let digits = digitsOnly(value)
  if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`
  if (digits.length === 10 && digits.startsWith('9')) digits = `7${digits}`
  return digits
}

export function isValidPhone(value: string): boolean {
  const digits = normalizePhone(value)
  if (digits.startsWith('7')) return digits.length === 11
  if (digits.startsWith('375')) return digits.length === 12
  return digits.length >= MIN_LENGTH && digits.length <= MAX_LENGTH
}

function withSeparators(digits: string, layout: Array<[number, string]>): string {
  let out = ''
  let cursor = 0
  for (const [size, separator] of layout) {
    if (cursor >= digits.length) break
    const chunk = digits.slice(cursor, cursor + size)
    out += (cursor === 0 ? '' : separator) + chunk
    cursor += size
  }
  return out + digits.slice(cursor)
}

export function formatPhone(value: string): string {
  const digits = normalizePhone(value)
  if (!digits) return ''

  if (digits.startsWith('375')) {
    const rest = digits.slice(3)
    return `+375 ${withSeparators(rest, [
      [2, ''],
      [3, ' '],
      [2, '-'],
      [2, '-'],
    ])}`.trim()
  }

  if (digits.startsWith('7')) {
    const rest = digits.slice(1)
    return `+7 ${withSeparators(rest, [
      [3, ''],
      [3, ' '],
      [2, '-'],
      [2, '-'],
    ])}`.trim()
  }

  return `+${digits}`
}

export function formatPhoneInput(raw: string): string {
  const trimmed = raw.trimStart()
  const digits = digitsOnly(trimmed).slice(0, MAX_LENGTH)
  if (!digits) return trimmed.startsWith('+') ? '+' : ''
  if (digits.startsWith('8') && !trimmed.startsWith('+')) return formatPhone(`7${digits.slice(1)}`)
  return formatPhone(digits)
}
