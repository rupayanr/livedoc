import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { api } from './api'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Helper to create mock response with proper headers
function createMockResponse(options: {
  ok: boolean
  status: number
  statusText?: string
  json?: () => Promise<unknown>
  contentType?: string
}) {
  return {
    ok: options.ok,
    status: options.status,
    statusText: options.statusText || '',
    json: options.json || (async () => ({})),
    headers: {
      get: (name: string) => {
        if (name.toLowerCase() === 'content-type') {
          return options.contentType ?? 'application/json'
        }
        return null
      },
    },
  }
}

describe('api', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('documents.list', () => {
    it('should fetch documents list', async () => {
      const mockDocs = [
        { id: '1', title: 'Doc 1', updatedAt: '2025-01-01' },
        { id: '2', title: 'Doc 2', updatedAt: '2025-01-02' },
      ]

      mockFetch.mockResolvedValueOnce(createMockResponse({
        ok: true,
        status: 200,
        json: async () => mockDocs,
      }))

      const result = await api.documents.list()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/documents'),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      )
      expect(result).toEqual(mockDocs)
    })

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      }))

      await expect(api.documents.list()).rejects.toThrow('API error')
    })
  })

  describe('documents.get', () => {
    it('should fetch single document', async () => {
      const mockDoc = {
        id: '123',
        title: 'Test Doc',
        content: '# Hello',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      mockFetch.mockResolvedValueOnce(createMockResponse({
        ok: true,
        status: 200,
        json: async () => mockDoc,
      }))

      const result = await api.documents.get('123')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/documents/123'),
        expect.anything()
      )
      expect(result).toEqual(mockDoc)
    })

    it('should throw error for non-existent document', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      }))

      await expect(api.documents.get('nonexistent')).rejects.toThrow('API error')
    })
  })

  describe('documents.create', () => {
    it('should create document with title', async () => {
      const mockDoc = {
        id: 'new-123',
        title: 'My New Doc',
        content: '',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      mockFetch.mockResolvedValueOnce(createMockResponse({
        ok: true,
        status: 201,
        json: async () => mockDoc,
      }))

      const result = await api.documents.create('My New Doc')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/documents'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ title: 'My New Doc' }),
        })
      )
      expect(result).toEqual(mockDoc)
    })

    it('should create document with default title', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        ok: true,
        status: 201,
        json: async () => ({ id: '1', title: 'Untitled' }),
      }))

      await api.documents.create()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: JSON.stringify({ title: 'Untitled' }),
        })
      )
    })
  })

  describe('documents.update', () => {
    it('should update document title', async () => {
      const mockDoc = {
        id: '123',
        title: 'Updated Title',
        content: '',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-02',
      }

      mockFetch.mockResolvedValueOnce(createMockResponse({
        ok: true,
        status: 200,
        json: async () => mockDoc,
      }))

      const result = await api.documents.update('123', { title: 'Updated Title' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/documents/123'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ title: 'Updated Title' }),
        })
      )
      expect(result.title).toBe('Updated Title')
    })

    it('should update document content', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        ok: true,
        status: 200,
        json: async () => ({ id: '123', content: '# New Content' }),
      }))

      await api.documents.update('123', { content: '# New Content' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: JSON.stringify({ content: '# New Content' }),
        })
      )
    })
  })

  describe('documents.delete', () => {
    it('should delete document', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        ok: true,
        status: 204,
      }))

      await api.documents.delete('123')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/documents/123'),
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })

    it('should throw error when deleting non-existent document', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      }))

      await expect(api.documents.delete('nonexistent')).rejects.toThrow('API error')
    })
  })

  describe('error handling', () => {
    it('should include status code in error', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      }))

      try {
        await api.documents.get('123')
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('API error')
      }
    })
  })
})
