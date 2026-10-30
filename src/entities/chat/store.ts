import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type {
  ChatRef,
  ContactInfo,
  RemoteChat,
  RemoteMessage,
  RemoteStatus,
  SentMessage,
} from '@/gateway/types'
import { type Message, isStatusUpgrade } from '@/entities/message/model'
import { createLocalId } from '@/shared/lib/id'
import { formatPhone } from '@/shared/lib/phone'
import { idbStorage } from '@/shared/storage/idb-storage'
import type { Chat } from './model'

const PERSISTED_MESSAGES_PER_CHAT = 300

const STATUS_ERRORS: Partial<Record<RemoteStatus, string>> = {
  failed: 'MAX не принял сообщение',
  noAccount: 'У получателя нет аккаунта MAX',
  notInGroup: 'Вы не участник этого чата',
}

export interface ChatStoreState {
  chats: Record<string, Chat>
  messages: Record<string, Message[]>
  activeChatId: string | null
  hydrated: boolean
}

export interface ChatStoreActions {
  openChat: (chatId: string | null) => void
  ensureChat: (ref: ChatRef) => void
  syncChats: (remote: RemoteChat[]) => void
  applyContact: (contact: ContactInfo) => void
  mergeHistory: (chatId: string, remote: RemoteMessage[]) => void
  receive: (message: RemoteMessage, chat: ChatRef, options: { visible: boolean }) => void
  addOutgoing: (chatId: string, text: string) => string
  resolveOutgoing: (key: string, chatId: string, sent: SentMessage) => void
  failOutgoing: (key: string, chatId: string, error: string) => void
  retryOutgoing: (key: string, chatId: string) => string | null
  deleteMessage: (key: string, chatId: string) => void
  applyStatus: (
    chatId: string,
    messageId: string,
    status: RemoteStatus,
    description?: string,
  ) => void
  markRead: (chatId: string) => void
  setDraft: (chatId: string, draft: string) => void
  removeChat: (chatId: string) => void
  reset: () => void
}

export type ChatStore = ChatStoreState & ChatStoreActions

const initialState: ChatStoreState = {
  chats: {},
  messages: {},
  activeChatId: null,
  hydrated: false,
}

function insertSorted(list: Message[], message: Message) {
  const last = list[list.length - 1]
  if (!last || last.timestamp <= message.timestamp) {
    list.push(message)
    return
  }
  let low = 0
  let high = list.length
  while (low < high) {
    const mid = (low + high) >>> 1
    if (list[mid]!.timestamp <= message.timestamp) low = mid + 1
    else high = mid
  }
  list.splice(low, 0, message)
}

function toMessage(remote: RemoteMessage): Message {
  return { ...remote, key: remote.id }
}

function fallbackTitle(ref: { id: string; phone?: string }): string {
  return ref.phone ? formatPhone(ref.phone) : `Чат ${ref.id}`
}

