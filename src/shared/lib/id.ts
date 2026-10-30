export function createLocalId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `local:${crypto.randomUUID()}`
  return `local:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}
