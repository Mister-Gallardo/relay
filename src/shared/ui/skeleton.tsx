import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/cn'

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('animate-pulse rounded-lg bg-input', className)} {...props} />
}