export const useChatStore = create<ChatStore>()(
  persist(
    immer((set, get) => {
      const touch = (state: ChatStoreState, chatId: string, timestamp: number) => {
        const chat = state.chats[chatId]
        if (chat && timestamp > chat.lastActivity) chat.lastActivity = timestamp
      }

      const ensure = (state: ChatStoreState, ref: ChatRef) => {
        const existing = state.chats[ref.id]
        if (existing) {
          if (ref.title && (!existing.title || existing.title === fallbackTitle(existing))) {
            existing.title = ref.title
          }
          if (ref.phone && !existing.phone) existing.phone = ref.phone
          return existing
        }
        const chat: Chat = {
          id: ref.id,
          type: ref.type,
          title: ref.title || fallbackTitle(ref),
          phone: ref.phone,
          unread: 0,
          lastActivity: 0,
          order: Number.MAX_SAFE_INTEGER,
        }
        state.chats[ref.id] = chat
        state.messages[ref.id] ??= []
        return chat
      }

      const findByKey = (state: ChatStoreState, chatId: string, key: string) =>
        state.messages[chatId]?.find((message) => message.key === key)

      return {
        ...initialState,

        openChat: (chatId) =>
          set((state) => {
            state.activeChatId = chatId
            if (chatId && state.chats[chatId]) state.chats[chatId].unread = 0
          }),

        ensureChat: (ref) =>
          set((state) => {
            const chat = ensure(state, ref)
            if (chat.lastActivity === 0) chat.lastActivity = Date.now()
          }),

        syncChats: (remote) =>
          set((state) => {
            remote.forEach((item, index) => {
              const chat = ensure(state, item)
              chat.type = item.type
              chat.order = index
              if (item.title) chat.title = item.title
              if (item.phone) chat.phone = item.phone
              chat.unread = state.activeChatId === item.id ? 0 : item.unread
            })
          }),

        applyContact: (contact) =>
          set((state) => {
            const chat = state.chats[contact.chatId]
            if (!chat) return
            if (contact.name) chat.title = contact.name
            if (contact.phone) chat.phone = contact.phone
            if (contact.avatarUrl) chat.avatarUrl = contact.avatarUrl
          }),

        mergeHistory: (chatId, remote) =>
          set((state) => {
            const list = (state.messages[chatId] ??= [])
            const byId = new Map(list.filter((m) => m.id).map((m) => [m.id!, m]))
            for (const item of remote) {
              const existing = byId.get(item.id)
              if (existing) {
                if (item.status && isStatusUpgrade(existing.status, item.status)) {
                  existing.status = item.status
                }
                continue
              }
              const message = toMessage(item)
              insertSorted(list, message)
              byId.set(item.id, message)
            }
            const last = list[list.length - 1]
            if (last) touch(state, chatId, last.timestamp)
          }),

        receive: (remote, ref, { visible }) =>
          set((state) => {
            const chat = ensure(state, ref)
            const list = (state.messages[chat.id] ??= [])
            const existing = list.find((m) => m.id === remote.id)
            if (existing) {
              if (remote.status && isStatusUpgrade(existing.status, remote.status)) {
                existing.status = remote.status
              }
              return
            }
            insertSorted(list, toMessage(remote))
            touch(state, chat.id, remote.timestamp)
            const isActive = state.activeChatId === chat.id && visible
            if (remote.direction === 'in' && !isActive) chat.unread += 1
          }),

        addOutgoing: (chatId, text) => {
          const key = createLocalId()
          set((state) => {
            const list = (state.messages[chatId] ??= [])
            const timestamp = Date.now()
            list.push({
              key,
              id: null,
              chatId,
              direction: 'out',
              kind: 'text',
              text,
              timestamp,
              status: 'pending',
            })
            touch(state, chatId, timestamp)
            const chat = state.chats[chatId]
            if (chat) chat.draft = undefined
          })
          return key
        },

        resolveOutgoing: (key, chatId, sent) =>
          set((state) => {
            const list = state.messages[chatId]
            if (!list) return
            const index = list.findIndex((m) => m.key === key)
            if (index === -1) return
            const duplicate = list.find((m) => m.id === sent.id)
            if (duplicate) {
              list.splice(index, 1)
              return
            }
            const message = list[index]!
            message.id = sent.id
            message.error = undefined
            if (isStatusUpgrade(message.status, 'sent')) message.status = 'sent'
          }),

        failOutgoing: (key, chatId, error) =>
          set((state) => {
            const message = findByKey(state, chatId, key)
            if (!message) return
            message.status = 'failed'
            message.error = error
          }),

        retryOutgoing: (key, chatId) => {
          const message = findByKey(get(), chatId, key)
          if (!message || message.status !== 'failed' || message.id) return null
          set((state) => {
            const draft = findByKey(state, chatId, key)
            if (!draft) return
            draft.status = 'pending'
            draft.error = undefined
            draft.timestamp = Date.now()
            const list = state.messages[chatId]!
            list.splice(list.indexOf(draft), 1)
            list.push(draft)
            touch(state, chatId, draft.timestamp)
          })
          return message.text
        },

        deleteMessage: (key, chatId) =>
          set((state) => {
            const list = state.messages[chatId]
            if (!list) return
            const index = list.findIndex((m) => m.key === key)
            if (index !== -1) list.splice(index, 1)
          }),

        applyStatus: (chatId, messageId, status, description) =>
          set((state) => {
            const message = state.messages[chatId]?.find((m) => m.id === messageId)
            if (!message) return
            if (status === 'sent' || status === 'delivered' || status === 'read') {
              if (isStatusUpgrade(message.status, status)) message.status = status
              return
            }
            message.status = 'failed'
            message.error = STATUS_ERRORS[status] ?? description
          }),

        markRead: (chatId) =>
          set((state) => {
            const chat = state.chats[chatId]
            if (chat) chat.unread = 0
          }),

        setDraft: (chatId, draft) =>
          set((state) => {
            const chat = state.chats[chatId]
            if (chat) chat.draft = draft || undefined
          }),

        removeChat: (chatId) =>
          set((state) => {
            delete state.chats[chatId]
            delete state.messages[chatId]
            if (state.activeChatId === chatId) state.activeChatId = null
          }),

        reset: () => set(() => ({ ...initialState })),
      }
    }),
    {
      name: 'relay:chats',
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => idbStorage),
      partialize: ({ chats, messages }) => ({
        chats,
        messages: Object.fromEntries(
          Object.entries(messages).map(([chatId, list]) => [
            chatId,
            list
              .slice(-PERSISTED_MESSAGES_PER_CHAT)
              .map((message) =>
                message.status === 'pending'
                  ? { ...message, status: 'failed' as const, error: 'Не отправлено' }
                  : message,
              ),
          ]),
        ),
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Pick<ChatStoreState, 'chats' | 'messages'>),
        hydrated: true,
      }),
    },
  ),
)

export async function bindChatStorage(scope: string, { ephemeral = false } = {}) {
  const { persist: storage } = useChatStore
  useChatStore.getState().reset()
  storage.setOptions({ name: `relay:chats:${scope}` })
  if (ephemeral) await storage.clearStorage()
  else await storage.rehydrate()
  useChatStore.setState({ hydrated: true })
}

export async function clearChatStorage(scope: string) {
  useChatStore.persist.setOptions({ name: `relay:chats:${scope}` })
  await useChatStore.persist.clearStorage()
  useChatStore.getState().reset()
}
