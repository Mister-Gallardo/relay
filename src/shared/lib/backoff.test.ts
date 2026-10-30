import { describe, expect, it } from 'vitest'
import { createBackoff } from './backoff'

describe('createBackoff', () => {
  it('растёт экспоненциально и упирается в максимум', () => {
    const backoff = createBackoff({ initial: 1_000, max: 8_000, jitter: 0 })
    expect([
      backoff.next(),
      backoff.next(),
      backoff.next(),
      backoff.next(),
      backoff.next(),
    ]).toEqual([1_000, 2_000, 4_000, 8_000, 8_000])
  })

  it('добавляет разброс в пределах jitter', () => {
    const low = createBackoff({ initial: 1_000, jitter: 0.2, random: () => 0 })
    const high = createBackoff({ initial: 1_000, jitter: 0.2, random: () => 1 })
    expect(low.next()).toBe(800)
    expect(high.next()).toBe(1_200)
  })

  it('reset начинает отсчёт заново', () => {
    const backoff = createBackoff({ initial: 500, jitter: 0 })
    backoff.next()
    backoff.next()
    backoff.reset()
    expect(backoff.attempt).toBe(0)
    expect(backoff.next()).toBe(500)
  })
})
