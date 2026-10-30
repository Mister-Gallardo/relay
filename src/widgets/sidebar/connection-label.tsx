import { useConnectionStore } from '@/entities/session/connection-store'
import type { ConnectionStatus } from '@/gateway/types'
import { cn } from '@/shared/lib/cn'

const LABELS: Record<ConnectionStatus, string> = {
  connecting: 'Подключение…',
  online: 'В сети',
  reconnecting: 'Переподключение…',
  offline: 'Нет сети',
  unauthorized: 'Нет доступа',
}

export function ConnectionLabel() {
  const status = useConnectionStore((state) => state.status)
  const ok = status === 'online'

  return (
    <span
      className={cn(
        'flex items-center gap-1.5 text-description',
        ok ? 'text-fg-mute' : 'text-fg-tertiary',
      )}
      aria-live="polite"
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          ok && 'bg-positive',
          (status === 'connecting' || status === 'reconnecting') &&
            'animate-pulse-dot bg-attention',
          (status === 'offline' || status === 'unauthorized') && 'bg-negative',
        )}
      />
      {LABELS[status]}
    </span>
  )
}
