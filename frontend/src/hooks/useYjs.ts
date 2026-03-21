import { useCallback, useEffect, useRef, useState } from 'react'
import type * as Y from 'yjs'
import type { WebsocketProvider } from 'y-websocket'
import toast from 'react-hot-toast'
import { createYjsConnection, type YjsConnection } from '../lib/yjs'
import { useDocumentStore } from '../stores/documentStore'
import type { User } from '../types'

// Types for WebSocket JSON messages from server
interface WsUserPayload {
  id: string
  name: string
  color: string
}

interface WsUsersListMessage {
  type: 'users_list'
  payload: WsUserPayload[]
}

interface WsUserJoinedMessage {
  type: 'user_joined'
  payload: WsUserPayload
}

interface WsUserLeftMessage {
  type: 'user_left'
  payload: { id: string }
}

type WsJsonMessage = WsUsersListMessage | WsUserJoinedMessage | WsUserLeftMessage

interface UseYjsReturn {
  ytext: Y.Text | null
  provider: WebsocketProvider | null
  isConnected: boolean
  isSynced: boolean
}

export function useYjs(documentId: string | null, userName: string, userColor?: string): UseYjsReturn {
  const connectionRef = useRef<YjsConnection | null>(null)
  const [ytext, setYtext] = useState<Y.Text | null>(null)
  const [provider, setProvider] = useState<WebsocketProvider | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isSynced, setIsSynced] = useState(false)

  const setConnectionStatus = useDocumentStore((s) => s.setConnectionStatus)
  const setContent = useDocumentStore((s) => s.setContent)
  const setUsers = useDocumentStore((s) => s.setUsers)
  const addUser = useDocumentStore((s) => s.addUser)
  const removeUser = useDocumentStore((s) => s.removeUser)

  const wasConnectedRef = useRef(false)

  const handleStatusChange = useCallback(
    (event: { status: string }) => {
      const connected = event.status === 'connected'
      setIsConnected(connected)

      // Don't set 'connected' status yet - wait for sync to complete
      // This prevents mobile showing "connected" before data is synced
      if (!connected) {
        setConnectionStatus('connecting')
        setIsSynced(false)
        if (wasConnectedRef.current) {
          toast.error('Disconnected', { id: 'connection-status' })
        }
      }
    },
    [setConnectionStatus]
  )

  const handleSynced = useCallback(
    (synced: boolean) => {
      setIsSynced(synced)
      if (synced) {
        setConnectionStatus('connected')
        // Show toast only on initial sync
        if (!wasConnectedRef.current) {
          toast.success('Connected and synced', { id: 'connection-status' })
          wasConnectedRef.current = true
        }
      }
    },
    [setConnectionStatus]
  )

  const previousUsersRef = useRef<Map<number, string>>(new Map())

  // Update users from awareness
  const updateUsersFromAwareness = useCallback(
    (provider: WebsocketProvider, changes?: { added: number[]; removed: number[] }) => {
      const states = provider.awareness.getStates()
      const users: User[] = []
      const currentUsers = new Map<number, string>()

      states.forEach((state, clientId) => {
        // Skip our own client
        if (clientId === provider.awareness.clientID) return
        if (state.user) {
          users.push({
            id: String(clientId),
            name: state.user.name || 'Anonymous',
            color: state.user.color || '#888888',
          })
          currentUsers.set(clientId, state.user.name || 'Anonymous')
        }
      })

      // Show toasts for user changes (only after initial load)
      if (changes && wasConnectedRef.current) {
        changes.added.forEach((clientId) => {
          if (clientId !== provider.awareness.clientID) {
            const state = states.get(clientId)
            if (state?.user?.name) {
              toast(`${state.user.name} joined`, { icon: '👋', duration: 2000 })
            }
          }
        })

        changes.removed.forEach((clientId) => {
          const name = previousUsersRef.current.get(clientId)
          if (name) {
            toast(`${name} left`, { icon: '👋', duration: 2000 })
          }
        })
      }

      previousUsersRef.current = currentUsers
      setUsers(users)
    },
    [setUsers]
  )

  useEffect(() => {
    if (!documentId || !userName) {
      return
    }

    setConnectionStatus('connecting')

    const connection = createYjsConnection(documentId, userName, userColor)
    connectionRef.current = connection

    setYtext(connection.ytext)
    setProvider(connection.provider)

    // Listen for connection status
    connection.provider.on('status', handleStatusChange)

    // Listen for Y.js sync completion - this is when data is actually ready
    // CRITICAL: Mobile clients need this to know when sync is complete, not just connected
    connection.provider.on('sync', handleSynced)

    // Listen for awareness changes (users joining/leaving)
    // Handler is defined here and properly cleaned up to prevent memory leaks
    const handleAwarenessChange = (changes: { added: number[]; removed: number[]; updated: number[] }) => {
      updateUsersFromAwareness(connection.provider, changes)
    }
    const awareness = connection.provider.awareness
    awareness.on('change', handleAwarenessChange)

    // Initial users update (no changes object for initial load)
    updateUsersFromAwareness(connection.provider)

    // Handle JSON messages from WebSocket (users_list, user_joined, user_left)
    // This supplements Y.js awareness for users who joined before us
    const handleWsMessage = (event: MessageEvent) => {
      // Skip binary messages (Y.js sync protocol)
      if (typeof event.data !== 'string') return

      try {
        const message = JSON.parse(event.data) as WsJsonMessage

        switch (message.type) {
          case 'users_list':
            // Initial list of users when joining - merge with awareness
            message.payload.forEach((user) => {
              addUser({ id: user.id, name: user.name, color: user.color })
            })
            break
          case 'user_joined':
            // Add new user
            addUser({
              id: message.payload.id,
              name: message.payload.name,
              color: message.payload.color,
            })
            // Show toast if we're already connected
            if (wasConnectedRef.current) {
              toast(`${message.payload.name} joined`, { icon: '👋', duration: 2000 })
            }
            break
          case 'user_left':
            // Remove user - toast is handled by awareness change
            removeUser(message.payload.id)
            break
        }
      } catch {
        // Not valid JSON, ignore (might be other message types)
      }
    }

    // Set up WebSocket message listener
    // The y-websocket provider exposes the WebSocket via the ws property
    // We need to reattach when WebSocket reconnects
    let currentWs: WebSocket | null = null

    const attachWsListener = () => {
      const ws = connection.provider.ws
      if (ws && ws !== currentWs) {
        if (currentWs) {
          currentWs.removeEventListener('message', handleWsMessage)
        }
        currentWs = ws
        ws.addEventListener('message', handleWsMessage)
      }
    }

    // Attach initially and on status changes
    attachWsListener()
    const handleStatusForWs = () => attachWsListener()
    connection.provider.on('status', handleStatusForWs)

    // Sync content to store for preview (with debouncing)
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const DEBOUNCE_MS = 100 // Debounce content updates for better performance

    const updateContent = () => {
      // Cancel any pending update
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      // Schedule debounced update
      debounceTimer = setTimeout(() => {
        setContent(connection.ytext.toString())
      }, DEBOUNCE_MS)
    }

    // Immediate update for initial content
    setContent(connection.ytext.toString())
    connection.ytext.observe(updateContent)

    // Mobile reconnection handlers - force reconnect when app comes back to foreground
    // On mobile, WebSocket can appear connected but be stale, so we force a full reconnect cycle
    let lastHiddenTime = 0
    const STALE_THRESHOLD_MS = 5000 // Consider connection stale after 5s in background

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        lastHiddenTime = Date.now()
      } else if (document.visibilityState === 'visible') {
        const timeInBackground = Date.now() - lastHiddenTime
        // Force reconnect if we were in background for more than threshold
        // This handles stale connections that still report as connected
        if (timeInBackground > STALE_THRESHOLD_MS) {
          // Reset sync state before reconnect - ensures UI shows "connecting" state
          setIsSynced(false)
          setConnectionStatus('connecting')
          connection.provider.disconnect()
          // Small delay to ensure clean disconnect before reconnecting
          setTimeout(() => connection.provider.connect(), 100)
        } else if (!connection.provider.wsconnected) {
          connection.provider.connect()
        }
      }
    }

    const handleOnline = () => {
      // Force reconnect when coming back online
      setIsSynced(false)
      setConnectionStatus('connecting')
      connection.provider.disconnect()
      setTimeout(() => connection.provider.connect(), 100)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)

    return () => {
      // Clear debounce timer
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      // Clean up WebSocket listener
      if (currentWs) {
        currentWs.removeEventListener('message', handleWsMessage)
      }
      connection.provider.off('status', handleStatusForWs)
      connection.provider.off('status', handleStatusChange)
      connection.provider.off('sync', handleSynced)
      awareness.off('change', handleAwarenessChange)
      connection.ytext.unobserve(updateContent)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      connection.destroy()
      connectionRef.current = null
      wasConnectedRef.current = false
      previousUsersRef.current = new Map()
      setYtext(null)
      setProvider(null)
      setIsConnected(false)
      setIsSynced(false)
      setConnectionStatus('disconnected')
      setUsers([])
    }
  }, [documentId, userName, userColor, handleStatusChange, handleSynced, setConnectionStatus, setContent, setUsers, addUser, removeUser, updateUsersFromAwareness])

  return { ytext, provider, isConnected, isSynced }
}
