import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithRouter } from '../../test/test-utils'
import { DocumentList } from './DocumentList'
import { useDocumentList } from '../../hooks/useDocument'

// Mock the hook
vi.mock('../../hooks/useDocument', () => ({
  useDocumentList: vi.fn(),
}))

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  },
  Toaster: () => null,
  toast: vi.fn(),
}))

const mockUseDocumentList = vi.mocked(useDocumentList)

describe('DocumentList', () => {
  const mockCreateDocument = vi.fn()
  const mockDeleteDocument = vi.fn()
  const mockRefetch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseDocumentList.mockReturnValue({
      documents: [],
      isLoading: false,
      error: null,
      createDocument: mockCreateDocument,
      deleteDocument: mockDeleteDocument,
      refetch: mockRefetch,
    })
  })

  describe('rendering', () => {
    it('should render title and description', () => {
      renderWithRouter(<DocumentList />)

      expect(screen.getByText('LiveDoc')).toBeInTheDocument()
      expect(screen.getByText('Real-time collaborative markdown editor')).toBeInTheDocument()
    })

    it('should render "New Document" button', () => {
      renderWithRouter(<DocumentList />)

      expect(screen.getByRole('button', { name: /new document/i })).toBeInTheDocument()
    })

    it('should render loading state', () => {
      mockUseDocumentList.mockReturnValue({
        documents: [],
        isLoading: true,
        error: null,
        createDocument: mockCreateDocument,
        deleteDocument: mockDeleteDocument,
        refetch: mockRefetch,
      })

      renderWithRouter(<DocumentList />)

      expect(screen.getByText('Loading documents...')).toBeInTheDocument()
    })

    it('should render error state', () => {
      mockUseDocumentList.mockReturnValue({
        documents: [],
        isLoading: false,
        error: 'Failed to load documents',
        createDocument: mockCreateDocument,
        deleteDocument: mockDeleteDocument,
        refetch: mockRefetch,
      })

      renderWithRouter(<DocumentList />)

      expect(screen.getByText('Failed to load documents')).toBeInTheDocument()
    })

    it('should render empty state', () => {
      renderWithRouter(<DocumentList />)

      expect(screen.getByText('No documents yet')).toBeInTheDocument()
      expect(screen.getByText('Create your first document')).toBeInTheDocument()
    })

    it('should render document list', () => {
      const documents = [
        { id: '1', title: 'First Document', updatedAt: '2025-01-15T10:30:00Z' },
        { id: '2', title: 'Second Document', updatedAt: '2025-01-16T14:45:00Z' },
      ]

      mockUseDocumentList.mockReturnValue({
        documents,
        isLoading: false,
        error: null,
        createDocument: mockCreateDocument,
        deleteDocument: mockDeleteDocument,
        refetch: mockRefetch,
      })

      renderWithRouter(<DocumentList />)

      expect(screen.getByText('First Document')).toBeInTheDocument()
      expect(screen.getByText('Second Document')).toBeInTheDocument()
    })

    it('should format dates correctly', () => {
      const documents = [
        { id: '1', title: 'Test Doc', updatedAt: '2025-01-15T10:30:00Z' },
      ]

      mockUseDocumentList.mockReturnValue({
        documents,
        isLoading: false,
        error: null,
        createDocument: mockCreateDocument,
        deleteDocument: mockDeleteDocument,
        refetch: mockRefetch,
      })

      renderWithRouter(<DocumentList />)

      // Should show formatted date
      expect(screen.getByText(/last edited/i)).toBeInTheDocument()
    })
  })

  describe('create document', () => {
    it('should call createDocument when clicking New Document button', async () => {
      const user = userEvent.setup()
      mockCreateDocument.mockResolvedValue({ id: 'new-123', title: 'Untitled' })

      renderWithRouter(<DocumentList />)

      await user.click(screen.getByRole('button', { name: /new document/i }))

      expect(mockCreateDocument).toHaveBeenCalled()
    })

    it('should call createDocument when clicking empty state button', async () => {
      const user = userEvent.setup()
      mockCreateDocument.mockResolvedValue({ id: 'new-123', title: 'Untitled' })

      renderWithRouter(<DocumentList />)

      await user.click(screen.getByText('Create your first document'))

      expect(mockCreateDocument).toHaveBeenCalled()
    })
  })

  describe('document navigation', () => {
    it('should render architecture link', () => {
      renderWithRouter(<DocumentList />)

      const link = screen.getByText(/view architecture/i)
      expect(link).toBeInTheDocument()
      expect(link.closest('a')).toHaveAttribute('href', '/architecture')
    })
  })

  describe('delete document', () => {
    it('should have delete buttons for each document', () => {
      const documents = [
        { id: '1', title: 'First Document', updatedAt: '2025-01-15T10:30:00Z' },
        { id: '2', title: 'Second Document', updatedAt: '2025-01-16T14:45:00Z' },
      ]

      mockUseDocumentList.mockReturnValue({
        documents,
        isLoading: false,
        error: null,
        createDocument: mockCreateDocument,
        deleteDocument: mockDeleteDocument,
        refetch: mockRefetch,
      })

      renderWithRouter(<DocumentList />)

      const deleteButtons = screen.getAllByTitle('Delete document')
      expect(deleteButtons).toHaveLength(2)
    })
  })
})
