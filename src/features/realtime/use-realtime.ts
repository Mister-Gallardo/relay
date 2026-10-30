import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { useChatStore } from '@/entities/chat/store'
import { useConnectionStore } from '@/entities/session/connection-store'
import { useGateway } from '@/entities/session/gateway-context'
import type { GatewayEvent } from '@/gateway/types'
import { queryKeys } from '@/shared/config/query-keys'
import { isDocumentVisible } from '@/shared/lib/use-document-visible'

export function useRealtime(enabled: boolean) {
  const gateway = useGateway()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled) return
    const { setStatus, setInstanceState } = useConnectionStore.getState()

    const handle = (event: GatewayEvent) => {
      const store = useChatStore.getState()
      switch (event.type) {
        case 'message':
          store.receive(event.message, event.chat, { visible: isDocumentVisible() })
          break
        case 'status':
          store.applyStatus(event.chatId, event.messageId, event.status, event.description)
          if (event.status === 'noAccount') toast.error('Получатель не зарегистрирован в MAX')
          break
        case 'instance-state':
          setInstanceState(event.state)
          void queryClient.invalidateQueries({ queryKey: queryKeys.account(gateway.instanceId) })
          break
        case 'quota-exceeded':
          toast.error('Превышен лимит чатов на тарифе MAX Developer', {
            description: event.description || undefined,
            duration: 10_000,
          })
          break
      }
    }

    return gateway.subscribe({ onEvent: handle, onStatus: setStatus })
  }, [enabled, gateway, queryClient])
}
