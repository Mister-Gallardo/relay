const DAY = 24 * 60 * 60 * 1000

const timeFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
const weekdayFormat = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' })
const shortDateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
const fullDateFormat = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})
const dayLabelFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })
const dayLabelWithYearFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function startOfDay(ts: number): number {
  const date = new Date(ts)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function isSameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b)
}

export function formatTime(ts: number): string {
  return timeFormat.format(ts)
}

export function formatChatTime(ts: number, now = Date.now()): string {
  const diffDays = Math.round((startOfDay(now) - startOfDay(ts)) / DAY)
  if (diffDays <= 0) return formatTime(ts)
  if (diffDays === 1) return 'вчера'
  if (diffDays < 7) return weekdayFormat.format(ts)
  if (new Date(ts).getFullYear() === new Date(now).getFullYear()) {
    return shortDateFormat.format(ts).replace('.', '')
  }
  return fullDateFormat.format(ts)
}

export function formatDayLabel(ts: number, now = Date.now()): string {
  const diffDays = Math.round((startOfDay(now) - startOfDay(ts)) / DAY)
  if (diffDays === 0) return 'Сегодня'
  if (diffDays === 1) return 'Вчера'
  if (new Date(ts).getFullYear() === new Date(now).getFullYear()) return dayLabelFormat.format(ts)
  return dayLabelWithYearFormat.format(ts).replace(' г.', '')
}

export function formatLastSeen(ts: number, now = Date.now()): string {
  const diff = now - ts
  if (diff < 60_000) return 'был(а) только что'
  if (diff < 60 * 60_000) return `был(а) ${Math.floor(diff / 60_000)} мин. назад`
  if (isSameDay(ts, now)) return `был(а) сегодня в ${formatTime(ts)}`
  if (isSameDay(ts, now - DAY)) return `был(а) вчера в ${formatTime(ts)}`
  return `был(а) ${shortDateFormat.format(ts).replace('.', '')}`
}
