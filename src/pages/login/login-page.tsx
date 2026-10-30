import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, CircleAlert, ExternalLink, Eye, EyeOff } from 'lucide-react'
import { useId, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { useSessionStore } from '@/entities/session/store'
import { defaultApiUrl } from '@/gateway/green-api/client'
import { describeError } from '@/gateway/green-api/errors'
import { GreenApiGateway } from '@/gateway/green-api/gateway'
import type { AccountInfo, InstanceState } from '@/gateway/types'
import { queryKeys } from '@/shared/config/query-keys'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { Field } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { Logo } from '@/shared/ui/logo'
import { Spinner } from '@/shared/ui/spinner'

const CONSOLE_URL = 'https://console.green-api.com'

const schema = z.object({
  idInstance: z
    .string()
    .trim()
    .regex(/^\d{10}$/, 'idInstance — это 10 цифр из личного кабинета'),
  apiTokenInstance: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{32,}$/, 'Токен выглядит неполным — скопируйте его целиком'),
  apiUrl: z
    .string()
    .trim()
    .refine((value) => value === '' || /^https:\/\/[\w.-]+(:\d+)?(\/[\w./-]*)?$/.test(value), {
      message: 'Адрес должен начинаться с https://',
    }),
  remember: z.boolean(),
})

type FormValues = z.infer<typeof schema>

const BLOCKING_STATES: Partial<Record<InstanceState, string>> = {
  notAuthorized: 'Инстанс не привязан к аккаунту MAX. Отсканируйте QR-код в личном кабинете.',
  blocked: 'Аккаунт MAX на этом инстансе заблокирован.',
  starting: 'Инстанс запускается. Попробуйте через минуту.',
  pendingPassword: 'Завершите вход в личном кабинете: MAX запрашивает облачный пароль.',
}

class InstanceStateError extends Error {}

export function LoginPage() {
  const signIn = useSessionStore((state) => state.signIn)
  const rememberDefault = useSessionStore((state) => state.remember)
  const queryClient = useQueryClient()
  const [showToken, setShowToken] = useState(false)
  const [advanced, setAdvanced] = useState(false)
  const advancedId = useId()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { idInstance: '', apiTokenInstance: '', apiUrl: '', remember: rememberDefault },
    mode: 'onTouched',
  })
  const { errors } = form.formState
  const idInstance = useWatch({ control: form.control, name: 'idInstance' })
  const suggestedApiUrl = defaultApiUrl(idInstance ?? '')

  const login = useMutation({
    mutationFn: async (values: FormValues) => {
      const credentials = {
        idInstance: values.idInstance,
        apiTokenInstance: values.apiTokenInstance,
        apiUrl: values.apiUrl || defaultApiUrl(values.idInstance),
      }
      const account: AccountInfo = await new GreenApiGateway(credentials).getAccount()
      const blocking = BLOCKING_STATES[account.state]
      if (blocking) throw new InstanceStateError(blocking)
      return { credentials, account, remember: values.remember }
    },
    onSuccess: ({ credentials, account, remember }) => {
      queryClient.setQueryData(queryKeys.account(credentials.idInstance), account)
      signIn({ mode: 'live', credentials }, remember)
    },
  })

  const openDemo = () => signIn({ mode: 'demo' }, form.getValues('remember'))

  return (
    <div className="chat-ground relative isolate flex min-h-dvh items-center justify-center px-4 py-10">
      <main className="w-full max-w-[440px] rounded-[28px] bg-panel p-6 shadow-float sm:p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo size={56} />
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[24px] leading-7 font-semibold">Вход в Relay</h1>
            <p className="text-detail text-fg-tertiary">
              Подключите инстанс GREEN-API, чтобы писать в MAX прямо из браузера
            </p>
          </div>
        </div>

        <form
          noValidate
          className="mt-7 flex flex-col gap-4"
          onSubmit={form.handleSubmit((values) => login.mutate(values))}
        >
          <Field id="idInstance" label="idInstance" error={errors.idInstance?.message}>
            <Input
              id="idInstance"
              inputMode="numeric"
              autoComplete="username"
              placeholder="3100123456"
              className="tabular-nums"
              aria-invalid={Boolean(errors.idInstance)}
              {...form.register('idInstance')}
            />
          </Field>

          <Field
            id="apiTokenInstance"
            label="apiTokenInstance"
            error={errors.apiTokenInstance?.message}
          >
            <div className="relative">
              <Input
                id="apiTokenInstance"
                type={showToken ? 'text' : 'password'}
                autoComplete="current-password"
                spellCheck={false}
                placeholder="Токен из личного кабинета"
                className="pr-12 font-mono text-[14px] placeholder:font-sans placeholder:text-[16px]"
                aria-invalid={Boolean(errors.apiTokenInstance)}
                {...form.register('apiTokenInstance')}
              />
              <button
                type="button"
                onClick={() => setShowToken((value) => !value)}
                className="absolute top-1/2 right-2 inline-flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-fg-mute transition-colors hover:text-fg"
                aria-label={showToken ? 'Скрыть токен' : 'Показать токен'}
              >
                {showToken ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          </Field>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setAdvanced((value) => !value)}
              aria-expanded={advanced}
              aria-controls={advancedId}
              className="inline-flex cursor-pointer items-center gap-1 self-start px-1 text-description text-fg-tertiary transition-colors hover:text-fg"
            >
              Адрес API
              <ChevronDown
                className={cn('size-4 transition-transform', advanced && 'rotate-180')}
              />
            </button>
            {advanced && (
              <div id={advancedId}>
                <Field
                  id="apiUrl"
                  label="apiUrl"
                  error={errors.apiUrl?.message}
                  hint="Если поле пустое, адрес подставится по номеру инстанса"
                >
                  <Input
                    id="apiUrl"
                    inputMode="url"
                    spellCheck={false}
                    placeholder={suggestedApiUrl}
                    aria-invalid={Boolean(errors.apiUrl)}
                    {...form.register('apiUrl')}
                  />
                </Field>
              </div>
            )}
          </div>

          <label className="flex cursor-pointer items-center gap-3 px-1 text-detail text-fg-secondary">
            <Controller
              control={form.control}
              name="remember"
              render={({ field }) => (
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
              )}
            />
            Запомнить на этом устройстве
          </label>

          {login.isError && (
            <div
              role="alert"
              className="flex gap-2.5 rounded-xl bg-negative/10 px-3.5 py-3 text-[14px] leading-5 text-fg"
            >
              <CircleAlert className="mt-px size-[18px] shrink-0 text-negative" />
              <span>{describeError(login.error)}</span>
            </div>
          )}

          <Button type="submit" size="lg" className="mt-1" disabled={login.isPending}>
            {login.isPending && <Spinner />}
            {login.isPending ? 'Подключаемся' : 'Войти'}
          </Button>
          <Button type="button" variant="ghost" size="lg" onClick={openDemo}>
            Открыть демо без инстанса
          </Button>
        </form>

        <p className="mt-6 text-center text-description text-fg-mute">
          Данные инстанса есть в{' '}
          <a
            href={CONSOLE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-accent hover:text-accent-hover"
          >
            личном кабинете GREEN-API
            <ExternalLink className="size-3.5" />
          </a>
          . Они хранятся только в этом браузере.
        </p>
      </main>
    </div>
  )
}
