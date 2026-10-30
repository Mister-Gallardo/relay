import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useGateway } from '@/entities/session/gateway-context'
import { queryKeys } from '@/shared/config/query-keys'
import { useChatStore } from './store'

export function useChatsSync(enabled: boolean) {
  const gateway = useGateway()
  const syncChats = useChatStore((state) => state.syncChats)
  const query = useQuery({
    queryKey: queryKeys.chats(gateway.instanceId),
    queryFn: ({ signal }) => gateway.getChats(signal),
    enabled,
    staleTime: 2 * 60_000,
  })

  useEffect(() => {
    if (query.data) syncChats(query.data)
  }, [query.data, syncChats])

  return query
}

export function useChatHistory(chatId: string | null, count: number) {
  const gateway = useGateway()
  const mergeHistory = useChatStore((state) => state.mergeHistory)
  const query = useQuery({
    queryKey: queryKeys.history(gateway.instanceId, chatId ?? '', count),
    queryFn: ({ signal }) => gateway.getHistory(chatId!, count, signal),
    enabled: Boolean(chatId),
    staleTime: 60_000,
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[3] === chatId ? keepPreviousData(previous) : undefined,
  })

  useEffect(() => {
    if (chatId && query.data) mergeHistory(chatId, query.data)
  }, [chatId, query.data, mergeHistory])

  return query
}

export function useContact(chatId: string | null, enabled = true) {
  const gateway = useGateway()
  const applyContact = useChatStore((state) => state.applyContact)
  const query = useQuery({
    queryKey: queryKeys.contact(gateway.instanceId, chatId ?? ''),
    queryFn: ({ signal }) => gateway.getContact(chatId!, signal),
    enabled: Boolean(chatId) && enabled,
    staleTime: 10 * 60_000,
    retry: false,
  })

  useEffect(() => {
    if (query.data) applyContact(query.data)
  }, [query.data, applyContact])

  return query
}
