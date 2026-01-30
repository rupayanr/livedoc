import type { WebSocketMessage } from '../types'

export type MessageHandler = (message: WebSocketMessage) => void

export class WebSocketClient {
  private ws: WebSocket | null = null
  private url: string
  private handlers: Set<MessageHandler> = new Set()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private maxReconnectDelay = 30000 // Cap at 30 seconds

  constructor(url: string) {
    this.url = url
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      this.notifyHandlers({ type: 'connected', payload: null })
    }

    this.ws.onclose = () => {
      this.notifyHandlers({ type: 'disconnected', payload: null })
      this.attemptReconnect()
    }

    this.ws.onerror = () => {
      this.notifyHandlers({ type: 'error', payload: { message: 'WebSocket error' } })
    }

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage
        this.notifyHandlers(message)
      } catch {
        // Binary message from Y.js, handled separately
      }
    }
  }

  disconnect(): void {
    this.reconnectAttempts = this.maxReconnectAttempts // Prevent reconnect
    this.ws?.close()
    this.ws = null
  }

  send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  private notifyHandlers(message: WebSocketMessage): void {
    this.handlers.forEach((handler) => handler(message))
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return
    }

    this.reconnectAttempts++
    // Exponential backoff with max delay cap
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    )

    setTimeout(() => {
      this.connect()
    }, delay)
  }
}

export function createWebSocketUrl(documentId: string, userName: string): string {
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'
  return `${wsUrl}/api/v1/ws/${documentId}?name=${encodeURIComponent(userName)}`
}
