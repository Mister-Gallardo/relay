import { create } from 'zustand'

interface UiState {
  newChatOpen: boolean
  setNewChatOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>()((set) => ({
  newChatOpen: false,
  setNewChatOpen: (newChatOpen) => set({ newChatOpen }),
}))
