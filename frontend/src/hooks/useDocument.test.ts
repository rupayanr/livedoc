import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useDocument, useDocumentList } from './useDocument'
import { api } from '../lib/api'
import { useDocumentStore } from '../stores/documentStore'

// Mock the API
vi.mock('../lib/api', () => ({
  api: {
    documents: {
      get: vi.fn(),
      list: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

const mockApi = vi.mocked(api)

describe('useDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useDocumentStore.getState().reset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return null document when no ID provided', () => {
    const { result } = renderHook(() => useDocument(null))

    expect(result.current.document).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should fetch document when ID provided', async () => {
    const mockDoc = {
      id: 'doc-123',
      title: 'Test Doc',
      content: '# Hello',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    }

    mockApi.documents.get.mockResolvedValueOnce(mockDoc)

    const { result } = renderHook(() => useDocument('doc-123'))

    // Initially loading
    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.document).toEqual(mockDoc)
    expect(result.current.error).toBeNull()
    expect(mockApi.documents.get).toHaveBeenCalledWith('doc-123')
  })

  it('should set error on fetch failure', async () => {
    mockApi.documents.get.mockRejectedValueOnce(new Error('Not found'))

    const { result } = renderHook(() => useDocument('doc-123'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.document).toBeNull()
    expect(result.current.error).toBe('Not found')
  })

  it('should update store with current document', async () => {
    const mockDoc = {
      id: 'doc-123',
      title: 'Test Doc',
      content: '',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    }

    mockApi.documents.get.mockResolvedValueOnce(mockDoc)

    renderHook(() => useDocument('doc-123'))

    await waitFor(() => {
      const store = useDocumentStore.getState()
      expect(store.currentDocumentId).toBe('doc-123')
      expect(store.currentDocumentTitle).toBe('Test Doc')
    })
  })

  it('should refetch document', async () => {
    const mockDoc = {
      id: 'doc-123',
      title: 'Test Doc',
      content: '',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    }

    mockApi.documents.get.mockResolvedValue(mockDoc)

    const { result } = renderHook(() => useDocument('doc-123'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Clear mock calls
    mockApi.documents.get.mockClear()

    // Refetch
    await act(async () => {
      await result.current.refetch()
    })

    expect(mockApi.documents.get).toHaveBeenCalledWith('doc-123')
  })

  it('should handle rapid ID changes without stale data', async () => {
    const doc1 = { id: 'doc-1', title: 'Doc 1', content: '', createdAt: '', updatedAt: '' }
    const doc2 = { id: 'doc-2', title: 'Doc 2', content: '', createdAt: '', updatedAt: '' }

    // Make doc1 fetch slow
    mockApi.documents.get.mockImplementation(async (id) => {
      if (id === 'doc-1') {
        await new Promise((resolve) => setTimeout(resolve, 100))
        return doc1
      }
      return doc2
    })

    const { result, rerender } = renderHook(({ id }) => useDocument(id), {
      initialProps: { id: 'doc-1' },
    })

    // Quickly change to doc-2 before doc-1 finishes
    rerender({ id: 'doc-2' })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Should show doc-2, not doc-1 (stale closure fixed)
    expect(result.current.document?.id).toBe('doc-2')
  })

  it('should reset document when ID changes to null', async () => {
    const mockDoc = {
      id: 'doc-123',
      title: 'Test',
      content: '',
      createdAt: '',
      updatedAt: '',
    }

    mockApi.documents.get.mockResolvedValueOnce(mockDoc)

    const { result, rerender } = renderHook(({ id }) => useDocument(id), {
      initialProps: { id: 'doc-123' as string | null },
    })

    await waitFor(() => {
      expect(result.current.document).not.toBeNull()
    })

    rerender({ id: null })

    expect(result.current.document).toBeNull()
  })
})

describe('useDocumentList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useDocumentStore.getState().reset()
  })

  it('should fetch documents on mount', async () => {
    const mockDocs = [
      { id: '1', title: 'Doc 1', updatedAt: '2025-01-01' },
      { id: '2', title: 'Doc 2', updatedAt: '2025-01-02' },
    ]

    mockApi.documents.list.mockResolvedValueOnce(mockDocs)

    const { result } = renderHook(() => useDocumentList())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.documents).toEqual(mockDocs)
  })

  it('should set error on fetch failure', async () => {
    mockApi.documents.list.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useDocumentList())

    await waitFor(() => {
      expect(result.current.error).toBe('Network error')
    })
  })

  it('should create document', async () => {
    const newDoc = {
      id: 'new-123',
      title: 'New Doc',
      content: '',
      createdAt: '',
      updatedAt: '',
    }

    mockApi.documents.list.mockResolvedValue([])
    mockApi.documents.create.mockResolvedValueOnce(newDoc)

    const { result } = renderHook(() => useDocumentList())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    let createdDoc
    await act(async () => {
      createdDoc = await result.current.createDocument('New Doc')
    })

    expect(createdDoc).toEqual(newDoc)
    expect(mockApi.documents.create).toHaveBeenCalledWith('New Doc')
  })

  it('should return null on create failure', async () => {
    mockApi.documents.list.mockResolvedValue([])
    mockApi.documents.create.mockRejectedValueOnce(new Error('Create failed'))

    const { result } = renderHook(() => useDocumentList())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    let createdDoc
    await act(async () => {
      createdDoc = await result.current.createDocument('Test')
    })

    expect(createdDoc).toBeNull()
    expect(result.current.error).toBe('Create failed')
  })

  it('should delete document', async () => {
    mockApi.documents.list.mockResolvedValue([{ id: '1', title: 'Test', updatedAt: '' }])
    mockApi.documents.delete.mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useDocumentList())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    let success
    await act(async () => {
      success = await result.current.deleteDocument('1')
    })

    expect(success).toBe(true)
    expect(mockApi.documents.delete).toHaveBeenCalledWith('1')
  })

  it('should return false on delete failure', async () => {
    mockApi.documents.list.mockResolvedValue([])
    mockApi.documents.delete.mockRejectedValueOnce(new Error('Delete failed'))

    const { result } = renderHook(() => useDocumentList())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    let success
    await act(async () => {
      success = await result.current.deleteDocument('1')
    })

    expect(success).toBe(false)
    expect(result.current.error).toBe('Delete failed')
  })

  it('should refetch documents after create', async () => {
    const initialDocs = [{ id: '1', title: 'Doc 1', updatedAt: '' }]
    const updatedDocs = [
      { id: '1', title: 'Doc 1', updatedAt: '' },
      { id: '2', title: 'Doc 2', updatedAt: '' },
    ]

    mockApi.documents.list
      .mockResolvedValueOnce(initialDocs)
      .mockResolvedValueOnce(updatedDocs)
    mockApi.documents.create.mockResolvedValueOnce({
      id: '2',
      title: 'Doc 2',
      content: '',
      createdAt: '',
      updatedAt: '',
    })

    const { result } = renderHook(() => useDocumentList())

    await waitFor(() => {
      expect(result.current.documents).toHaveLength(1)
    })

    await act(async () => {
      await result.current.createDocument('Doc 2')
    })

    await waitFor(() => {
      expect(result.current.documents).toHaveLength(2)
    })
  })

  it('should refetch documents after delete', async () => {
    const initialDocs = [
      { id: '1', title: 'Doc 1', updatedAt: '' },
      { id: '2', title: 'Doc 2', updatedAt: '' },
    ]
    const updatedDocs = [{ id: '2', title: 'Doc 2', updatedAt: '' }]

    mockApi.documents.list
      .mockResolvedValueOnce(initialDocs)
      .mockResolvedValueOnce(updatedDocs)
    mockApi.documents.delete.mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useDocumentList())

    await waitFor(() => {
      expect(result.current.documents).toHaveLength(2)
    })

    await act(async () => {
      await result.current.deleteDocument('1')
    })

    await waitFor(() => {
      expect(result.current.documents).toHaveLength(1)
    })
  })
})
