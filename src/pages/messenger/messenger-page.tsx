import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import { useChatsSync } from '@/entities/chat/queries'
import { useTotalUnread } from '@/entities/chat/selectors'
import { clearChatStorage, useChatStore } from '@/entities/chat/store'
import { useConnectionStore } from '@/entities/session/connection-store'
import { useGateway } from '@/entities/session/gateway-context'
import { useSessionStore } from '@/entities/session/store'
import { NewChatDialog } from '@/features/new-chat/new-chat-dialog'
import { useHistoryWarmup } from '@/features/history-warmup/use-history-warmup'
import { useRealtime } from '@/features/realtime/use-realtime'
import { cn } from '@/shared/lib/cn'
import { Conversation } from '@/widgets/conversation/conversation'
import { Sidebar } from '@/widgets/sidebar/sidebar'
import { useChatScope } from './use-chat-scope'

function useDocumentTitle() {
  const unread = useTotalUnread()
  useEffect(() => {
    document.title = unread > 0 ? `(${unread}) Relay` : 'Relay'
  }, [unread])
}

function useEscapeToClose() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      const target = event.target as HTMLElement | null
      if (target?.closest('[role="dialog"], [role="menu"], input')) return
      useChatStore.getState().openChat(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}

export function MessengerPage() {
  const gateway = useGateway()
  const queryClient = useQueryClient()
  const signOut = useSessionStore((state) => state.signOut)
  const ready = useChatScope()
  const activeChatId = useChatStore((state) => state.activeChatId)
  const chatsSync = useChatsSync(ready)

  useRealtime(ready)
  useHistoryWarmup(ready && chatsSync.isSuccess)
  useDocumentTitle()
  useEscapeToClose()

  useEffect(
    () => () => {
      useConnectionStore.setState({ status: 'connecting', instanceState: 'unknown' })
    },
    [gateway],
  )

  const handleSignOut = useCallback(async () => {
    await clearChatStorage(gateway.instanceId)
    queryClient.clear()
    signOut()
  }, [gateway, queryClient, signOut])

  return (
    <div className="flex h-dvh overflow-hidden bg-surface">
      <div
        className={cn(
          'h-full w-full shrink-0 border-divider md:w-[360px] md:border-r lg:w-[400px]',
          activeChatId && 'hidden md:block',
        )}
      >
        <Sidebar loading={!ready || chatsSync.isPending} onSignOut={handleSignOut} />
      </div>
      <main className={cn('h-full min-w-0 flex-1', !activeChatId && 'hidden md:block')}>
        {ready && <Conversation chatId={activeChatId} />}
      </main>
      <NewChatDialog />
    </div>
  )
}
