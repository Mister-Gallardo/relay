export type ChatType = 'user' | 'group' | 'channel' | 'bot'

export interface Chat {
  id: string
  type: ChatType
  title: string
  phone?: string
  avatarUrl?: string
  unread: number
  lastActivity: number
  order: number
  draft?: string
}

export function isGroupLike(type: ChatType): boolean {
  return type === 'group' || type === 'channel'
}
