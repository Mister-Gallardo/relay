import { useEffect, useRef } from 'react'
import { useChatStore } from '@/entities/chat/store'
import { useGateway } from '@/entities/session/gateway-context'
import { useDocumentVisible } from '@/shared/lib/use-document-visible'

const MIN_INTERVAL = 1_500

export function useAutoMarkRead(chatId: string | null) {
  const gateway = useGateway()
  const visible = useDocumentVisible()
  const lastIncomingId = useChatStore((state) => {
    if (!chatId) return null
    const list = state.messages[chatId]
    for (let i = (list?.length ?? 0) - 1; i >= 0; i--) {
      const message = list![i]!
      if (message.direction === 'in') return message.id
    }
    return null
  })
  const lastCall = useRef(0)

  useEffect(() => {
    if (!chatId || !visible) return
    useChatStore.getState().markRead(chatId)
    if (!lastIncomingId) return

    const wait = Math.max(0, lastCall.current + MIN_INTERVAL - Date.now())
    const timer = setTimeout(() => {
      lastCall.current = Date.now()
      gateway.markRead(chatId).catch(() => undefined)
    }, wait)
    return () => clearTimeout(timer)
  }, [chatId, visible, lastIncomingId, gateway])
}
