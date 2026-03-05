import { useCallback, useEffect, useRef, useState } from 'react'
import type * as Y from 'yjs'
import type { WebsocketProvider } from 'y-websocket'
import toast from 'react-hot-toast'
import { createYjsConnection, type YjsConnection } from '../lib/yjs'
import { useDocumentStore } from '../stores/documentStore'
import type { User } from '../types'

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

    // Sync content to store for preview
    const updateContent = () => {
      setContent(connection.ytext.toString())
    }

    connection.ytext.observe(updateContent)
    updateContent()

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
  }, [documentId, userName, userColor, handleStatusChange, handleSynced, setConnectionStatus, setContent, setUsers, updateUsersFromAwareness])

  return { ytext, provider, isConnected, isSynced }
}
