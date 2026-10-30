import { useEffect, useState } from 'react'
import { bindChatStorage } from '@/entities/chat/store'
import { useGateway } from '@/entities/session/gateway-context'

export function useChatScope() {
  const gateway = useGateway()
  const [readyScope, setReadyScope] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void bindChatStorage(gateway.instanceId, { ephemeral: gateway.mode === 'demo' }).then(() => {
      if (!cancelled) setReadyScope(gateway.instanceId)
    })
    return () => {
      cancelled = true
    }
  }, [gateway])

  return readyScope === gateway.instanceId
}
