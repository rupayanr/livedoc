import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

function generateColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 70%, 50%)`
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
  const wsUrl = `${WS_URL}/api/v1/ws`

  const provider = new WebsocketProvider(wsUrl, documentId, ydoc, {
    params: { name: userName },
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
