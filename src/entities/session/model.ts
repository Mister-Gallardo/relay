import type { GreenApiCredentials } from '@/gateway/green-api/client'

export type Session = { mode: 'live'; credentials: GreenApiCredentials } | { mode: 'demo' }

export function sessionId(session: Session): string {
  return session.mode === 'demo' ? 'demo' : session.credentials.idInstance
}
