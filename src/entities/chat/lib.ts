import { formatPhone } from '@/shared/lib/phone'
import type { Chat } from './model'

export function chatSubtitle(chat: Chat): string {
  switch (chat.type) {
    case 'group':
      return 'группа'
    case 'channel':
      return 'канал'
    case 'bot':
      return 'бот'
    default:
      return chat.phone ? formatPhone(chat.phone) : ''
  }
}
