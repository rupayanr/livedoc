export interface Document {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface DocumentListItem {
  id: string
  title: string
  updatedAt: string
}

export interface User {
  id: string
  name: string
  color: string
}

export interface CursorPosition {
  line: number
  ch: number
}

export interface CursorUpdate {
  userId: string
  name: string
  color: string
  position: CursorPosition | null
}

export interface WebSocketMessage {
  type: string
  payload: unknown
}

export interface UserJoinedPayload {
  id: string
  name: string
  color: string
}

export interface UserLeftPayload {
  id: string
}

export interface UsersListPayload {
  users: User[]
}

export interface CursorPayload {
  userId: string
  name: string
  color: string
  position: CursorPosition
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

// Version History Types
export interface Version {
  id: string
  versionNumber: number
  title: string
  content: string
  createdBy: string | null
  snapshotType: 'auto' | 'manual'
  createdAt: string
}

export interface VersionListItem {
  id: string
  versionNumber: number
  title: string
  createdBy: string | null
  snapshotType: 'auto' | 'manual'
  createdAt: string
  contentPreview: string
}
