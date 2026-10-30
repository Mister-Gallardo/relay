import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Phone } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { useChatStore } from '@/entities/chat/store'
import { useGateway } from '@/entities/session/gateway-context'
import { describeError } from '@/gateway/green-api/errors'
import { formatPhoneInput, isValidPhone, normalizePhone } from '@/shared/lib/phone'
import { useUiStore } from '@/shared/model/ui-store'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog'
import { Field } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { Spinner } from '@/shared/ui/spinner'

const schema = z.object({
  phone: z.string().refine(isValidPhone, 'Введите номер полностью, например +7 999 123-45-67'),
})

type FormValues = z.infer<typeof schema>

class NotRegisteredError extends Error {}

export function NewChatDialog() {
  const open = useUiStore((state) => state.newChatOpen)
  const setOpen = useUiStore((state) => state.setNewChatOpen)
  const gateway = useGateway()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '' },
  })

  const lookup = useMutation({
    mutationFn: async ({ phone }: FormValues) => {
      const digits = normalizePhone(phone)
      const found = await gateway.findAccount(digits)
      if (!found) throw new NotRegisteredError()
      return { chatId: found.chatId, phone: digits }
    },
    onSuccess: ({ chatId, phone }) => {
      const store = useChatStore.getState()
      store.ensureChat({ id: chatId, type: 'user', phone })
      store.openChat(chatId)
      handleOpenChange(false)
    },
    onError: (error) => {
      form.setError('phone', {
        message:
          error instanceof NotRegisteredError
            ? 'На этот номер не зарегистрирован MAX'
            : describeError(error),
      })
    },
  })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      form.reset()
      lookup.reset()
    }
  }

  const error = form.formState.errors.phone?.message

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogTitle>Новый чат</DialogTitle>
        <DialogDescription>
          Введите номер телефона — проверим, есть ли у человека аккаунт MAX.
        </DialogDescription>

        <form
          noValidate
          className="mt-5 flex flex-col gap-5"
          onSubmit={form.handleSubmit((values) => lookup.mutate(values))}
        >
          <Field id="new-chat-phone" label="Номер телефона" error={error}>
            <div className="relative">
              <Phone className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-fg-mute" />
              <Controller
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <Input
                    {...field}
                    id="new-chat-phone"
                    autoFocus
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+7 999 123-45-67"
                    className="pl-12 tabular-nums"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'new-chat-phone-error' : undefined}
                    onChange={(event) => field.onChange(formatPhoneInput(event.target.value))}
                  />
                )}
              />
            </div>
          </Field>

          <Button type="submit" size="lg" disabled={lookup.isPending}>
            {lookup.isPending ? <Spinner /> : null}
            {lookup.isPending ? 'Проверяем номер' : 'Начать чат'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
