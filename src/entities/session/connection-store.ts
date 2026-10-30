import { create } from 'zustand'
import type { ConnectionStatus, InstanceState } from '@/gateway/types'

interface ConnectionState {
  status: ConnectionStatus
  instanceState: InstanceState
  setStatus: (status: ConnectionStatus) => void
  setInstanceState: (state: InstanceState) => void
}

export const useConnectionStore = create<ConnectionState>()((set) => ({
  status: 'connecting',
  instanceState: 'unknown',
  setStatus: (status) => set({ status }),
  setInstanceState: (instanceState) => set({ instanceState }),
}))
