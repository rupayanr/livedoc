import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface CurrentUser {
  name: string
  color: string
}

interface UserState {
  currentUser: CurrentUser | null
  setCurrentUser: (user: CurrentUser) => void
  clearCurrentUser: () => void
}

// Safe localStorage wrapper for private browsing mode (iOS Safari, Android incognito)
const safeStorage = {
  getItem: (name: string): string | null => {
    try {
      return localStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      localStorage.setItem(name, value)
    } catch {
      // Silent fail for private browsing
    }
  },
  removeItem: (name: string): void => {
    try {
      localStorage.removeItem(name)
    } catch {
      // Silent fail
    }
  },
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),
      clearCurrentUser: () => set({ currentUser: null }),
    }),
    {
      name: 'livedoc-user-v2',
      storage: createJSONStorage(() => safeStorage),
    }
  )
)
