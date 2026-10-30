import { SendHorizontal } from 'lucide-react'
import { type KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useChatStore } from '@/entities/chat/store'
import { MESSAGE_MAX_LENGTH } from '@/entities/message/model'
import { useTypingSignal } from '@/features/send-message/use-typing-signal'
import { cn } from '@/shared/lib/cn'

const COUNTER_THRESHOLD = MESSAGE_MAX_LENGTH - 500
const MAX_HEIGHT = 176
const DRAFT_SAVE_DELAY = 400

interface ComposerProps {
  chatId: string
  disabled?: boolean
  onSend: (text: string) => void
}

export function Composer({ chatId, disabled, onSend }: ComposerProps) {
  const [text, setText] = useState(() => useChatStore.getState().chats[chatId]?.draft ?? '')
  const textarea = useRef<HTMLTextAreaElement>(null)
  const notifyTyping = useTypingSignal(chatId)
  const latest = useRef(text)

  useLayoutEffect(() => {
    const node = textarea.current
    if (!node) return
    node.style.height = '0px'
    node.style.height = `${Math.min(node.scrollHeight, MAX_HEIGHT)}px`
  }, [text])

  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) textarea.current?.focus()
  }, [])

  useEffect(() => {
    latest.current = text
    const timer = setTimeout(() => useChatStore.getState().setDraft(chatId, text), DRAFT_SAVE_DELAY)
    return () => clearTimeout(timer)
  }, [chatId, text])

  useEffect(() => () => useChatStore.getState().setDraft(chatId, latest.current), [chatId])

  const trimmed = text.trim()
  const tooLong = text.length > MESSAGE_MAX_LENGTH
  const canSend = Boolean(trimmed) && !tooLong && !disabled

  const submit = () => {
    if (!canSend) return
    onSend(trimmed)
    setText('')
    latest.current = ''
    textarea.current?.focus()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <form
      className="mx-auto flex w-full max-w-[808px] items-end gap-2 px-3 pt-1 pb-3 sm:px-4 sm:pb-4"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <div className="relative flex min-h-12 flex-1 items-center rounded-[24px] bg-writebar shadow-float">
        <label htmlFor={`composer-${chatId}`} className="sr-only">
          Сообщение
        </label>
        <textarea
          id={`composer-${chatId}`}
          ref={textarea}
          rows={1}
          value={text}
          disabled={disabled}
          placeholder={disabled ? 'Отправка недоступна' : 'Сообщение'}
          onChange={(event) => {
            setText(event.target.value)
            if (event.target.value.trim()) notifyTyping()
          }}
          onKeyDown={handleKeyDown}
          className="block max-h-[176px] w-full resize-none bg-transparent py-3.5 pr-4 pl-5 text-[15px] leading-5 text-fg outline-none placeholder:text-fg-mute disabled:cursor-not-allowed"
        />
        {text.length > COUNTER_THRESHOLD && (
          <span
            className={cn(
              'absolute -top-6 right-3 text-label tabular-nums',
              tooLong ? 'text-negative' : 'text-fg-mute',
            )}
          >
            {text.length} / {MESSAGE_MAX_LENGTH}
          </span>
        )}
      </div>
      <button
        type="submit"
        disabled={!canSend}
        aria-label="Отправить"
        className={cn(
          'inline-flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full shadow-float transition-[background-color,color,transform] duration-150 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          canSend
            ? 'bg-accent text-white hover:bg-accent-hover active:scale-95'
            : 'cursor-default bg-writebar text-fg-mute',
        )}
      >
        <SendHorizontal className="size-[22px]" strokeWidth={2.1} />
      </button>
    </form>
  )
}
