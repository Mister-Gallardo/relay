import { useMemo } from 'react'
import type { Message } from '@/entities/message/model'
import type { Chat } from './model'
import { useChatStore } from './store'

export function compareChats(a: Chat, b: Chat): number {
  if (a.lastActivity !== b.lastActivity) return b.lastActivity - a.lastActivity
  if (a.order !== b.order) return a.order - b.order
  return a.title.localeCompare(b.title, 'ru')
}

function matches(chat: Chat, query: string): boolean {
  if (!query) return true
  const needle = query.toLowerCase()
  if (chat.title.toLowerCase().includes(needle)) return true
  const digits = needle.replace(/\D/g, '')
  return Boolean(digits && chat.phone?.includes(digits))
}

export function useChatList(query: string): Chat[] {
  const chats = useChatStore((state) => state.chats)
  return useMemo(
    () =>
      Object.values(chats)
        .filter((chat) => matches(chat, query.trim()))
        .sort(compareChats),
    [chats, query],
  )
}

const EMPTY: Message[] = []

export function useChatMessages(chatId: string | null): Message[] {
  return useChatStore((state) => (chatId ? (state.messages[chatId] ?? EMPTY) : EMPTY))
}

export function useLastMessage(chatId: string): Message | undefined {
  return useChatStore((state) => state.messages[chatId]?.at(-1))
}

export function useActiveChat(): Chat | null {
  return useChatStore((state) =>
    state.activeChatId ? (state.chats[state.activeChatId] ?? null) : null,
  )
}

export function useTotalUnread(): number {
  return useChatStore((state) =>
    Object.values(state.chats).reduce((sum, chat) => sum + chat.unread, 0),
  )
}
