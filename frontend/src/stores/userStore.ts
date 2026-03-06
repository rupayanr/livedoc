import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { api, getAuthToken, clearAuthToken } from '../lib/api'

interface CurrentUser {
  name: string
  color: string
}

interface UserState {
  currentUser: CurrentUser | null
  isAuthenticated: boolean
  setCurrentUser: (user: CurrentUser) => void
  clearCurrentUser: () => void
  login: (name: string, color: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => void
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
      isAuthenticated: false,
      setCurrentUser: (user) => set({ currentUser: user }),
      clearCurrentUser: () => {
        clearAuthToken()
        set({ currentUser: null, isAuthenticated: false })
      },
      login: async (name: string, color: string) => {
        await api.auth.login(name)
        set({ currentUser: { name, color }, isAuthenticated: true })
      },
      logout: async () => {
        await api.auth.logout()
        set({ currentUser: null, isAuthenticated: false })
      },
      checkAuth: () => {
        const hasToken = getAuthToken() !== null
        set({ isAuthenticated: hasToken })
      },
    }),
    {
      name: 'livedoc-user-v2',
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({ currentUser: state.currentUser }),
      onRehydrateStorage: () => (state) => {
        // Check auth status after rehydration
        if (state) {
          state.checkAuth()
        }
      },
    }
  )
)
