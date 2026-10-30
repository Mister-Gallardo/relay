import { useId } from 'react'
import { cn } from '@/shared/lib/cn'

export function Logo({ size = 48, className }: { size?: number; className?: string }) {
  const id = useId()
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="6" y1="4" x2="44" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2f8dff" />
          <stop offset="0.55" stopColor="#4b6dff" />
          <stop offset="1" stopColor="#8a5cff" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="15" fill={`url(#${id})`} />
      <path
        d="M19 12.5h7a7 7 0 0 1 7 7v.5h-8a8 8 0 0 0-8 8v1.2l-3.6 2.7A.9.9 0 0 1 12 31.2V19.5a7 7 0 0 1 7-7Z"
        fill="#fff"
        fillOpacity="0.5"
      />
      <path
        d="M23 21.5h8a6.5 6.5 0 0 1 6.5 6.5v8.6a.9.9 0 0 1-1.4.7L32.6 34.8H23a6.5 6.5 0 0 1-6.5-6.5V28a6.5 6.5 0 0 1 6.5-6.5Z"
        fill="#fff"
      />
    </svg>
  )
}
