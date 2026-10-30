import { createContext, useContext } from 'react'
import type { MessengerGateway } from '@/gateway/types'

export const GatewayContext = createContext<MessengerGateway | null>(null)

export function useGateway(): MessengerGateway {
  const gateway = useContext(GatewayContext)
  if (!gateway) throw new Error('useGateway must be used inside GatewayProvider')
    
  return gateway
}
