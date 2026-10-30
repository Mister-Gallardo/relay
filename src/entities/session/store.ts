import { create } from 'zustand'
import { type StateStorage, createJSONStorage, persist } from 'zustand/middleware'
import type { Session } from './model'

interface SessionState {
  session: Session | null
  remember: boolean
  signIn: (session: Session, remember: boolean) => void
  signOut: () => void
}

const STORAGE_KEY = 'relay:session'

function safe<T>(read: () => T, fallback: T): T {
  try {
    return read()
  } catch {
    return fallback
  }
}

const rememberAwareStorage: StateStorage = {
  getItem: (name) => safe(() => localStorage.getItem(name) ?? sessionStorage.getItem(name), null),
  setItem: (name, value) =>
    safe(() => {
      const remember = (JSON.parse(value) as { state?: { remember?: boolean } }).state?.remember
      const [target, other] = remember
        ? [localStorage, sessionStorage]
        : [sessionStorage, localStorage]
      target.setItem(name, value)
      other.removeItem(name)
    }, undefined),
  removeItem: (name) =>
    safe(() => {
      localStorage.removeItem(name)
      sessionStorage.removeItem(name)
    }, undefined),
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      session: null,
      remember: true,
      signIn: (session, remember) => set({ session, remember }),
      signOut: () => set({ session: null }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => rememberAwareStorage),
      partialize: ({ session, remember }) => ({
        session: session?.mode === 'demo' ? null : session,
        remember,
      }),
    },
  ),
)
