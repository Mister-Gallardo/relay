import { Bot, Users } from 'lucide-react'
import { useState } from 'react'
import type { ChatType } from '@/entities/chat/model'
import { avatarGradient, initials } from '@/shared/lib/avatar'
import { cn } from '@/shared/lib/cn'

interface AvatarProps {
  seed: string
  name: string
  src?: string
  type?: ChatType
  size?: number
  className?: string
}

export function Avatar({ seed, name, src, type = 'user', size = 48, className }: AvatarProps) {
  const [failed, setFailed] = useState<string | null>(null)
  const showImage = src && failed !== src
  const Icon = type === 'bot' ? Bot : type === 'group' || type === 'channel' ? Users : null

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium text-white select-none',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.36),
        backgroundImage: showImage ? undefined : avatarGradient(seed),
      }}
      aria-hidden="true"
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          className="size-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(src)}
        />
      ) : Icon && !/\p{L}/u.test(name) ? (
        <Icon style={{ width: size * 0.46, height: size * 0.46 }} strokeWidth={1.8} />
      ) : (
        initials(name)
      )}
    </span>
  )
}
