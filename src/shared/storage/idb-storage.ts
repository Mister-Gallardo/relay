import { del, get, set } from 'idb-keyval'
import type { StateStorage } from 'zustand/middleware'

const memory = new Map<string, string>()
let available = typeof indexedDB !== 'undefined'

export const idbStorage: StateStorage = {
  async getItem(name) {
    if (!available) return memory.get(name) ?? null
    try {
      return (await get<string>(name)) ?? null
    } catch {
      available = false
      return memory.get(name) ?? null
    }
  },
  async setItem(name, value) {
    memory.set(name, value)
    if (!available) return
    try {
      await set(name, value)
    } catch {
      available = false
    }
  },
  async removeItem(name) {
    memory.delete(name)
    if (!available) return
    try {
      await del(name)
    } catch {
      available = false
    }
  },
}
