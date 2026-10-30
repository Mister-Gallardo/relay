import type { Message } from '@/entities/message/model'
import { isSameDay } from '@/shared/lib/time'

const GROUP_WINDOW = 5 * 60_000

export type Row =
  | { type: 'day'; key: string; timestamp: number }
  | {
      type: 'message'
      key: string
      message: Message
      first: boolean
      last: boolean
      showSender: boolean
    }

function sameGroup(a: Message, b: Message): boolean {
  return (
    a.direction === b.direction &&
    a.senderName === b.senderName &&
    b.timestamp - a.timestamp < GROUP_WINDOW &&
    isSameDay(a.timestamp, b.timestamp)
  )
}

export function buildRows(messages: Message[], groupChat: boolean): Row[] {
  const rows: Row[] = []
  messages.forEach((message, index) => {
    const previous = messages[index - 1]
    const next = messages[index + 1]
    if (!previous || !isSameDay(previous.timestamp, message.timestamp)) {
      rows.push({ type: 'day', key: `day:${message.key}`, timestamp: message.timestamp })
    }
    const first = !previous || !sameGroup(previous, message)
    rows.push({
      type: 'message',
      key: message.key,
      message,
      first,
      last: !next || !sameGroup(message, next),
      showSender: groupChat && message.direction === 'in' && first,
    })
  })
  return rows
}
