import { Check, CheckCheck, CircleAlert, Clock3 } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import type { DeliveryStatus } from '../model'

const LABELS: Record<DeliveryStatus, string> = {
  pending: 'Отправляется',
  sent: 'Отправлено',
  delivered: 'Доставлено',
  read: 'Прочитано',
  failed: 'Не отправлено',
}

interface DeliveryStatusIconProps {
  status: DeliveryStatus
  className?: string
  readClassName?: string
}

export function DeliveryStatusIcon({
  status,
  className,
  readClassName = 'text-accent',
}: DeliveryStatusIconProps) {
  const common = cn('size-4 shrink-0', className)
  const label = LABELS[status]

  switch (status) {
    case 'pending':
      return <Clock3 className={cn(common, 'size-3.5')} strokeWidth={2.2} aria-label={label} />
    case 'sent':
      return <Check className={common} strokeWidth={2.4} aria-label={label} />
    case 'delivered':
      return <CheckCheck className={common} strokeWidth={2.4} aria-label={label} />
    case 'read':
      return (
        <CheckCheck className={cn(common, readClassName)} strokeWidth={2.4} aria-label={label} />
      )
    case 'failed':
      return (
        <CircleAlert className={cn(common, 'text-negative')} strokeWidth={2.2} aria-label={label} />
      )
  }
}
