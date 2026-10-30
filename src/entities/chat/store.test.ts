import { beforeEach, describe, expect, it } from 'vitest'
import type { RemoteMessage } from '@/gateway/types'
import { useChatStore } from './store'

const chat = { id: '10000000', type: 'user' as const, title: 'Алина' }

function incoming(id: string, timestamp: number, text = 'Привет'): RemoteMessage {
  return { id, chatId: chat.id, direction: 'in', kind: 'text', text, timestamp }
}

const store = () => useChatStore.getState()

describe('chat store', () => {
  beforeEach(() => {
    store().reset()
  })

  it('создаёт чат по входящему сообщению и считает непрочитанные', () => {
    store().receive(incoming('m1', 1_000), chat, { visible: true })
    store().receive(incoming('m2', 2_000), chat, { visible: true })

    expect(store().chats[chat.id]).toMatchObject({ title: 'Алина', unread: 2, lastActivity: 2_000 })
    expect(store().messages[chat.id]?.map((m) => m.id)).toEqual(['m1', 'm2'])
  })

  it('не увеличивает счётчик для открытого чата в активной вкладке', () => {
    store().ensureChat(chat)
    store().openChat(chat.id)
    store().receive(incoming('m1', 1_000), chat, { visible: true })
    expect(store().chats[chat.id]?.unread).toBe(0)

    store().receive(incoming('m2', 2_000), chat, { visible: false })
    expect(store().chats[chat.id]?.unread).toBe(1)
  })

  it('гасит повторную доставку одного уведомления', () => {
    store().receive(incoming('m1', 1_000), chat, { visible: false })
    store().receive(incoming('m1', 1_000), chat, { visible: false })
    expect(store().messages[chat.id]).toHaveLength(1)
    expect(store().chats[chat.id]?.unread).toBe(1)
  })

  it('ведёт исходящее от pending до read и не откатывает статус назад', () => {
    store().ensureChat(chat)
    const key = store().addOutgoing(chat.id, 'Привет')
    expect(store().messages[chat.id]?.[0]).toMatchObject({ status: 'pending', id: null })

    store().resolveOutgoing(key, chat.id, { id: 'srv-1', timestamp: Date.now() })
    store().applyStatus(chat.id, 'srv-1', 'read')
    store().applyStatus(chat.id, 'srv-1', 'delivered')

    expect(store().messages[chat.id]?.[0]).toMatchObject({ id: 'srv-1', status: 'read' })
  })

  it('не дублирует сообщение, если эхо из API пришло раньше ответа SendMessage', () => {
    store().ensureChat(chat)
    const key = store().addOutgoing(chat.id, 'Привет')
    store().receive(
      {
        id: 'srv-1',
        chatId: chat.id,
        direction: 'out',
        kind: 'text',
        text: 'Привет',
        timestamp: Date.now(),
        status: 'sent',
      },
      chat,
      { visible: true },
    )
    store().resolveOutgoing(key, chat.id, { id: 'srv-1', timestamp: Date.now() })

    expect(store().messages[chat.id]).toHaveLength(1)
    expect(store().messages[chat.id]?.[0]?.id).toBe('srv-1')
  })

  it('помечает сообщение ошибкой по статусу noAccount', () => {
    store().ensureChat(chat)
    const key = store().addOutgoing(chat.id, 'Привет')
    store().resolveOutgoing(key, chat.id, { id: 'srv-2', timestamp: Date.now() })
    store().applyStatus(chat.id, 'srv-2', 'noAccount')

    expect(store().messages[chat.id]?.[0]).toMatchObject({
      status: 'failed',
      error: 'У получателя нет аккаунта MAX',
    })
  })

  it('повторная отправка переводит неотправленное сообщение в конец ленты', () => {
    store().ensureChat(chat)
    const key = store().addOutgoing(chat.id, 'Первое')
    store().failOutgoing(key, chat.id, 'Нет соединения с сервером')
    store().receive(incoming('m1', Date.now() + 10), chat, { visible: true })

    expect(store().retryOutgoing(key, chat.id)).toBe('Первое')
    const list = store().messages[chat.id]!
    expect(list.at(-1)).toMatchObject({ key, status: 'pending', error: undefined })
  })

  it('вливает историю по порядку и без дублей', () => {
    store().receive(incoming('m3', 3_000), chat, { visible: false })
    store().mergeHistory(chat.id, [
      incoming('m1', 1_000),
      incoming('m2', 2_000),
      incoming('m3', 3_000),
    ])

    expect(store().messages[chat.id]?.map((m) => m.id)).toEqual(['m1', 'm2', 'm3'])
  })

  it('синхронизирует список чатов с сервера', () => {
    store().syncChats([
      { id: 'a', type: 'user', title: 'Иван', unread: 3 },
      { id: 'b', type: 'group', title: 'Команда', unread: 0 },
    ])
    expect(store().chats.a).toMatchObject({ title: 'Иван', unread: 3, order: 0 })
    expect(store().chats.b).toMatchObject({ type: 'group', order: 1 })
  })
})
