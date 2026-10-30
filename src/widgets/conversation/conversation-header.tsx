import { ArrowLeft, Copy, EllipsisVertical, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { chatSubtitle } from '@/entities/chat/lib'
import { type Chat, isGroupLike } from '@/entities/chat/model'
import { useContact } from '@/entities/chat/queries'
import { useChatStore } from '@/entities/chat/store'
import { formatPhone } from '@/shared/lib/phone'
import { formatLastSeen } from '@/shared/lib/time'
import { Avatar } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

const ONLINE_WINDOW = 2 * 60_000

function presence(chat: Chat, lastSeen: number | undefined): string {
  if (chat.type !== 'user' || lastSeen === undefined) return chatSubtitle(chat)
  if (Date.now() - lastSeen < ONLINE_WINDOW) return 'в сети'
  return formatLastSeen(lastSeen)
}

export function ConversationHeader({ chat, onBack }: { chat: Chat; onBack: () => void }) {
  const contact = useContact(chat.id, !isGroupLike(chat.type))
  const removeChat = useChatStore((state) => state.removeChat)
  const subtitle = presence(chat, contact.data?.lastSeen)
  const online = subtitle === 'в сети'

  const copyPhone = async () => {
    if (!chat.phone) return
    try {
      await navigator.clipboard.writeText(`+${chat.phone}`)
      toast.success('Номер скопирован')
    } catch {
      toast.error('Не удалось скопировать номер')
    }
  }

  return (
    <header className="absolute inset-x-0 top-0 z-10 flex h-16 items-center gap-3 border-b border-divider bg-panel-blur px-2 backdrop-blur-xl sm:px-4">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Назад к чатам"
        onClick={onBack}
      >
        <ArrowLeft />
      </Button>
      <Avatar seed={chat.id} name={chat.title} src={chat.avatarUrl} type={chat.type} size={40} />
      <div className="flex min-w-0 flex-1 flex-col">
        <h2 className="truncate text-title font-semibold">{chat.title}</h2>
        <p
          className={
            online ? 'text-description text-accent' : 'truncate text-description text-fg-tertiary'
          }
        >
          {subtitle || ' '}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Действия с чатом">
            <EllipsisVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {chat.phone && (
            <DropdownMenuItem onSelect={copyPhone}>
              <Copy />
              Скопировать {formatPhone(chat.phone)}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem destructive onSelect={() => removeChat(chat.id)}>
            <Trash2 />
            Убрать из списка
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
