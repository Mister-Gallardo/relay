import { useMutation } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useChatStore } from '@/entities/chat/store'
import { useGateway } from '@/entities/session/gateway-context'
import { describeError } from '@/gateway/green-api/errors'

interface SendVariables {
  chatId: string
  text: string
  key: string
}

export function useSendMessage() {
  const gateway = useGateway()

  const mutation = useMutation({
    mutationKey: ['send-message', gateway.instanceId],
    mutationFn: ({ chatId, text }: SendVariables) => gateway.sendText(chatId, text),
    onSuccess: (sent, { chatId, key }) => {
      useChatStore.getState().resolveOutgoing(key, chatId, sent)
    },
    onError: (error, { chatId, key }) => {
      useChatStore.getState().failOutgoing(key, chatId, describeError(error))
    },
  })

  const { mutate } = mutation

  const send = useCallback(
    (chatId: string, rawText: string) => {
      const text = rawText.trim()
      if (!text) return
      const key = useChatStore.getState().addOutgoing(chatId, text)
      mutate({ chatId, text, key })
    },
    [mutate],
  )

  const retry = useCallback(
    (chatId: string, key: string) => {
      const text = useChatStore.getState().retryOutgoing(key, chatId)
      if (text !== null) mutate({ chatId, text, key })
    },
    [mutate],
  )

  return { send, retry }
}
