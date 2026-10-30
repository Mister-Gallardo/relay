import type { ChatType } from '@/entities/chat/model'
import type { DeliveryStatus, MessageDirection, MessageKind } from '@/entities/message/model'

export type InstanceState =
  | 'authorized'
  | 'notAuthorized'
  | 'blocked'
  | 'starting'
  | 'suspended'
  | 'pendingPassword'
  | 'unknown'

export interface AccountInfo {
  state: InstanceState
  phone: string
  chatId: string
  avatarUrl?: string
}

export interface ContactInfo {
  chatId: string
  type: ChatType
  name: string
  phone?: string
  avatarUrl?: string
  lastSeen?: number
}

export interface RemoteChat {
  id: string
  type: ChatType
  title: string
  phone?: string
  unread: number
}

export interface ChatRef {
  id: string
  type: ChatType
  title?: string
  phone?: string
}

export interface RemoteMessage {
  id: string
  chatId: string
  direction: MessageDirection
  kind: MessageKind
  text: string
  timestamp: number
  status?: DeliveryStatus
  senderName?: string
}

export type RemoteStatus = 'sent' | 'delivered' | 'read' | 'failed' | 'noAccount' | 'notInGroup'

export type GatewayEvent =
  | { type: 'message'; message: RemoteMessage; chat: ChatRef }
  | {
      type: 'status'
      chatId: string
      messageId: string
      status: RemoteStatus
      description?: string
    }
  | { type: 'instance-state'; state: InstanceState }
  | { type: 'quota-exceeded'; description: string }

export type ConnectionStatus = 'connecting' | 'online' | 'reconnecting' | 'offline' | 'unauthorized'

export interface ReceiveSettingsIssue {
  key: string
  label: string
}

export interface SentMessage {
  id: string
  timestamp: number
}

export interface Subscription {
  onEvent: (event: GatewayEvent) => void
  onStatus: (status: ConnectionStatus) => void
}

export interface MessengerGateway {
  readonly mode: 'live' | 'demo'
  readonly instanceId: string
  getAccount(signal?: AbortSignal): Promise<AccountInfo>
  getChats(signal?: AbortSignal): Promise<RemoteChat[]>
  getHistory(chatId: string, count: number, signal?: AbortSignal): Promise<RemoteMessage[]>
  getContact(chatId: string, signal?: AbortSignal): Promise<ContactInfo>
  findAccount(phone: string): Promise<{ chatId: string } | null>
  sendText(chatId: string, text: string): Promise<SentMessage>
  sendTyping(chatId: string): Promise<void>
  markRead(chatId: string): Promise<void>
  checkReceiveSettings(): Promise<ReceiveSettingsIssue[]>
  fixReceiveSettings(): Promise<void>
  subscribe(subscription: Subscription): () => void
}
