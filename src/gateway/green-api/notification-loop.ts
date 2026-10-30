import { type Backoff, createBackoff } from '@/shared/lib/backoff'
import { sleep, waitForOnline } from '@/shared/lib/sleep'
import type { ConnectionStatus } from '../types'
import { isGreenApiError } from './errors'

export interface NotificationSource {
  receiveNotification(
    receiveTimeout: number,
    signal?: AbortSignal,
  ): Promise<{ receiptId: number; body: unknown } | null>
  deleteNotification(receiptId: number, signal?: AbortSignal): Promise<unknown>
}

export interface NotificationLoopOptions {
  onNotification: (body: unknown) => void | Promise<void>
  onStatus?: (status: ConnectionStatus) => void
  onError?: (error: unknown) => void
  receiveTimeout?: number
  backoff?: Backoff
  isOnline?: () => boolean
}

const FATAL_CODES = new Set(['unauthorized', 'forbidden', 'instance_expired'])

/**
 * Long-polling поверх ReceiveNotification/DeleteNotification.
 * Уведомление удаляется из очереди только после обработки, поэтому доставка
 * получается at-least-once: повторы гасятся на уровне стора по idMessage.
 */
export async function runNotificationLoop(
  source: NotificationSource,
  options: NotificationLoopOptions,
  signal: AbortSignal,
): Promise<void> {
  const {
    onNotification,
    onStatus,
    onError,
    receiveTimeout = 20,
    backoff = createBackoff({ initial: 1_000, max: 30_000 }),
    isOnline = () => navigator.onLine,
  } = options

  let current: ConnectionStatus | null = null
  const setStatus = (next: ConnectionStatus) => {
    if (next === current) return
    current = next
    onStatus?.(next)
  }

  setStatus('connecting')

  while (!signal.aborted) {
    try {
      if (!isOnline()) {
        setStatus('offline')
        await waitForOnline(signal)
        setStatus('reconnecting')
      }

      const notification = await source.receiveNotification(receiveTimeout, signal)
      backoff.reset()
      setStatus('online')
      if (!notification) continue

      try {
        await onNotification(notification.body)
      } catch (error) {
        onError?.(error)
      }
      await source.deleteNotification(notification.receiptId, signal)
    } catch (error) {
      if (signal.aborted) return
      onError?.(error)
      if (isGreenApiError(error) && FATAL_CODES.has(error.code)) {
        setStatus('unauthorized')
        return
      }
      setStatus(isOnline() ? 'reconnecting' : 'offline')
      try {
        await sleep(backoff.next(), signal)
      } catch {
        return
      }
    }
  }
}
