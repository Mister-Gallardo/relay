import { useSyncExternalStore } from 'react'

function subscribe(callback: () => void) {
  document.addEventListener('visibilitychange', callback)
  return () => document.removeEventListener('visibilitychange', callback)
}

export function isDocumentVisible(): boolean {
  return typeof document === 'undefined' || document.visibilityState === 'visible'
}

export function useDocumentVisible(): boolean {
  return useSyncExternalStore(subscribe, isDocumentVisible, () => true)
}
