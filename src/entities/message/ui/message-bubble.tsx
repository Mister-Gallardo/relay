import { CircleAlert, Paperclip, RotateCw, Trash2 } from 'lucide-react'
import { memo } from 'react'
import { cn } from '@/shared/lib/cn'
import { linkify } from '@/shared/lib/linkify'
import { formatTime } from '@/shared/lib/time'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import type { Message } from '../model'
import { DeliveryStatusIcon } from './delivery-status'

const SENDER_COLORS = ['#5ec7ce', '#78b1f5', '#a79dff', '#f78fb7', '#f2ab7d']

function senderColor(name: string): string {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return SENDER_COLORS[Math.abs(hash) % SENDER_COLORS.length]!
}

interface MessageBubbleProps {
  message: Message
  first: boolean
  last: boolean
  showSender: boolean
  animate: boolean
  onRetry: (message: Message) => void
  onDelete: (message: Message) => void
}

export const MessageBubble = memo(function MessageBubble({
  message,
  first,
  last,
  showSender,
  animate,
  onRetry,
  onDelete,
}: MessageBubbleProps) {
  const outgoing = message.direction === 'out'
  const failed = message.status === 'failed'
  const placeholder = message.kind === 'placeholder'

  return (
    <div
      className={cn(
        'flex items-end gap-2 px-3 sm:px-4',
        outgoing ? 'justify-end' : 'justify-start',
        last ? 'pb-2' : 'pb-[3px]',
        first && 'pt-1',
      )}
    >
      {failed && outgoing && (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="mb-1 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-negative transition-colors outline-none hover:bg-negative/12"
            aria-label="Сообщение не отправлено"
          >
            <CircleAlert className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top">
            <DropdownMenuLabel>{message.error ?? 'Сообщение не отправлено'}</DropdownMenuLabel>
            {!message.id && (
              <DropdownMenuItem onSelect={() => onRetry(message)}>
                <RotateCw />
                Отправить ещё раз
              </DropdownMenuItem>
            )}
            <DropdownMenuItem destructive onSelect={() => onDelete(message)}>
              <Trash2 />
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <div
        className={cn(
          'relative max-w-[min(560px,82%)] rounded-[18px] px-3 pt-[7px] pb-[7px] shadow-bubble',
          outgoing
            ? 'rounded-br-md bg-bubble-out text-bubble-out-fg'
            : 'rounded-bl-md bg-bubble-in text-bubble-in-fg',
          !first && (outgoing ? 'rounded-tr-md' : 'rounded-tl-md'),
          failed && 'opacity-80',
          animate && 'animate-bubble-in',
        )}
      >
        {showSender && message.senderName && (
          <p
            className="mb-0.5 truncate text-description font-medium"
            style={{ color: senderColor(message.senderName) }}
          >
            {message.senderName}
          </p>
        )}

        <p
          className={cn(
            'text-[15px] leading-5 break-words whitespace-pre-wrap',
            placeholder && 'inline-flex items-center gap-1.5 italic opacity-75',
          )}
        >
          {placeholder && <Paperclip className="size-4 shrink-0" />}
          {placeholder
            ? message.text
            : linkify(message.text, 'underline decoration-1 underline-offset-2 hover:opacity-80')}
          <span
            aria-hidden="true"
            className={cn('inline-block', outgoing ? 'w-[62px]' : 'w-[40px]')}
          />
        </p>

        <span
          className={cn(
            'absolute right-2.5 bottom-[5px] inline-flex items-center gap-[3px] text-label leading-none select-none',
            outgoing ? 'text-bubble-out-meta' : 'text-bubble-in-meta',
          )}
        >
          <time dateTime={new Date(message.timestamp).toISOString()}>
            {formatTime(message.timestamp)}
          </time>
          {outgoing && message.status && message.status !== 'failed' && (
            <DeliveryStatusIcon status={message.status} readClassName="text-bubble-out-check" />
          )}
        </span>
      </div>
    </div>
  )
})
