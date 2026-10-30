import { type ReactNode, memo } from 'react'
import { DeliveryStatusIcon } from '@/entities/message/ui/delivery-status'
import { cn } from '@/shared/lib/cn'
import { formatChatTime } from '@/shared/lib/time'
import { Avatar } from '@/shared/ui/avatar'
import { isGroupLike, type Chat } from '../model'
import { useLastMessage } from '../selectors'

interface ChatListItemProps {
  chat: Chat
  active: boolean
  onSelect: (chatId: string) => void
}

export const ChatListItem = memo(function ChatListItem({
  chat,
  active,
  onSelect,
}: ChatListItemProps) {
  const last = useLastMessage(chat.id)
  const time = last?.timestamp ?? (chat.lastActivity || undefined)
  const unread = chat.unread > 0

  let preview: ReactNode = null
  if (chat.draft) {
    preview = (
      <>
        <span className="text-negative">Черновик: </span>
        {chat.draft}
      </>
    )
  } else if (last) {
    const author =
      last.direction === 'out'
        ? 'Вы: '
        : isGroupLike(chat.type) && last.senderName
          ? `${last.senderName}: `
          : ''
    preview = (
      <>
        {author && <span className="text-fg-secondary">{author}</span>}
        <span className={cn(last.kind === 'placeholder' && 'text-accent')}>{last.text}</span>
      </>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(chat.id)}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'group flex h-[72px] w-full cursor-pointer items-center gap-3 rounded-2xl px-2.5 text-left transition-colors duration-100 outline-none focus-visible:bg-card-hover',
        active ? 'bg-card-selected' : 'hover:bg-card-hover',
      )}
    >
      <Avatar seed={chat.id} name={chat.title} src={chat.avatarUrl} type={chat.type} size={52} />

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <span className="truncate text-detail font-medium text-fg">{chat.title}</span>
          <span className="ml-auto flex shrink-0 items-center gap-1 text-label text-fg-mute">
            {last?.direction === 'out' && last.status && (
              <DeliveryStatusIcon status={last.status} className="size-[15px]" />
            )}
            {time !== undefined && (
              <time dateTime={new Date(time).toISOString()} className={cn(unread && 'text-accent')}>
                {formatChatTime(time)}
              </time>
            )}
          </span>
        </span>

        <span className="flex items-center gap-2">
          <span className="line-clamp-1 min-w-0 flex-1 text-[14px] leading-5 break-all text-fg-tertiary">
            {preview ?? <span className="text-fg-mute">Нет сообщений</span>}
          </span>
          {unread && (
            <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-label font-medium text-white tabular-nums">
              {chat.unread > 99 ? '99+' : chat.unread}
            </span>
          )}
        </span>
      </span>
    </button>
  )
})
