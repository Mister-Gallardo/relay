import { type ReactNode, useMemo } from 'react'
import { createGateway } from './create-gateway'
import { GatewayContext } from './gateway-context'
import type { Session } from './model'

export function GatewayProvider({ session, children }: { session: Session; children: ReactNode }) {
  const gateway = useMemo(() => createGateway(session), [session])
  
  return <GatewayContext.Provider value={gateway}>{children}</GatewayContext.Provider>
}
