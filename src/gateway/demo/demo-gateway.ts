import { isValidPhone, normalizePhone } from '@/shared/lib/phone'
import { sleep } from '@/shared/lib/sleep'
import type {
  AccountInfo,
  ContactInfo,
  GatewayEvent,
  MessengerGateway,
  ReceiveSettingsIssue,
  RemoteChat,
  RemoteMessage,
  SentMessage,
  Subscription,
} from '../types'
import {
  DEMO_ACCOUNT,
  DEMO_CONTACTS,
  DEMO_UNREAD,
  type DemoContact,
  createDemoHistory,
} from './fixtures'

const LATENCY = 350

function pick<T>(items: readonly T[], seed: number): T | undefined {
  return items[seed % items.length]
}

export class DemoGateway implements MessengerGateway {
  readonly mode = 'demo' as const
  readonly instanceId = 'demo'

  private readonly history = createDemoHistory()
  private readonly contacts = new Map<string, DemoContact>(DEMO_CONTACTS.map((c) => [c.id, c]))
  private readonly timers = new Set<ReturnType<typeof setTimeout>>()
  private listener: Subscription | null = null
  private sequence = 0

  async getAccount(): Promise<AccountInfo> {
    await sleep(LATENCY)
    return { state: 'authorized', ...DEMO_ACCOUNT }
  }

  async getChats(): Promise<RemoteChat[]> {
    await sleep(LATENCY)
    return DEMO_CONTACTS.map((contact) => ({
      id: contact.id,
      type: contact.type,
      title: contact.name,
      phone: contact.phone,
      unread: DEMO_UNREAD[contact.id] ?? 0,
    }))
  }

  async getHistory(chatId: string, count: number): Promise<RemoteMessage[]> {
    await sleep(LATENCY + 250)
    return (this.history[chatId] ?? []).slice(-count)
  }

  async getContact(chatId: string): Promise<ContactInfo> {
    await sleep(LATENCY)
    const contact = this.contacts.get(chatId)
    return {
      chatId,
      type: contact?.type ?? 'user',
      name: contact?.name ?? '',
      phone: contact?.phone,
      lastSeen:
        contact?.lastSeenMinutesAgo === undefined
          ? undefined
          : Date.now() - contact.lastSeenMinutesAgo * 60_000,
    }
  }

  async findAccount(phone: string): Promise<{ chatId: string } | null> {
    await sleep(LATENCY * 2)
    const digits = normalizePhone(phone)
    if (!isValidPhone(digits) || digits.endsWith('0000')) return null
    const existing = DEMO_CONTACTS.find((contact) => contact.phone === digits)
    if (existing) return { chatId: existing.id }

    const chatId = `3${digits.slice(-7)}`
    if (!this.contacts.has(chatId)) {
      this.contacts.set(chatId, {
        id: chatId,
        type: 'user',
        name: '',
        phone: digits,
        lastSeenMinutesAgo: 3,
        replies: ['Привет! Кто это?', 'Да, слушаю'],
      })
    }
    return { chatId }
  }

  async sendText(chatId: string, text: string): Promise<SentMessage> {
    await sleep(LATENCY)
    const id = `demo-${Date.now()}-${++this.sequence}`
    this.scheduleConversation(chatId, id, text)
    return { id, timestamp: Date.now() }
  }

  async sendTyping(): Promise<void> {}

  async markRead(): Promise<void> {}

  async checkReceiveSettings(): Promise<ReceiveSettingsIssue[]> {
    return []
  }

  async fixReceiveSettings(): Promise<void> {}

  subscribe(subscription: Subscription): () => void {
    this.listener = subscription
    subscription.onStatus('connecting')
    this.later(600, () => subscription.onStatus('online'))
    this.later(45_000, () =>
      this.emit({
        type: 'message',
        chat: { id: '10000002', type: 'bot', title: 'Доставка «Север»' },
        message: this.inbound('10000002', 'Курьер у подъезда. Пожалуйста, будьте на связи'),
      }),
    )

    return () => {
      this.listener = null
      for (const timer of this.timers) clearTimeout(timer)
      this.timers.clear()
    }
  }

  private scheduleConversation(chatId: string, messageId: string, text: string) {
    const contact = this.contacts.get(chatId)
    const status = (delay: number, value: 'delivered' | 'read') =>
      this.later(delay, () => this.emit({ type: 'status', chatId, messageId, status: value }))

    if (!contact || (contact.type === 'bot' && !contact.echo)) {
      status(700, 'delivered')
      return
    }

    status(600, 'delivered')
    status(1_400, 'read')

    const replyText = contact.echo ? text : pick(contact.replies, this.sequence)
    if (!replyText) return

    const sender = contact.members ? pick(contact.members, this.sequence) : undefined
    this.later(contact.echo ? 1_100 : 2_600 + (this.sequence % 3) * 700, () =>
      this.emit({
        type: 'message',
        chat: {
          id: chatId,
          type: contact.type,
          title: contact.name || undefined,
          phone: contact.phone,
        },
        message: this.inbound(chatId, replyText, sender),
      }),
    )
  }

  private inbound(chatId: string, text: string, senderName?: string): RemoteMessage {
    return {
      id: `demo-in-${Date.now()}-${++this.sequence}`,
      chatId,
      direction: 'in',
      kind: 'text',
      text,
      timestamp: Date.now(),
      senderName,
    }
  }

  private emit(event: GatewayEvent) {
    this.listener?.onEvent(event)
  }

  private later(delay: number, run: () => void) {
    const timer = setTimeout(() => {
      this.timers.delete(timer)
      run()
    }, delay)
    this.timers.add(timer)
  }
}
