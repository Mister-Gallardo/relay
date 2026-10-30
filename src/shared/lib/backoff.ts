export interface BackoffOptions {
  initial?: number
  max?: number
  factor?: number
  jitter?: number
  random?: () => number
}

export interface Backoff {
  next(): number
  reset(): void
  readonly attempt: number
}

export function createBackoff({
  initial = 1_000,
  max = 30_000,
  factor = 2,
  jitter = 0.2,
  random = Math.random,
}: BackoffOptions = {}): Backoff {
  let attempt = 0

  return {
    next() {
      const base = Math.min(max, initial * factor ** attempt)
      attempt += 1
      const spread = base * jitter
      return Math.round(base - spread + random() * spread * 2)
    },
    reset() {
      attempt = 0
    },
    get attempt() {
      return attempt
    },
  }
}
