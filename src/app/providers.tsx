import { QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, useState } from 'react'
import { Toaster } from 'sonner'
import { useThemeStore, resolveTheme } from '@/features/theme/theme-store'
import { createQueryClient } from '@/shared/config/query-client'
import { TooltipProvider } from '@/shared/ui/tooltip'

function ThemedToaster() {
  const preference = useThemeStore((state) => state.preference)
  return (
    <Toaster
      theme={resolveTheme(preference)}
      position="top-center"
      toastOptions={{
        classNames: {
          toast: '!rounded-2xl !border-0 !bg-float !text-fg !shadow-float !font-sans',
          description: '!text-fg-tertiary',
        },
      }}
    />
  )
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={400}>
        {children}
        <ThemedToaster />
      </TooltipProvider>
    </QueryClientProvider>
  )
}
