import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { compareChats } from '@/entities/chat/selectors'
import { useChatStore } from '@/entities/chat/store'
import { useGateway } from '@/entities/session/gateway-context'
import { HISTORY_PAGE_SIZE, WARMUP_CHATS, WARMUP_INTERVAL } from '@/shared/config/limits'
import { queryKeys } from '@/shared/config/query-keys'
import { sleep } from '@/shared/lib/sleep'

/**
 * После синхронизации списка чатов подтягивает последние сообщения для верхних чатов,
 * чтобы в списке были превью и время. GetChatHistory ограничен 1 запросом в секунду,
 * поэтому идём последовательно и с паузой.
 */
export function useHistoryWarmup(enabled: boolean) {
  const gateway = useGateway()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    const interval = gateway.mode === 'live' ? WARMUP_INTERVAL : 0

    const run = async () => {
      const { chats, messages } = useChatStore.getState()
      const targets = Object.values(chats)
        .filter((chat) => !messages[chat.id]?.length)
        .sort(compareChats)
        .slice(0, WARMUP_CHATS)

      for (const chat of targets) {
        if (controller.signal.aborted) return
        try {
          const history = await queryClient.fetchQuery({
            queryKey: queryKeys.history(gateway.instanceId, chat.id, HISTORY_PAGE_SIZE),
            queryFn: ({ signal }) => gateway.getHistory(chat.id, HISTORY_PAGE_SIZE, signal),
            staleTime: 60_000,
          })
          if (!controller.signal.aborted) useChatStore.getState().mergeHistory(chat.id, history)
        } catch {
          // превью для этого чата просто не появится — не критично
        }
        if (interval) await sleep(interval, controller.signal).catch(() => undefined)
      }
    }

    void run()
    return () => controller.abort()
  }, [enabled, gateway, queryClient])
}
