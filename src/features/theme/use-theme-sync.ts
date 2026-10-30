import { useEffect } from 'react'
import { applyTheme, resolveTheme, useThemeStore, watchSystemTheme } from './theme-store'

export function useThemeSync() {
  const preference = useThemeStore((state) => state.preference)

  useEffect(() => {
    applyTheme(resolveTheme(preference))
    if (preference !== 'system') return
    return watchSystemTheme(() => applyTheme(resolveTheme('system')))
  }, [preference])
}
