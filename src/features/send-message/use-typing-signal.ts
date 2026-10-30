import { useCallback, useRef } from 'react'
import { useGateway } from '@/entities/session/gateway-context'

const INTERVAL = 6_000

export function useTypingSignal(chatId: string | null) {
  const gateway = useGateway()
  const lastSent = useRef<{ chatId: string | null; at: number }>({ chatId: null, at: 0 })

  return useCallback(() => {
    if (!chatId) return
    const now = Date.now()
    const previous = lastSent.current
    if (previous.chatId === chatId && now - previous.at < INTERVAL) return
    lastSent.current = { chatId, at: now }
    gateway.sendTyping(chatId).catch(() => undefined)
  }, [chatId, gateway])
}
