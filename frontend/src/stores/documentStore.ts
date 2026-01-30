import { create } from 'zustand'
import type { ConnectionStatus, CursorUpdate, DocumentListItem, User } from '../types'

interface DocumentState {
  // Document list
  documents: DocumentListItem[]
  isLoadingDocuments: boolean

  // Current document
  currentDocumentId: string | null
  currentDocumentTitle: string

  // Connection
  connectionStatus: ConnectionStatus

  // Users & cursors
  users: User[]
  cursors: Map<string, CursorUpdate>

  // Content (for preview)
  content: string

  // Actions
  setDocuments: (documents: DocumentListItem[]) => void
  setIsLoadingDocuments: (loading: boolean) => void
  setCurrentDocument: (id: string | null, title?: string) => void
  setConnectionStatus: (status: ConnectionStatus) => void
  setUsers: (users: User[]) => void
  addUser: (user: User) => void
  removeUser: (userId: string) => void
  updateCursor: (cursor: CursorUpdate) => void
  removeCursor: (userId: string) => void
  setContent: (content: string) => void
  reset: () => void
}

const initialState = {
  documents: [],
  isLoadingDocuments: false,
  currentDocumentId: null,
  currentDocumentTitle: 'Untitled',
  connectionStatus: 'disconnected' as ConnectionStatus,
  users: [],
  cursors: new Map<string, CursorUpdate>(),
  content: '',
}

export const useDocumentStore = create<DocumentState>((set) => ({
  ...initialState,

  setDocuments: (documents) => set({ documents }),

  setIsLoadingDocuments: (isLoadingDocuments) => set({ isLoadingDocuments }),

  setCurrentDocument: (id, title = 'Untitled') =>
    set({ currentDocumentId: id, currentDocumentTitle: title }),

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

  setUsers: (users) => set({ users }),

  addUser: (user) =>
    set((state) => ({
      users: [...state.users.filter((u) => u.id !== user.id), user],
    })),

  removeUser: (userId) =>
    set((state) => ({
      users: state.users.filter((u) => u.id !== userId),
    })),

  updateCursor: (cursor) =>
    set((state) => {
      const newCursors = new Map(state.cursors)
      newCursors.set(cursor.userId, cursor)
      return { cursors: newCursors }
    }),

  removeCursor: (userId) =>
    set((state) => {
      const newCursors = new Map(state.cursors)
      newCursors.delete(userId)
      return { cursors: newCursors }
    }),

  setContent: (content) => set({ content }),

  reset: () =>
    set({
      ...initialState,
      cursors: new Map(),
    }),
}))
