import { GatewayProvider } from '@/entities/session/gateway-provider'
import { sessionId } from '@/entities/session/model'
import { useSessionStore } from '@/entities/session/store'
import { useThemeSync } from '@/features/theme/use-theme-sync'
import { LoginPage } from '@/pages/login/login-page'
import { MessengerPage } from '@/pages/messenger/messenger-page'

export function App() {
  useThemeSync()
  
  const session = useSessionStore((state) => state.session)

  if (!session) return <LoginPage />

  return (
    <GatewayProvider key={sessionId(session)} session={session}>
      <MessengerPage />
    </GatewayProvider>
  )
}
