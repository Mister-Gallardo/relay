import { MessageSquareDashed, Search, SquarePen, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useChatList } from '@/entities/chat/selectors'
import { useChatStore } from '@/entities/chat/store'
import { ChatListItem } from '@/entities/chat/ui/chat-list-item'
import { useAccount } from '@/entities/session/queries'
import { StatusBanner } from '@/features/receive-settings/status-banner'
import { useUiStore } from '@/shared/model/ui-store'
import { Avatar } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { Tooltip } from '@/shared/ui/tooltip'
import { AccountMenu } from './account-menu'
import { ConnectionLabel } from './connection-label'

function ChatListSkeleton() {
  return (
    <div className="flex flex-col gap-1 px-2" aria-hidden="true">
      {Array.from({ length: 7 }, (_, index) => (
        <div key={index} className="flex h-[72px] items-center gap-3 px-2.5">
          <Skeleton className="size-[52px] rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface SidebarProps {
  loading: boolean
  onSignOut: () => void
}

export function Sidebar({ loading, onSignOut }: SidebarProps) {
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const chats = useChatList(query)
  const activeChatId = useChatStore((state) => state.activeChatId)
  const openChat = useChatStore((state) => state.openChat)
  const setNewChatOpen = useUiStore((state) => state.setNewChatOpen)
  const account = useAccount()

  const select = useCallback(
    (chatId: string) => {
      openChat(chatId)
      setQuery('')
    },
    [openChat],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <aside className="flex h-full min-h-0 flex-col bg-panel">
      <header className="flex h-16 shrink-0 items-center gap-3 pr-2 pl-4">
        <Avatar
          seed={account.data?.chatId ?? 'me'}
          name={account.data?.phone ? 'Я' : '…'}
          src={account.data?.avatarUrl}
          size={36}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="text-title font-semibold">Чаты</h1>
          <ConnectionLabel />
        </div>
        <Tooltip label="Новый чат">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Новый чат"
            onClick={() => setNewChatOpen(true)}
          >
            <SquarePen />
          </Button>
        </Tooltip>
        <AccountMenu onSignOut={onSignOut} />
      </header>

      <StatusBanner onSignOut={onSignOut} />

      <div className="shrink-0 px-3 pb-2">
        <label className="relative block">
          <span className="sr-only">Поиск по чатам</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-fg-mute" />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setQuery('')
                event.currentTarget.blur()
              }
            }}
            placeholder="Поиск"
            className="h-10 w-full rounded-xl bg-input pr-9 pl-10 text-[15px] text-fg outline-none placeholder:text-fg-mute focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute top-1/2 right-2 inline-flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-fg-mute hover:text-fg"
              aria-label="Очистить поиск"
            >
              <X className="size-4" />
            </button>
          )}
        </label>
      </div>

      <nav aria-label="Список чатов" className="min-h-0 flex-1 overflow-y-auto pb-3">
        {loading && chats.length === 0 ? (
          <ChatListSkeleton />
        ) : chats.length === 0 ? (
          query ? (
            <p className="px-6 pt-10 text-center text-detail text-fg-tertiary">
              Ничего не нашлось по запросу «{query.trim()}»
            </p>
          ) : (
            <div className="flex flex-col items-center gap-3 px-8 pt-14 text-center">
              <MessageSquareDashed className="size-10 text-fg-mute" strokeWidth={1.5} />
              <p className="text-detail text-fg-tertiary">
                Чатов пока нет. Напишите кому-нибудь по номеру телефона.
              </p>
              <Button size="sm" onClick={() => setNewChatOpen(true)}>
                Новый чат
              </Button>
            </div>
          )
        ) : (
          <ul className="flex flex-col gap-0.5 px-2">
            {chats.map((chat) => (
              <li key={chat.id}>
                <ChatListItem chat={chat} active={chat.id === activeChatId} onSelect={select} />
              </li>
            ))}
          </ul>
        )}
      </nav>
    </aside>
  )
}
