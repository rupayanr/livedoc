import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { getAuthToken } from './api'

function getWebSocketUrl(): string {
  // Use environment variable if set, otherwise derive from current page URL
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL
  }

  // Dynamically determine WebSocket URL based on current page
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.hostname
  const port = '8000' // Backend port
  return `${protocol}//${host}:${port}`
}

function generateColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 70%, 50%)`
}

/**
 * Detect if running on iOS Safari.
 * BroadcastChannel is not supported on iOS Safari, causing silent sync failures.
 */
function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isIOS = /iPhone|iPad|iPod/.test(ua)
  const isWebKit = /WebKit/.test(ua)
  // Chrome on iOS also reports as WebKit, but we want to disable BC for all iOS
  return isIOS && isWebKit
}

export interface YjsConnection {
  ydoc: Y.Doc
  provider: WebsocketProvider
  ytext: Y.Text
  destroy: () => void
}

export function createYjsConnection(
  documentId: string,
  userName: string,
  userColor?: string
): YjsConnection {
  const ydoc = new Y.Doc()

  // y-websocket appends the room name to the URL, so we use /api/v1/ws
  // and it becomes /api/v1/ws/{documentId}
  const wsUrl = `${getWebSocketUrl()}/api/v1/ws`

  // Build params including optional auth token
  const params: Record<string, string> = { name: userName }
  const token = getAuthToken()
  if (token) {
    params.token = token
  }

  const provider = new WebsocketProvider(wsUrl, documentId, ydoc, {
    params,
    resyncInterval: 5000, // Resync every 5 seconds to catch missed updates
    disableBc: isIOSSafari(), // Disable BroadcastChannel on iOS (not supported in Safari)
    maxBackoffTime: 10000, // 10s max backoff for faster mobile reconnection
  })

  const ytext = ydoc.getText('content')

  // Set user awareness - use provided color or generate from name
  provider.awareness.setLocalStateField('user', {
    name: userName,
    color: userColor || generateColor(userName),
  })

  const destroy = () => {
    provider.destroy()
    ydoc.destroy()
  }

  return { ydoc, provider, ytext, destroy }
}

export function getAwarenessUsers(
  provider: WebsocketProvider
): Array<{ clientId: number; user: { name: string; color: string } }> {
  const states = provider.awareness.getStates()
  const users: Array<{ clientId: number; user: { name: string; color: string } }> = []

  states.forEach((state, clientId) => {
    if (state.user && clientId !== provider.awareness.clientID) {
      users.push({ clientId, user: state.user })
    }
  })

  return users
}
