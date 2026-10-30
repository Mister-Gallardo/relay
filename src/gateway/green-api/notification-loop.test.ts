import { describe, expect, it, vi } from 'vitest'
import type { Backoff } from '@/shared/lib/backoff'
import type { ConnectionStatus } from '../types'
import { GreenApiError } from './errors'
import { type NotificationSource, runNotificationLoop } from './notification-loop'

const noDelay: Backoff = { next: () => 0, reset: () => undefined, attempt: 0 }

type Step = { receiptId: number; body: unknown } | null | Error

function scriptedSource(steps: Step[], controller: AbortController) {
  const deleted: number[] = []
  const source: NotificationSource = {
    receiveNotification: vi.fn(async () => {
      const step = steps.shift()
      if (step === undefined) {
        controller.abort()
        return null
      }
      if (step instanceof Error) throw step
      return step
    }),
    deleteNotification: vi.fn(async (receiptId: number) => {
      deleted.push(receiptId)
      return { result: true }
    }),
  }
  return { source, deleted }
}

describe('runNotificationLoop', () => {
  it('обрабатывает уведомление и только потом удаляет его из очереди', async () => {
    const controller = new AbortController()
    const order: string[] = []
    const { source } = scriptedSource(
      [{ receiptId: 1, body: 'a' }, null, { receiptId: 2, body: 'b' }],
      controller,
    )
    vi.mocked(source.deleteNotification).mockImplementation(async (id) => {
      order.push(`delete:${id}`)
      return { result: true }
    })

    await runNotificationLoop(
      source,
      {
        onNotification: (body) => void order.push(`handle:${body}`),
        backoff: noDelay,
        isOnline: () => true,
      },
      controller.signal,
    )

    expect(order).toEqual(['handle:a', 'delete:1', 'handle:b', 'delete:2'])
  })

  it('удаляет уведомление, даже если обработчик упал', async () => {
    const controller = new AbortController()
    const { source, deleted } = scriptedSource([{ receiptId: 7, body: 'bad' }], controller)
    const onError = vi.fn()

    await runNotificationLoop(
      source,
      {
        onNotification: () => {
          throw new Error('boom')
        },
        onError,
        backoff: noDelay,
        isOnline: () => true,
      },
      controller.signal,
    )

    expect(deleted).toEqual([7])
    expect(onError).toHaveBeenCalledOnce()
  })

  it('переподключается после сетевой ошибки', async () => {
    const controller = new AbortController()
    const statuses: ConnectionStatus[] = []
    const { source } = scriptedSource(
      [new GreenApiError('network'), { receiptId: 3, body: 'after' }],
      controller,
    )
    const handled: unknown[] = []

    await runNotificationLoop(
      source,
      {
        onNotification: (body) => void handled.push(body),
        onStatus: (status) => statuses.push(status),
        backoff: noDelay,
        isOnline: () => true,
      },
      controller.signal,
    )

    expect(handled).toEqual(['after'])
    expect(statuses).toEqual(['connecting', 'reconnecting', 'online'])
  })

  it('останавливается на ошибке авторизации', async () => {
    const controller = new AbortController()
    const statuses: ConnectionStatus[] = []
    const { source } = scriptedSource([new GreenApiError('unauthorized', 401)], controller)

    await runNotificationLoop(
      source,
      {
        onNotification: vi.fn(),
        onStatus: (s) => statuses.push(s),
        backoff: noDelay,
        isOnline: () => true,
      },
      controller.signal,
    )

    expect(statuses.at(-1)).toBe('unauthorized')
    expect(source.receiveNotification).toHaveBeenCalledOnce()
  })
})
