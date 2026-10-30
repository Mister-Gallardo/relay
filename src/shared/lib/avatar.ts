const GRADIENTS = [
  ['#ff48b6', '#ff8a35'],
  ['#ffc93d', '#ff832a'],
  ['#14e1d5', '#03c722'],
  ['#08d7f3', '#5398ff'],
  ['#bf97ff', '#526eff'],
] as const

function hash(value: string): number {
  let h = 0
  for (let i = 0; i < value.length; i++) h = (Math.imul(31, h) + value.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function avatarGradient(seed: string): string {
  const [from, to] = GRADIENTS[hash(seed) % GRADIENTS.length] ?? GRADIENTS[0]
  return `linear-gradient(135deg, ${from} 0%, ${to} 100%)`
}

export function initials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return '#'
  const [first, second] = words
  if (!second) return first!.slice(0, 2).toUpperCase()
  return `${first![0]}${second[0]}`.toUpperCase()
}
