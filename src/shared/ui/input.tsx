import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/cn'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-12 w-full min-w-0 rounded-xl border border-transparent bg-input px-4 text-[16px] text-fg transition-[border-color,background-color] duration-150 outline-none placeholder:text-fg-mute focus:border-accent disabled:opacity-50 aria-invalid:border-negative',
        className,
      )}
      {...props}
    />
  )
}
