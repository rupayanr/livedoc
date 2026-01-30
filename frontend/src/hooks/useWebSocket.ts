import { useCallback, useEffect, useRef } from 'react'
import { createWebSocketUrl, WebSocketClient } from '../lib/websocket'
import { useDocumentStore } from '../stores/documentStore'
import type {
  CursorPayload,
  UserJoinedPayload,
  UserLeftPayload,
  UsersListPayload,
  WebSocketMessage,
} from '../types'

export function useWebSocket(documentId: string | null, userName: string): void {
  const clientRef = useRef<WebSocketClient | null>(null)

  const setUsers = useDocumentStore((s) => s.setUsers)
  const addUser = useDocumentStore((s) => s.addUser)
  const removeUser = useDocumentStore((s) => s.removeUser)
  const updateCursor = useDocumentStore((s) => s.updateCursor)
  const removeCursor = useDocumentStore((s) => s.removeCursor)

  const handleMessage = useCallback(
    (message: WebSocketMessage) => {
      switch (message.type) {
        case 'users_list': {
          const payload = message.payload as UsersListPayload
          setUsers(payload.users)
          break
        }
        case 'user_joined': {
          const payload = message.payload as UserJoinedPayload
          addUser({ id: payload.id, name: payload.name, color: payload.color })
          break
        }
        case 'user_left': {
          const payload = message.payload as UserLeftPayload
          removeUser(payload.id)
          removeCursor(payload.id)
          break
        }
        case 'cursor': {
          const payload = message.payload as CursorPayload
          updateCursor({
            userId: payload.userId,
            name: payload.name,
            color: payload.color,
            position: payload.position,
          })
          break
        }
      }
    },
    [setUsers, addUser, removeUser, updateCursor, removeCursor]
  )

  useEffect(() => {
    if (!documentId || !userName) {
      return
    }

    const url = createWebSocketUrl(documentId, userName)
    const client = new WebSocketClient(url)
    clientRef.current = client

    const unsubscribe = client.subscribe(handleMessage)
    client.connect()

    return () => {
      unsubscribe()
      client.disconnect()
      clientRef.current = null
    }
  }, [documentId, userName, handleMessage])
}
