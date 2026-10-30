import { DemoGateway } from '@/gateway/demo/demo-gateway'
import { GreenApiGateway } from '@/gateway/green-api/gateway'
import type { MessengerGateway } from '@/gateway/types'
import type { Session } from './model'

export function createGateway(session: Session): MessengerGateway {
  return session.mode === 'demo' ? new DemoGateway() : new GreenApiGateway(session.credentials)
}
