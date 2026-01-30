import { describe, it, expect, beforeEach } from 'vitest'
import { useDocumentStore } from './documentStore'
import type { User, CursorUpdate, DocumentListItem } from '../types'

describe('documentStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useDocumentStore.getState().reset()
  })

  describe('initial state', () => {
    it('should have empty documents array', () => {
      const state = useDocumentStore.getState()
      expect(state.documents).toEqual([])
    })

    it('should have disconnected status', () => {
      const state = useDocumentStore.getState()
      expect(state.connectionStatus).toBe('disconnected')
    })

    it('should have no current document', () => {
      const state = useDocumentStore.getState()
      expect(state.currentDocumentId).toBeNull()
      expect(state.currentDocumentTitle).toBe('Untitled')
    })

    it('should have empty users array', () => {
      const state = useDocumentStore.getState()
      expect(state.users).toEqual([])
    })

    it('should have empty cursors map', () => {
      const state = useDocumentStore.getState()
      expect(state.cursors.size).toBe(0)
    })
  })

  describe('setDocuments', () => {
    it('should set documents list', () => {
      const docs: DocumentListItem[] = [
        { id: '1', title: 'Doc 1', updatedAt: '2025-01-01' },
        { id: '2', title: 'Doc 2', updatedAt: '2025-01-02' },
      ]

      useDocumentStore.getState().setDocuments(docs)
      expect(useDocumentStore.getState().documents).toEqual(docs)
    })

    it('should replace existing documents', () => {
      const docs1: DocumentListItem[] = [{ id: '1', title: 'Doc 1', updatedAt: '2025-01-01' }]
      const docs2: DocumentListItem[] = [{ id: '2', title: 'Doc 2', updatedAt: '2025-01-02' }]

      useDocumentStore.getState().setDocuments(docs1)
      useDocumentStore.getState().setDocuments(docs2)

      expect(useDocumentStore.getState().documents).toEqual(docs2)
    })
  })

  describe('setIsLoadingDocuments', () => {
    it('should set loading state to true', () => {
      useDocumentStore.getState().setIsLoadingDocuments(true)
      expect(useDocumentStore.getState().isLoadingDocuments).toBe(true)
    })

    it('should set loading state to false', () => {
      useDocumentStore.getState().setIsLoadingDocuments(true)
      useDocumentStore.getState().setIsLoadingDocuments(false)
      expect(useDocumentStore.getState().isLoadingDocuments).toBe(false)
    })
  })

  describe('setCurrentDocument', () => {
    it('should set current document id and title', () => {
      useDocumentStore.getState().setCurrentDocument('doc-123', 'My Document')

      const state = useDocumentStore.getState()
      expect(state.currentDocumentId).toBe('doc-123')
      expect(state.currentDocumentTitle).toBe('My Document')
    })

    it('should use default title if not provided', () => {
      useDocumentStore.getState().setCurrentDocument('doc-123')

      expect(useDocumentStore.getState().currentDocumentTitle).toBe('Untitled')
    })

    it('should set null document id', () => {
      useDocumentStore.getState().setCurrentDocument('doc-123', 'Test')
      useDocumentStore.getState().setCurrentDocument(null)

      expect(useDocumentStore.getState().currentDocumentId).toBeNull()
    })
  })

  describe('setConnectionStatus', () => {
    it('should set connecting status', () => {
      useDocumentStore.getState().setConnectionStatus('connecting')
      expect(useDocumentStore.getState().connectionStatus).toBe('connecting')
    })

    it('should set connected status', () => {
      useDocumentStore.getState().setConnectionStatus('connected')
      expect(useDocumentStore.getState().connectionStatus).toBe('connected')
    })

    it('should set disconnected status', () => {
      useDocumentStore.getState().setConnectionStatus('connected')
      useDocumentStore.getState().setConnectionStatus('disconnected')
      expect(useDocumentStore.getState().connectionStatus).toBe('disconnected')
    })
  })

  describe('users management', () => {
    const user1: User = { id: 'u1', name: 'Alice', color: '#ff0000' }
    const user2: User = { id: 'u2', name: 'Bob', color: '#00ff00' }

    describe('setUsers', () => {
      it('should set users array', () => {
        useDocumentStore.getState().setUsers([user1, user2])
        expect(useDocumentStore.getState().users).toEqual([user1, user2])
      })

      it('should replace existing users', () => {
        useDocumentStore.getState().setUsers([user1])
        useDocumentStore.getState().setUsers([user2])
        expect(useDocumentStore.getState().users).toEqual([user2])
      })
    })

    describe('addUser', () => {
      it('should add new user', () => {
        useDocumentStore.getState().addUser(user1)
        expect(useDocumentStore.getState().users).toContainEqual(user1)
      })

      it('should replace user with same id', () => {
        const updatedUser1 = { ...user1, name: 'Alice Updated' }

        useDocumentStore.getState().addUser(user1)
        useDocumentStore.getState().addUser(updatedUser1)

        const users = useDocumentStore.getState().users
        expect(users).toHaveLength(1)
        expect(users[0].name).toBe('Alice Updated')
      })

      it('should keep existing users when adding new one', () => {
        useDocumentStore.getState().addUser(user1)
        useDocumentStore.getState().addUser(user2)

        expect(useDocumentStore.getState().users).toHaveLength(2)
      })
    })

    describe('removeUser', () => {
      it('should remove user by id', () => {
        useDocumentStore.getState().setUsers([user1, user2])
        useDocumentStore.getState().removeUser('u1')

        const users = useDocumentStore.getState().users
        expect(users).toHaveLength(1)
        expect(users[0].id).toBe('u2')
      })

      it('should handle removing non-existent user', () => {
        useDocumentStore.getState().setUsers([user1])
        useDocumentStore.getState().removeUser('non-existent')

        expect(useDocumentStore.getState().users).toHaveLength(1)
      })
    })
  })

  describe('cursors management', () => {
    const cursor1: CursorUpdate = {
      userId: 'u1',
      name: 'Alice',
      color: '#ff0000',
      position: { line: 1, ch: 5 },
    }
    const cursor2: CursorUpdate = {
      userId: 'u2',
      name: 'Bob',
      color: '#00ff00',
      position: { line: 10, ch: 20 },
    }

    describe('updateCursor', () => {
      it('should add new cursor', () => {
        useDocumentStore.getState().updateCursor(cursor1)

        const cursors = useDocumentStore.getState().cursors
        expect(cursors.get('u1')).toEqual(cursor1)
      })

      it('should update existing cursor', () => {
        const updatedCursor = { ...cursor1, position: { line: 5, ch: 10 } }

        useDocumentStore.getState().updateCursor(cursor1)
        useDocumentStore.getState().updateCursor(updatedCursor)

        const cursors = useDocumentStore.getState().cursors
        expect(cursors.get('u1')?.position).toEqual({ line: 5, ch: 10 })
      })

      it('should maintain multiple cursors', () => {
        useDocumentStore.getState().updateCursor(cursor1)
        useDocumentStore.getState().updateCursor(cursor2)

        expect(useDocumentStore.getState().cursors.size).toBe(2)
      })
    })

    describe('removeCursor', () => {
      it('should remove cursor by userId', () => {
        useDocumentStore.getState().updateCursor(cursor1)
        useDocumentStore.getState().updateCursor(cursor2)
        useDocumentStore.getState().removeCursor('u1')

        const cursors = useDocumentStore.getState().cursors
        expect(cursors.size).toBe(1)
        expect(cursors.has('u1')).toBe(false)
        expect(cursors.has('u2')).toBe(true)
      })

      it('should handle removing non-existent cursor', () => {
        useDocumentStore.getState().updateCursor(cursor1)
        useDocumentStore.getState().removeCursor('non-existent')

        expect(useDocumentStore.getState().cursors.size).toBe(1)
      })
    })
  })

  describe('setContent', () => {
    it('should set content', () => {
      useDocumentStore.getState().setContent('# Hello World')
      expect(useDocumentStore.getState().content).toBe('# Hello World')
    })

    it('should replace existing content', () => {
      useDocumentStore.getState().setContent('First')
      useDocumentStore.getState().setContent('Second')
      expect(useDocumentStore.getState().content).toBe('Second')
    })
  })

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      // Set various state
      useDocumentStore.getState().setDocuments([{ id: '1', title: 'Test', updatedAt: '' }])
      useDocumentStore.getState().setConnectionStatus('connected')
      useDocumentStore.getState().setCurrentDocument('123', 'Test Doc')
      useDocumentStore.getState().addUser({ id: 'u1', name: 'Test', color: '#fff' })
      useDocumentStore.getState().updateCursor({
        userId: 'u1',
        name: 'Test',
        color: '#fff',
        position: { line: 1, ch: 1 },
      })
      useDocumentStore.getState().setContent('Test content')

      // Reset
      useDocumentStore.getState().reset()

      // Verify reset
      const state = useDocumentStore.getState()
      expect(state.documents).toEqual([])
      expect(state.connectionStatus).toBe('disconnected')
      expect(state.currentDocumentId).toBeNull()
      expect(state.users).toEqual([])
      expect(state.cursors.size).toBe(0)
      expect(state.content).toBe('')
    })
  })
})
