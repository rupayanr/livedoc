import { describe, it, expect, beforeEach } from 'vitest'
import { useUserStore } from './userStore'

describe('userStore', () => {
  beforeEach(() => {
    useUserStore.setState({ currentUser: null })
  })

  describe('initial state', () => {
    it('should have null currentUser initially', () => {
      useUserStore.setState({ currentUser: null })
      const state = useUserStore.getState()
      expect(state.currentUser).toBeNull()
    })
  })

  describe('setCurrentUser', () => {
    it('should set current user', () => {
      const user = { name: 'Alice', color: '#ff0000' }
      useUserStore.getState().setCurrentUser(user)

      expect(useUserStore.getState().currentUser).toEqual(user)
    })

    it('should replace existing user', () => {
      useUserStore.getState().setCurrentUser({ name: 'Alice', color: '#ff0000' })
      useUserStore.getState().setCurrentUser({ name: 'Bob', color: '#00ff00' })

      const user = useUserStore.getState().currentUser
      expect(user?.name).toBe('Bob')
      expect(user?.color).toBe('#00ff00')
    })
  })

  describe('clearCurrentUser', () => {
    it('should clear current user', () => {
      useUserStore.getState().setCurrentUser({ name: 'Alice', color: '#ff0000' })
      useUserStore.getState().clearCurrentUser()

      expect(useUserStore.getState().currentUser).toBeNull()
    })

    it('should handle clearing when already null', () => {
      useUserStore.getState().clearCurrentUser()
      expect(useUserStore.getState().currentUser).toBeNull()
    })
  })

  describe('store structure', () => {
    it('should have required methods', () => {
      const state = useUserStore.getState()
      expect(typeof state.setCurrentUser).toBe('function')
      expect(typeof state.clearCurrentUser).toBe('function')
    })
  })
})
