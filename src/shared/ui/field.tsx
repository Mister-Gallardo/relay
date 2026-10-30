import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

interface FieldProps {
  id: string
  label: string
  error?: string
  hint?: ReactNode
  className?: string
  children: ReactNode
}

export function Field({ id, label, error, hint, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="px-1 text-description text-fg-tertiary">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="px-1 text-description text-negative">
          {error}
        </p>
      ) : hint ? (
        <p className="px-1 text-description text-fg-mute">{hint}</p>
      ) : null}
    </div>
  )
}
