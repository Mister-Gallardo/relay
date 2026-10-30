import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ExternalLink, ShieldAlert, WifiOff } from 'lucide-react'
import { toast } from 'sonner'
import { useConnectionStore } from '@/entities/session/connection-store'
import { useGateway } from '@/entities/session/gateway-context'
import { useAccount, useReceiveSettings } from '@/entities/session/queries'
import { describeError } from '@/gateway/green-api/errors'
import type { InstanceState } from '@/gateway/types'
import { queryKeys } from '@/shared/config/query-keys'
import { Button } from '@/shared/ui/button'
import { Spinner } from '@/shared/ui/spinner'

const CONSOLE_URL = 'https://console.green-api.com'

const STATE_MESSAGES: Partial<Record<InstanceState, string>> = {
  notAuthorized: 'Инстанс не авторизован в MAX. Отсканируйте QR-код в личном кабинете GREEN-API.',
  blocked: 'Аккаунт MAX заблокирован. Отправка и получение недоступны.',
  starting: 'Инстанс перезапускается — это займёт пару минут.',
  pendingPassword: 'Завершите вход в личном кабинете: MAX запрашивает облачный пароль.',
  suspended: 'На аккаунте временные ограничения: писать можно только тем, у кого вы в контактах.',
}

function Banner({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children?: ReactNode
}) {
  return (
    <div role="status" className="mx-3 mb-2 flex gap-3 rounded-2xl bg-attention/10 p-3 text-fg">
      <span className="mt-0.5 text-attention [&_svg]:size-5">{icon}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-[14px] leading-5">{title}</p>
        {children}
      </div>
    </div>
  )
}

export function StatusBanner({ onSignOut }: { onSignOut: () => void }) {
  const gateway = useGateway()
  const queryClient = useQueryClient()
  const status = useConnectionStore((state) => state.status)
  const liveState = useConnectionStore((state) => state.instanceState)
  const account = useAccount()
  const settings = useReceiveSettings()

  const fix = useMutation({
    mutationFn: () => gateway.fixReceiveSettings(),
    onSuccess: () => {
      toast.success('Настройки сохранены', {
        description: 'GREEN-API применит их в течение нескольких минут.',
      })
      queryClient.setQueryData(queryKeys.receiveSettings(gateway.instanceId), [])
    },
    onError: (error) => toast.error(describeError(error)),
  })

  if (status === 'unauthorized') {
    return (
      <Banner
        icon={<ShieldAlert />}
        title="Доступ к инстансу отклонён. Проверьте данные и войдите заново."
      >
        <Button size="sm" variant="secondary" className="self-start" onClick={onSignOut}>
          Выйти
        </Button>
      </Banner>
    )
  }

  const state = liveState !== 'unknown' ? liveState : account.data?.state
  const stateMessage = state ? STATE_MESSAGES[state] : undefined
  if (stateMessage) {
    return (
      <Banner icon={<ShieldAlert />} title={stateMessage}>
        <Button size="sm" variant="secondary" className="self-start" asChild>
          <a href={CONSOLE_URL} target="_blank" rel="noopener noreferrer">
            Личный кабинет
            <ExternalLink />
          </a>
        </Button>
      </Banner>
    )
  }

  if (settings.data && settings.data.length > 0) {
    return (
      <Banner icon={<ShieldAlert />} title="Новые сообщения могут не приходить:">
        <ul className="-mt-1 flex list-disc flex-col gap-0.5 pl-4 text-description text-fg-tertiary">
          {settings.data.map((issue) => (
            <li key={issue.key}>{issue.label}</li>
          ))}
        </ul>
        <Button
          size="sm"
          className="self-start"
          disabled={fix.isPending}
          onClick={() => fix.mutate()}
        >
          {fix.isPending && <Spinner className="size-4" />}
          Исправить настройки
        </Button>
      </Banner>
    )
  }

  if (status === 'offline') {
    return (
      <Banner icon={<WifiOff />} title="Нет подключения к интернету. Ждём, когда сеть вернётся." />
    )
  }

  return null
}
