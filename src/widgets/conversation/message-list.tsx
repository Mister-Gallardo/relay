import { ArrowDown } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type Components, Virtuoso, type VirtuosoHandle } from 'react-virtuoso'
import type { Message } from '@/entities/message/model'
import { MessageBubble } from '@/entities/message/ui/message-bubble'
import { cn } from '@/shared/lib/cn'
import { formatDayLabel } from '@/shared/lib/time'
import { Spinner } from '@/shared/ui/spinner'
import { type Row, buildRows } from './build-rows'

const START_INDEX = 1_000_000
const PILL_HIDE_DELAY = 1_000

interface ListContext {
  loadingOlder: boolean
}

const listComponents: Components<Row, ListContext> = {
  Header: ({ context }) => (
    <div className="flex h-12 items-center justify-center">
      {context?.loadingOlder && <Spinner className="size-5 text-fg-mute" />}
    </div>
  ),
  Footer: () => <div className="h-2" />,
}

interface MessageListProps {
  chatId: string
  messages: Message[]
  groupChat: boolean
  loadingOlder: boolean
  onReachTop: () => void
  onRetry: (message: Message) => void
  onDelete: (message: Message) => void
}

function firstMessageKey(rows: Row[]): string | null {
  return rows.find((row) => row.type === 'message')?.key ?? null
}

/**
 * Virtuoso держит позицию при подгрузке истории сверху, только если firstItemIndex
 * уменьшается ровно на число добавленных строк. Считаем сдвиг по первому сообщению.
 */
function usePrependAwareIndex(rows: Row[]) {
  const [snapshot, setSnapshot] = useState({ rows, index: START_INDEX })
  if (snapshot.rows === rows) return snapshot.index

  let index = snapshot.index
  const anchor = firstMessageKey(snapshot.rows)
  if (anchor) {
    const before = snapshot.rows.findIndex((row) => row.key === anchor)
    const after = rows.findIndex((row) => row.key === anchor)
    if (after > before) index -= after - before
  }
  setSnapshot({ rows, index })
  return index
}

function countUnseen(messages: Message[], since: number | null): number {
  if (since === null) return 0
  let count = 0
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]!
    if (message.timestamp <= since) break
    if (message.direction === 'in') count++
  }
  return count
}

function DayPill({ timestamp, floating }: { timestamp: number; floating?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center rounded-full bg-system-pill px-3 text-description font-medium text-system-pill-fg backdrop-blur-md',
        floating && 'shadow-float',
      )}
    >
      {formatDayLabel(timestamp)}
    </span>
  )
}

export function MessageList({
  chatId,
  messages,
  groupChat,
  loadingOlder,
  onReachTop,
  onRetry,
  onDelete,
}: MessageListProps) {
  const virtuoso = useRef<VirtuosoHandle>(null)
  const rows = useMemo(() => buildRows(messages, groupChat), [messages, groupChat])
  const firstItemIndex = usePrependAwareIndex(rows)
  const [openedAt] = useState(() => Date.now())

  const [leftBottomAt, setLeftBottomAt] = useState<number | null>(null)
  const unseen = useMemo(() => countUnseen(messages, leftBottomAt), [messages, leftBottomAt])

  const [topTimestamp, setTopTimestamp] = useState<number | null>(null)
  const [pillVisible, setPillVisible] = useState(false)
  const hidePillTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(hidePillTimer.current), [])

  const lastMessage = messages[messages.length - 1]
  const pendingOwnKey =
    lastMessage?.direction === 'out' && lastMessage.status === 'pending' ? lastMessage.key : null

  useEffect(() => {
    if (pendingOwnKey) virtuoso.current?.scrollToIndex({ index: 'LAST', behavior: 'smooth' })
  }, [pendingOwnKey])

  const handleScrolling = useCallback((scrolling: boolean) => {
    clearTimeout(hidePillTimer.current)
    if (scrolling) setPillVisible(true)
    else hidePillTimer.current = setTimeout(() => setPillVisible(false), PILL_HIDE_DELAY)
  }, [])

  const scrollToBottom = useCallback(() => {
    virtuoso.current?.scrollToIndex({ index: 'LAST', behavior: 'smooth' })
  }, [])

  const renderRow = useCallback(
    (_: number, row: Row) => (
      <div className="mx-auto w-full max-w-[808px]">
        {row.type === 'day' ? (
          <div className="flex justify-center py-2">
            <DayPill timestamp={row.timestamp} />
          </div>
        ) : (
          <MessageBubble
            message={row.message}
            first={row.first}
            last={row.last}
            showSender={row.showSender}
            animate={row.message.timestamp > openedAt}
            onRetry={onRetry}
            onDelete={onDelete}
          />
        )}
      </div>
    ),
    [openedAt, onRetry, onDelete],
  )

  const atBottom = leftBottomAt === null

  return (
    <div className="relative min-h-0 flex-1">
      <Virtuoso
        key={chatId}
        ref={virtuoso}
        className="h-full"
        data={rows}
        context={{ loadingOlder }}
        components={listComponents}
        firstItemIndex={firstItemIndex}
        initialTopMostItemIndex={Math.max(0, rows.length - 1)}
        alignToBottom
        computeItemKey={(_, row) => row.key}
        itemContent={renderRow}
        followOutput={(isAtBottom) => (isAtBottom ? 'smooth' : false)}
        atBottomThreshold={96}
        atBottomStateChange={(bottom) => setLeftBottomAt(bottom ? null : Date.now())}
        startReached={onReachTop}
        increaseViewportBy={{ top: 600, bottom: 300 }}
        isScrolling={handleScrolling}
        rangeChanged={({ startIndex }) => {
          const row = rows[startIndex - firstItemIndex]
          if (row) setTopTimestamp(row.type === 'day' ? row.timestamp : row.message.timestamp)
        }}
      />

      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-3 flex justify-center transition-opacity duration-300',
          pillVisible && topTimestamp && !atBottom ? 'opacity-100' : 'opacity-0',
        )}
        aria-hidden="true"
      >
        {topTimestamp && <DayPill timestamp={topTimestamp} floating />}
      </div>

      <button
        type="button"
        onClick={scrollToBottom}
        aria-label="К последним сообщениям"
        tabIndex={atBottom ? -1 : 0}
        className={cn(
          'absolute right-4 bottom-3 inline-flex size-11 cursor-pointer items-center justify-center rounded-full bg-float text-fg-secondary shadow-float transition-[opacity,transform] duration-200 hover:text-fg',
          atBottom ? 'pointer-events-none translate-y-2 opacity-0' : 'opacity-100',
        )}
      >
        <ArrowDown className="size-5" />
        {unseen > 0 && (
          <span className="absolute -top-1.5 left-1/2 inline-flex h-5 min-w-5 -translate-x-1/2 items-center justify-center rounded-full bg-accent px-1.5 text-label font-medium text-white tabular-nums">
            {unseen}
          </span>
        )}
      </button>
    </div>
  )
}
