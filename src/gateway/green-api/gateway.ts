import { normalizePhone } from '@/shared/lib/phone'
import { runAsLeader, createTabSync } from '../tab-sync'
import type {
  AccountInfo,
  ConnectionStatus,
  ContactInfo,
  MessengerGateway,
  ReceiveSettingsIssue,
  RemoteChat,
  RemoteMessage,
  SentMessage,
  Subscription,
} from '../types'
import { GreenApiClient, type GreenApiCredentials } from './client'
import { mapChats, mapContact, mapHistoryItem, mapNotification } from './mappers'
import { runNotificationLoop } from './notification-loop'

const TYPING_DURATION = 6_000

export class GreenApiGateway implements MessengerGateway {
  readonly mode = 'live' as const
  readonly instanceId: string
  private readonly client: GreenApiClient

  constructor(credentials: GreenApiCredentials, client = new GreenApiClient(credentials)) {
    this.instanceId = credentials.idInstance
    this.client = client
  }

  async getAccount(signal?: AbortSignal): Promise<AccountInfo> {
    const account = await this.client.getAccountSettings(signal)
    return {
      state: account.stateInstance,
      phone: account.phone,
      chatId: account.chatId,
      avatarUrl: account.avatar || undefined,
    }
  }

  async getChats(signal?: AbortSignal): Promise<RemoteChat[]> {
    return mapChats(await this.client.getChats(100, signal))
  }

  async getHistory(chatId: string, count: number, signal?: AbortSignal): Promise<RemoteMessage[]> {
    const items = await this.client.getChatHistory(chatId, count, signal)
    return items
      .map(mapHistoryItem)
      .filter((message): message is RemoteMessage => message !== null)
      .sort((a, b) => a.timestamp - b.timestamp)
  }

  async getContact(chatId: string, signal?: AbortSignal): Promise<ContactInfo> {
    return mapContact(await this.client.getContactInfo(chatId, signal))
  }

  async findAccount(phone: string): Promise<{ chatId: string } | null> {
    const result = await this.client.checkAccount(Number(normalizePhone(phone)))
    return result.exist && result.chatId ? { chatId: result.chatId } : null
  }

  async sendText(chatId: string, text: string): Promise<SentMessage> {
    const { idMessage } = await this.client.sendMessage(chatId, text)
    return { id: idMessage, timestamp: Date.now() }
  }

  async sendTyping(chatId: string): Promise<void> {
    await this.client.sendTyping(chatId, TYPING_DURATION)
  }

  async markRead(chatId: string): Promise<void> {
    await this.client.readChat(chatId)
  }

  async checkReceiveSettings(): Promise<ReceiveSettingsIssue[]> {
    const settings = await this.client.getSettings()
    const issues: ReceiveSettingsIssue[] = []
    if (settings.webhookUrl) {
      issues.push({
        key: 'webhookUrl',
        label: 'Указан webhookUrl — уведомления уходят на внешний сервер',
      })
    }
    if (settings.incomingWebhook !== 'yes') {
      issues.push({ key: 'incomingWebhook', label: 'Выключены уведомления о входящих сообщениях' })
    }
    if (settings.outgoingWebhook !== 'yes') {
      issues.push({ key: 'outgoingWebhook', label: 'Выключены статусы доставки и прочтения' })
    }
    if (settings.outgoingMessageWebhook !== 'yes') {
      issues.push({
        key: 'outgoingMessageWebhook',
        label: 'Сообщения, отправленные с телефона, не появятся в чате',
      })
    }
    return issues
  }

  async fixReceiveSettings(): Promise<void> {
    await this.client.setSettings({
      webhookUrl: '',
      incomingWebhook: 'yes',
      outgoingWebhook: 'yes',
      outgoingMessageWebhook: 'yes',
      outgoingAPIMessageWebhook: 'yes',
      stateWebhook: 'yes',
    })
  }

  subscribe({ onEvent, onStatus }: Subscription): () => void {
    const controller = new AbortController()
    let leader = false
    let lastStatus: ConnectionStatus = 'connecting'

    const sync = createTabSync(`relay:${this.instanceId}`, {
      onEvent: (event) => {
        if (!leader) onEvent(event)
      },
      onStatus: (status) => {
        if (!leader) onStatus(status)
      },
      onStatusRequest: () => {
        if (leader) sync.publishStatus(lastStatus)
      },
    })

    onStatus('connecting')
    sync.requestStatus()

    runAsLeader(
      `relay:receiver:${this.instanceId}`,
      async (signal) => {
        leader = true
        try {
          await runNotificationLoop(
            this.client,
            {
              onNotification: (body) => {
                const event = mapNotification(body)
                if (!event) return
                onEvent(event)
                sync.publishEvent(event)
              },
              onStatus: (status) => {
                lastStatus = status
                onStatus(status)
                sync.publishStatus(status)
              },
              onError: (error) => {
                if (import.meta.env.DEV) console.warn('[relay] receive failed', error)
              },
            },
            signal,
          )
        } finally {
          leader = false
        }
      },
      controller.signal,
    )

    return () => {
      controller.abort()
      sync.close()
    }
  }
}
