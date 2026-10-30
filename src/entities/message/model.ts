export type MessageDirection = 'in' | 'out'

export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

export type MessageKind = 'text' | 'placeholder'

export interface Message {
  key: string
  id: string | null
  chatId: string
  direction: MessageDirection
  kind: MessageKind
  text: string
  timestamp: number
  status?: DeliveryStatus
  senderName?: string
  error?: string
}

const STATUS_RANK: Record<DeliveryStatus, number> = {
  failed: -1,
  pending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
}

export function isStatusUpgrade(
  current: DeliveryStatus | undefined,
  next: DeliveryStatus,
): boolean {
  if (!current) return true
  if (next === 'failed') return current === 'pending' || current === 'sent'
  return STATUS_RANK[next] > STATUS_RANK[current]
}

export const MESSAGE_MAX_LENGTH = 4000
