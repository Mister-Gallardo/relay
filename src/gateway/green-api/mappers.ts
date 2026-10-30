import type { DeliveryStatus, MessageKind } from '@/entities/message/model'
import type { ContactInfo, GatewayEvent, RemoteChat, RemoteMessage } from '../types'
import {
  type ChatListResponse,
  type ContactInfoResponse,
  type HistoryItem,
  type MessageNotification,
  historyItemSchema,
  messageNotificationSchema,
  quotaNotificationSchema,
  stateNotificationSchema,
  statusNotificationSchema,
} from './schemas'

const PLACEHOLDERS: Record<string, string> = {
  imageMessage: 'Фото',
  videoMessage: 'Видео',
  documentMessage: 'Файл',
  audioMessage: 'Аудиосообщение',
  stickerMessage: 'Стикер',
  locationMessage: 'Геолокация',
  contactMessage: 'Контакт',
  pollMessage: 'Опрос',
}

const IGNORED_TYPES = new Set(['reactionMessage', 'editedMessage', 'deletedMessage'])

interface Content {
  kind: MessageKind
  text: string
}

function contentFromParts(typeMessage: string, text?: string, caption?: string): Content | null {
  if (IGNORED_TYPES.has(typeMessage)) return null
  if (text !== undefined && text !== '') return { kind: 'text', text }
  const label = PLACEHOLDERS[typeMessage] ?? 'Сообщение не поддерживается'
  return { kind: 'placeholder', text: caption ? `${label} · ${caption}` : label }
}

function notificationContent(data: MessageNotification['messageData']): Content | null {
  const text = data.textMessageData?.textMessage ?? data.extendedTextMessageData?.text
  return contentFromParts(data.typeMessage, text, data.fileMessageData?.caption)
}

function toPhone(value: number | string | undefined): string | undefined {
  if (value === undefined) return undefined
  const digits = String(value).replace(/\D/g, '')
  return digits && digits !== '0' ? digits : undefined
}

export function mapNotification(body: unknown): GatewayEvent | null {
  if (!body || typeof body !== 'object' || !('typeWebhook' in body)) return null

  switch ((body as { typeWebhook: unknown }).typeWebhook) {
    case 'incomingMessageReceived':
    case 'outgoingMessageReceived':
    case 'outgoingAPIMessageReceived': {
      const parsed = messageNotificationSchema.safeParse(body)
      if (!parsed.success) return null
      const n = parsed.data
      const content = notificationContent(n.messageData)
      if (!content) return null
      const incoming = n.typeWebhook === 'incomingMessageReceived'
      const isDirect = n.senderData.chatType === 'user' || n.senderData.chatType === 'bot'
      return {
        type: 'message',
        chat: {
          id: n.senderData.chatId,
          type: n.senderData.chatType,
          title:
            n.senderData.chatName || (incoming && isDirect ? n.senderData.senderName : undefined),
          phone: incoming && isDirect ? toPhone(n.senderData.senderPhoneNumber) : undefined,
        },
        message: {
          id: n.idMessage,
          chatId: n.senderData.chatId,
          direction: incoming ? 'in' : 'out',
          ...content,
          timestamp: n.timestamp * 1000,
          status: incoming ? undefined : 'sent',
          senderName: incoming
            ? n.senderData.senderContactName || n.senderData.senderName || undefined
            : undefined,
        },
      }
    }
    case 'outgoingMessageStatus': {
      const parsed = statusNotificationSchema.safeParse(body)
      if (!parsed.success) return null
      const { chatId, idMessage, status, description } = parsed.data
      return { type: 'status', chatId, messageId: idMessage, status, description }
    }
    case 'stateInstanceChanged': {
      const parsed = stateNotificationSchema.safeParse(body)
      return parsed.success ? { type: 'instance-state', state: parsed.data.stateInstance } : null
    }
    case 'quotaExceeded': {
      const parsed = quotaNotificationSchema.safeParse(body)
      return parsed.success
        ? { type: 'quota-exceeded', description: parsed.data.quotaData.description }
        : null
    }
    default:
      return null
  }
}

const HISTORY_STATUS: Record<string, DeliveryStatus> = {
  sent: 'sent',
  delivered: 'delivered',
  read: 'read',
}

export function mapHistoryItem(raw: unknown): RemoteMessage | null {
  const parsed = historyItemSchema.safeParse(raw)
  if (!parsed.success) return null
  const item: HistoryItem = parsed.data
  const content = contentFromParts(item.typeMessage, item.textMessage, item.caption)
  if (!content) return null
  const incoming = item.type === 'incoming'
  return {
    id: item.idMessage,
    chatId: item.chatId,
    direction: incoming ? 'in' : 'out',
    ...content,
    timestamp: item.timestamp * 1000,
    status: incoming ? undefined : (HISTORY_STATUS[item.statusMessage ?? ''] ?? 'sent'),
    senderName: incoming ? item.senderContactName || item.senderName || undefined : undefined,
  }
}

export function mapContact(raw: ContactInfoResponse): ContactInfo {
  return {
    chatId: raw.chatId,
    type: raw.chatType,
    name: raw.contactName || raw.name,
    phone: toPhone(raw.phoneNumber),
    avatarUrl: raw.avatar || undefined,
    lastSeen: raw.lastSeen ? raw.lastSeen * 1000 : undefined,
  }
}

export function mapChats(raw: ChatListResponse): RemoteChat[] {
  return raw.map((chat) => ({
    id: chat.chatId,
    type: chat.type,
    title: chat.name,
    phone: toPhone(chat.phoneNumber),
    unread: chat.unreadCount,
  }))
}
