import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WebSocketClient, createWebSocketUrl } from './websocket'

describe('WebSocketClient', () => {
  let mockWsInstance: {
    readyState: number
    url: string
    onopen: ((event: Event) => void) | null
    onclose: ((event: CloseEvent) => void) | null
    onerror: ((event: Event) => void) | null
    onmessage: ((event: MessageEvent) => void) | null
    send: ReturnType<typeof vi.fn>
    close: ReturnType<typeof vi.fn>
    simulateOpen: () => void
    simulateClose: () => void
    simulateMessage: (data: string) => void
    simulateError: () => void
  }

  let wsConstructorCalls: string[] = []

  beforeEach(() => {
    vi.useFakeTimers()
    wsConstructorCalls = []

    // Create fresh mock instance for each test
    mockWsInstance = {
      readyState: 0, // CONNECTING
      url: '',
      onopen: null,
      onclose: null,
      onerror: null,
      onmessage: null,
      send: vi.fn(),
      close: vi.fn(function(this: typeof mockWsInstance) {
        this.readyState = 3 // CLOSED
      }),
      simulateOpen() {
        this.readyState = 1 // OPEN
        if (this.onopen) {
          this.onopen(new Event('open'))
        }
      },
      simulateClose() {
        this.readyState = 3 // CLOSED
        if (this.onclose) {
          this.onclose(new CloseEvent('close'))
        }
      },
      simulateMessage(data: string) {
        if (this.onmessage) {
          this.onmessage(new MessageEvent('message', { data }))
        }
      },
      simulateError() {
        if (this.onerror) {
          this.onerror(new Event('error'))
        }
      },
    }

    // Mock WebSocket constructor
    global.WebSocket = vi.fn().mockImplementation((url: string) => {
      wsConstructorCalls.push(url)
      mockWsInstance.url = url
      mockWsInstance.readyState = 0 // Reset to CONNECTING
      return mockWsInstance
    }) as unknown as typeof WebSocket

    // Define static properties
    Object.defineProperty(global.WebSocket, 'CONNECTING', { value: 0 })
    Object.defineProperty(global.WebSocket, 'OPEN', { value: 1 })
    Object.defineProperty(global.WebSocket, 'CLOSING', { value: 2 })
    Object.defineProperty(global.WebSocket, 'CLOSED', { value: 3 })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('connect', () => {
    it('should create WebSocket connection', () => {
      const client = new WebSocketClient('ws://localhost:8000/test')
      client.connect()

      expect(wsConstructorCalls).toContain('ws://localhost:8000/test')
    })

    it('should not create duplicate connections', () => {
      const client = new WebSocketClient('ws://localhost:8000/test')
      client.connect()
      mockWsInstance.simulateOpen()
      client.connect()

      expect(wsConstructorCalls).toHaveLength(1)
    })

    it('should notify handlers on connect', () => {
      const client = new WebSocketClient('ws://localhost:8000/test')
      const handler = vi.fn()

      client.subscribe(handler)
      client.connect()
      mockWsInstance.simulateOpen()

      expect(handler).toHaveBeenCalledWith({ type: 'connected', payload: null })
    })

    it('should notify handlers on disconnect', () => {
      const client = new WebSocketClient('ws://localhost:8000/test')
      const handler = vi.fn()

      client.subscribe(handler)
      client.connect()
      mockWsInstance.simulateOpen()
      mockWsInstance.simulateClose()

      expect(handler).toHaveBeenCalledWith({ type: 'disconnected', payload: null })
    })

    it('should notify handlers on error', () => {
      const client = new WebSocketClient('ws://localhost:8000/test')
      const handler = vi.fn()

      client.subscribe(handler)
      client.connect()
      mockWsInstance.simulateError()

      expect(handler).toHaveBeenCalledWith({
        type: 'error',
        payload: { message: 'WebSocket error' },
      })
    })
  })

  describe('disconnect', () => {
    it('should close WebSocket connection', () => {
      const client = new WebSocketClient('ws://localhost:8000/test')
      client.connect()
      mockWsInstance.simulateOpen()
      client.disconnect()

      expect(mockWsInstance.close).toHaveBeenCalled()
    })

    it('should prevent reconnection after disconnect', () => {
      const client = new WebSocketClient('ws://localhost:8000/test')
      client.connect()
      mockWsInstance.simulateOpen()
      client.disconnect()
      mockWsInstance.simulateClose()

      const callsBefore = wsConstructorCalls.length
      vi.advanceTimersByTime(60000)

      expect(wsConstructorCalls.length).toBe(callsBefore)
    })
  })

  describe('send', () => {
    it('should send JSON message when connected', () => {
      const client = new WebSocketClient('ws://localhost:8000/test')
      client.connect()
      mockWsInstance.simulateOpen()

      const message = { type: 'cursor', payload: { line: 1, ch: 5 } }
      client.send(message)

      expect(mockWsInstance.send).toHaveBeenCalledWith(JSON.stringify(message))
    })

    it('should not send when disconnected', () => {
      const client = new WebSocketClient('ws://localhost:8000/test')
      client.connect()
      // Don't open

      client.send({ type: 'test', payload: null })

      expect(mockWsInstance.send).not.toHaveBeenCalled()
    })
  })

  describe('subscribe', () => {
    it('should add handler', () => {
      const client = new WebSocketClient('ws://localhost:8000/test')
      const handler = vi.fn()

      client.subscribe(handler)
      client.connect()
      mockWsInstance.simulateOpen()

      expect(handler).toHaveBeenCalled()
    })

    it('should return unsubscribe function', () => {
      const client = new WebSocketClient('ws://localhost:8000/test')
      const handler = vi.fn()

      const unsubscribe = client.subscribe(handler)
      client.connect()
      mockWsInstance.simulateOpen()
      handler.mockClear()

      unsubscribe()
      mockWsInstance.simulateMessage(JSON.stringify({ type: 'test', payload: {} }))

      expect(handler).not.toHaveBeenCalled()
    })

    it('should support multiple handlers', () => {
      const client = new WebSocketClient('ws://localhost:8000/test')
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      client.subscribe(handler1)
      client.subscribe(handler2)
      client.connect()
      mockWsInstance.simulateOpen()

      expect(handler1).toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
    })
  })

  describe('message handling', () => {
    it('should parse JSON messages', () => {
      const client = new WebSocketClient('ws://localhost:8000/test')
      const handler = vi.fn()

      client.subscribe(handler)
      client.connect()
      mockWsInstance.simulateOpen()
      handler.mockClear()

      const message = { type: 'user_joined', payload: { id: '1', name: 'Test' } }
      mockWsInstance.simulateMessage(JSON.stringify(message))

      expect(handler).toHaveBeenCalledWith(message)
    })

    it('should ignore non-JSON messages (binary Y.js data)', () => {
      const client = new WebSocketClient('ws://localhost:8000/test')
      const handler = vi.fn()

      client.subscribe(handler)
      client.connect()
      mockWsInstance.simulateOpen()
      handler.mockClear()

      mockWsInstance.simulateMessage('not valid json')

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('reconnection', () => {
    it('should attempt reconnect on close', () => {
      const client = new WebSocketClient('ws://localhost:8000/test')
      client.connect()
      mockWsInstance.simulateOpen()
      mockWsInstance.simulateClose()

      vi.advanceTimersByTime(1000)

      expect(wsConstructorCalls.length).toBe(2)
    })

    it('should use exponential backoff', () => {
      const client = new WebSocketClient('ws://localhost:8000/test')
      client.connect()
      mockWsInstance.simulateClose()

      // 1st reconnect: 1 second
      vi.advanceTimersByTime(1000)
      expect(wsConstructorCalls.length).toBe(2)
      mockWsInstance.simulateClose()

      // 2nd reconnect: 2 seconds
      vi.advanceTimersByTime(2000)
      expect(wsConstructorCalls.length).toBe(3)
      mockWsInstance.simulateClose()

      // 3rd reconnect: 4 seconds
      vi.advanceTimersByTime(4000)
      expect(wsConstructorCalls.length).toBe(4)
    })

    it('should reset reconnect attempts on successful connection', () => {
      const client = new WebSocketClient('ws://localhost:8000/test')
      client.connect()

      // Fail a few times
      mockWsInstance.simulateClose()
      vi.advanceTimersByTime(1000)
      mockWsInstance.simulateClose()
      vi.advanceTimersByTime(2000)

      // Successfully connect
      mockWsInstance.simulateOpen()

      // Then disconnect again
      mockWsInstance.simulateClose()

      // Should start from 1 second again (reset)
      vi.advanceTimersByTime(1000)

      expect(wsConstructorCalls.length).toBeGreaterThan(3)
    })
  })
})

describe('createWebSocketUrl', () => {
  it('should create URL with document ID and user name', () => {
    const url = createWebSocketUrl('doc-123', 'Alice')

    expect(url).toContain('/api/v1/ws/doc-123')
    expect(url).toContain('name=Alice')
  })

  it('should encode special characters in user name', () => {
    const url = createWebSocketUrl('doc-123', 'Alice & Bob')

    expect(url).toContain('name=Alice%20%26%20Bob')
  })

  it('should use default WebSocket URL if not configured', () => {
    const url = createWebSocketUrl('doc-123', 'Test')

    // Default URL pattern includes /api/v1/ws/ path and name parameter
    expect(url).toContain('/api/v1/ws/doc-123')
    expect(url).toContain('name=Test')
  })
})
