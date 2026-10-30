import { QueryClient } from '@tanstack/react-query'
import { isGreenApiError } from '@/gateway/green-api/errors'

const MAX_RETRIES = 3

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) =>
          isGreenApiError(error) && error.retryable && failureCount < MAX_RETRIES,
        retryDelay: (attempt) => Math.min(1_200 * 2 ** attempt, 8_000),
      },
      mutations: {
        retry: (failureCount, error) =>
          isGreenApiError(error) && error.code === 'rate_limited' && failureCount < 2,
        retryDelay: 1_100,
      },
    },
  })
}
