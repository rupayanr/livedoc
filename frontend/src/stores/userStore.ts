import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CurrentUser {
  name: string
  color: string
}

interface UserState {
  currentUser: CurrentUser | null
  setCurrentUser: (user: CurrentUser) => void
  clearCurrentUser: () => void
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
    }
  )
)
