import type { ConnectionStatus, GatewayEvent } from './types'

type Packet =
  | { kind: 'event'; event: GatewayEvent }
  | { kind: 'status'; status: ConnectionStatus }
  | { kind: 'status-request' }

export interface TabSync {
  publishEvent(event: GatewayEvent): void
  publishStatus(status: ConnectionStatus): void
  requestStatus(): void
  close(): void
}

interface TabSyncHandlers {
  onEvent(event: GatewayEvent): void
  onStatus(status: ConnectionStatus): void
  onStatusRequest(): void
}

export function createTabSync(name: string, handlers: TabSyncHandlers): TabSync {
  if (typeof BroadcastChannel === 'undefined') {
    return { publishEvent() {}, publishStatus() {}, requestStatus() {}, close() {} }
  }

  const channel = new BroadcastChannel(name)
  channel.onmessage = ({ data }: MessageEvent<Packet>) => {
    if (data.kind === 'event') handlers.onEvent(data.event)
    else if (data.kind === 'status') handlers.onStatus(data.status)
    else handlers.onStatusRequest()
  }

  const post = (packet: Packet) => channel.postMessage(packet)
  return {
    publishEvent: (event) => post({ kind: 'event', event }),
    publishStatus: (status) => post({ kind: 'status', status }),
    requestStatus: () => post({ kind: 'status-request' }),
    close: () => channel.close(),
  }
}

/**
 * Выполняет задачу только в одной вкладке: остальные ждут в очереди Web Locks
 * и подхватывают работу, когда текущий лидер закрывается.
 */
export function runAsLeader(
  lockName: string,
  task: (signal: AbortSignal) => Promise<void>,
  signal: AbortSignal,
): void {
  if (typeof navigator === 'undefined' || !navigator.locks) {
    void task(signal)
    return
  }

  navigator.locks
    .request(lockName, { signal }, async () => {
      if (!signal.aborted) await task(signal)
    })
    .catch((error: unknown) => {
      if (!signal.aborted) console.error('[relay] leader lock failed', error)
    })
}
