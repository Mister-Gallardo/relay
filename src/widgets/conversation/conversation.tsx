import { type ReactNode, useCallback, useState } from 'react'
import { isGroupLike } from '@/entities/chat/model'
import { useChatHistory } from '@/entities/chat/queries'
import { useActiveChat, useChatMessages } from '@/entities/chat/selectors'
import { useChatStore } from '@/entities/chat/store'
import type { Message } from '@/entities/message/model'
import { useAutoMarkRead } from '@/features/mark-read/use-auto-mark-read'
import { useSendMessage } from '@/features/send-message/use-send-message'
import { describeError } from '@/gateway/green-api/errors'
import { HISTORY_MAX, HISTORY_PAGE_SIZE } from '@/shared/config/limits'
import { useUiStore } from '@/shared/model/ui-store'
import { Button } from '@/shared/ui/button'
import { Logo } from '@/shared/ui/logo'
import { Skeleton } from '@/shared/ui/skeleton'
import { Composer } from './composer'
import { ConversationHeader } from './conversation-header'
import { MessageList } from './message-list'

function HistorySkeleton() {
  const widths = ['w-56', 'w-40', 'w-64', 'w-32', 'w-48']
  return (
    <div
      className="mx-auto flex w-full max-w-[808px] flex-1 flex-col justify-end gap-2 px-4 pb-4"
      aria-hidden="true"
    >
      {widths.map((width, index) => (
        <Skeleton
          key={width}
          className={`h-10 rounded-[18px] bg-bubble-in/70 ${width} ${index % 2 ? 'self-end bg-bubble-out/50' : ''}`}
        />
      ))}
    </div>
  )
}

function CenterNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <div className="max-w-xs rounded-2xl bg-system-pill px-4 py-3 text-center text-detail text-system-pill-fg backdrop-blur-md">
        {children}
      </div>
    </div>
  )
}

function ChatView({ chatId }: { chatId: string }) {
  const chat = useActiveChat()
  const messages = useChatMessages(chatId)
  const openChat = useChatStore((state) => state.openChat)
  const deleteMessage = useChatStore((state) => state.deleteMessage)
  const [count, setCount] = useState(HISTORY_PAGE_SIZE)
  const history = useChatHistory(chatId, count)
  const { send, retry } = useSendMessage()
  useAutoMarkRead(chatId)

  const hasMore = (history.data?.length ?? 0) >= count && count < HISTORY_MAX
  const loadOlder = useCallback(() => {
    if (hasMore && !history.isFetching) setCount((current) => current + HISTORY_PAGE_SIZE)
  }, [hasMore, history.isFetching])

  const handleRetry = useCallback((message: Message) => retry(chatId, message.key), [chatId, retry])
  const handleDelete = useCallback(
    (message: Message) => deleteMessage(message.key, chatId),
    [chatId, deleteMessage],
  )

  if (!chat) return null

  let body: ReactNode
  if (messages.length > 0) {
    body = (
      <MessageList
        key={chatId}
        chatId={chatId}
        messages={messages}
        groupChat={isGroupLike(chat.type)}
        loadingOlder={history.isFetching && count > HISTORY_PAGE_SIZE}
        onReachTop={loadOlder}
        onRetry={handleRetry}
        onDelete={handleDelete}
      />
    )
  } else if (history.isPending) {
    body = <HistorySkeleton />
  } else if (history.isError) {
    body = (
      <CenterNote>
        Не удалось загрузить историю: {describeError(history.error).toLowerCase()}
        <Button
          size="sm"
          variant="secondary"
          className="mt-3 w-full"
          onClick={() => history.refetch()}
        >
          Повторить
        </Button>
      </CenterNote>
    )
  } else {
    body = (
      <CenterNote>
        Сообщений пока нет. Напишите первым — собеседник увидит сообщение в MAX.
      </CenterNote>
    )
  }

  return (
    <section
      className="chat-ground relative isolate flex h-full min-h-0 flex-col"
      aria-label={`Чат: ${chat.title}`}
    >
      <ConversationHeader chat={chat} onBack={() => openChat(null)} />
      <div className="flex min-h-0 flex-1 flex-col pt-16">{body}</div>
      <Composer key={chatId} chatId={chatId} onSend={(text) => send(chatId, text)} />
    </section>
  )
}

function NoChatSelected() {
  const setNewChatOpen = useUiStore((state) => state.setNewChatOpen)
  return (
    <section className="chat-ground relative isolate hidden h-full flex-col items-center justify-center gap-5 px-6 text-center md:flex">
      <Logo size={64} />
      <div className="flex max-w-sm flex-col gap-2">
        <h2 className="text-[20px] leading-6 font-semibold">Выберите чат</h2>
        <p className="text-detail text-fg-tertiary">
          или начните новый — достаточно номера телефона, к которому привязан MAX
        </p>
      </div>
      <Button onClick={() => setNewChatOpen(true)}>Новый чат</Button>
      <p className="text-description text-fg-mute">
        <kbd className="rounded-md bg-input px-1.5 py-0.5 font-sans">Ctrl</kbd>{' '}
        <kbd className="rounded-md bg-input px-1.5 py-0.5 font-sans">K</kbd> — поиск по чатам
      </p>
    </section>
  )
}

export function Conversation({ chatId }: { chatId: string | null }) {
  return chatId ? <ChatView key={chatId} chatId={chatId} /> : <NoChatSelected />
}
