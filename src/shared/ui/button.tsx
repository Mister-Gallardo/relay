import { type VariantProps, cva } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/cn'

const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 font-medium whitespace-nowrap transition-[background-color,color,opacity,transform] duration-150 outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-fg hover:bg-accent-hover active:bg-accent-pressed',
        secondary: 'bg-input text-fg hover:bg-card-hover',
        ghost: 'text-fg-secondary hover:bg-card-hover hover:text-fg',
        link: 'text-accent hover:text-accent-hover active:scale-100',
        danger: 'bg-negative/12 text-negative hover:bg-negative/20',
      },
      size: {
        sm: 'h-8 rounded-[10px] px-3 text-[14px] [&_svg]:size-4',
        md: 'h-10 rounded-xl px-4 text-[15px] [&_svg]:size-[18px]',
        lg: 'h-12 rounded-2xl px-5 text-[16px] [&_svg]:size-5',
        icon: 'size-10 rounded-full [&_svg]:size-[22px]',
        'icon-sm': 'size-8 rounded-full [&_svg]:size-[18px]',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps extends ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Component = asChild ? Slot.Root : 'button'
  return (
    <Component
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
