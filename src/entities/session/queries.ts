import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/shared/config/query-keys'
import { useGateway } from './gateway-context'

export function useAccount() {
  const gateway = useGateway()
  return useQuery({
    queryKey: queryKeys.account(gateway.instanceId),
    queryFn: ({ signal }) => gateway.getAccount(signal),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  })
}

export function useReceiveSettings() {
  const gateway = useGateway()
  return useQuery({
    queryKey: queryKeys.receiveSettings(gateway.instanceId),
    queryFn: () => gateway.checkReceiveSettings(),
    staleTime: Infinity,
    retry: false,
  })
}
