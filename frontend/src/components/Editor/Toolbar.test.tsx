import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithRouter } from '../../test/test-utils'
import { Toolbar } from './Toolbar'
import { useDocumentStore } from '../../stores/documentStore'
import { useUserStore } from '../../stores/userStore'
import { api } from '../../lib/api'

// Mock API
vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api')>()
  return {
    ...actual,
    api: {
      ...actual.api,
      documents: {
        update: vi.fn(),
      },
      auth: {
        validate: vi.fn().mockResolvedValue({ valid: false }),
      },
    },
    getAuthToken: vi.fn().mockReturnValue(null),
    clearAuthToken: vi.fn(),
  }
})

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
  Toaster: () => null,
}))

const mockApi = vi.mocked(api)

describe('Toolbar', () => {
  const defaultProps = {
    title: 'Test Document',
    documentId: 'doc-123',
    connectionStatus: 'connected' as const,
    isConnected: true,
    onToggleUserPanel: vi.fn(),
    showUserPanel: false,
    onTitleChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    useDocumentStore.getState().reset()
    useUserStore.setState({ currentUser: null })
  })

  describe('rendering', () => {
    it('should render document title', () => {
      renderWithRouter(<Toolbar {...defaultProps} />)

      expect(screen.getByText('Test Document')).toBeInTheDocument()
    })

    it('should render back navigation link', () => {
      renderWithRouter(<Toolbar {...defaultProps} />)

      const backLink = screen.getByRole('link')
      expect(backLink).toHaveAttribute('href', '/')
    })

    it('should render connection indicator when connected', () => {
      renderWithRouter(<Toolbar {...defaultProps} />)

      expect(screen.getByText('Connected')).toBeInTheDocument()
    })

    it('should render connection indicator when disconnected', () => {
      renderWithRouter(
        <Toolbar {...defaultProps} connectionStatus="disconnected" isConnected={false} />
      )

      expect(screen.getByText('Offline')).toBeInTheDocument()
    })

    it('should render connection indicator when connecting', () => {
      renderWithRouter(
        <Toolbar {...defaultProps} connectionStatus="connecting" isConnected={false} />
      )

      expect(screen.getByText('Connecting...')).toBeInTheDocument()
    })
  })

  describe('connection indicator colors', () => {
    it('should show green indicator when connected', () => {
      renderWithRouter(<Toolbar {...defaultProps} />)

      const indicator = document.querySelector('.bg-emerald-500')
      expect(indicator).toBeInTheDocument()
    })

    it('should show red indicator when disconnected', () => {
      renderWithRouter(
        <Toolbar {...defaultProps} connectionStatus="disconnected" isConnected={false} />
      )

      const indicator = document.querySelector('.bg-red-500')
      expect(indicator).toBeInTheDocument()
    })

    it('should show yellow indicator when connecting', () => {
      renderWithRouter(
        <Toolbar {...defaultProps} connectionStatus="connecting" isConnected={false} />
      )

      const indicator = document.querySelector('.bg-amber-500')
      expect(indicator).toBeInTheDocument()
    })
  })

  describe('user avatars', () => {
    it('should show user count', () => {
      useDocumentStore.setState({ users: [] })
      useUserStore.setState({ currentUser: { name: 'Me', color: '#ff0000' } })

      renderWithRouter(<Toolbar {...defaultProps} />)

      expect(screen.getByText('1 online')).toBeInTheDocument()
    })

    it('should show multiple users', () => {
      useDocumentStore.setState({
        users: [
          { id: 'u1', name: 'User1', color: '#00ff00' },
          { id: 'u2', name: 'User2', color: '#0000ff' },
        ],
      })
      useUserStore.setState({ currentUser: { name: 'Me', color: '#ff0000' } })

      renderWithRouter(<Toolbar {...defaultProps} />)

      expect(screen.getByText('3 online')).toBeInTheDocument()
    })

    it('should call onToggleUserPanel when clicking avatars', async () => {
      const user = userEvent.setup()
      const onToggle = vi.fn()

      useUserStore.setState({ currentUser: { name: 'Me', color: '#ff0000' } })

      renderWithRouter(<Toolbar {...defaultProps} onToggleUserPanel={onToggle} />)

      const avatarButton = screen.getByText('1 online').closest('button')
      if (avatarButton) {
        await user.click(avatarButton)
      }

      expect(onToggle).toHaveBeenCalled()
    })
  })

  describe('current user badge', () => {
    it('should show current user name', () => {
      useUserStore.setState({ currentUser: { name: 'Alice', color: '#ff0000' } })

      renderWithRouter(<Toolbar {...defaultProps} />)

      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    it('should not show badge when no user', () => {
      useUserStore.setState({ currentUser: null })

      renderWithRouter(<Toolbar {...defaultProps} />)

      // Should not find user badge section
      expect(screen.queryByTitle('Sign out')).not.toBeInTheDocument()
    })

    it('should have logout button', () => {
      useUserStore.setState({ currentUser: { name: 'Alice', color: '#ff0000' } })

      renderWithRouter(<Toolbar {...defaultProps} />)

      expect(screen.getByTitle('Sign out')).toBeInTheDocument()
    })
  })

  describe('editable title', () => {
    it('should show edit icon on hover', () => {
      renderWithRouter(<Toolbar {...defaultProps} />)

      // The edit icon should exist in the DOM (though it may be hidden via CSS)
      const editButton = screen.getByTitle('Click to edit title')
      expect(editButton).toBeInTheDocument()
    })

    it('should enter edit mode on click', async () => {
      const user = userEvent.setup()

      renderWithRouter(<Toolbar {...defaultProps} />)

      await user.click(screen.getByTitle('Click to edit title'))

      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
      expect(input).toHaveValue('Test Document')
    })

    it('should save on Enter key', async () => {
      const user = userEvent.setup()
      const onTitleChange = vi.fn()
      mockApi.documents.update.mockResolvedValue({
        id: 'doc-123',
        title: 'New Title',
        content: '',
        createdAt: '',
        updatedAt: '',
      })

      renderWithRouter(<Toolbar {...defaultProps} onTitleChange={onTitleChange} />)

      // Enter edit mode
      await user.click(screen.getByTitle('Click to edit title'))

      // Clear and type new title
      const input = screen.getByRole('textbox')
      await user.clear(input)
      await user.type(input, 'New Title{Enter}')

      await waitFor(() => {
        expect(mockApi.documents.update).toHaveBeenCalledWith('doc-123', { title: 'New Title' })
      })
    })

    it('should cancel on Escape key', async () => {
      const user = userEvent.setup()

      renderWithRouter(<Toolbar {...defaultProps} />)

      // Enter edit mode
      await user.click(screen.getByTitle('Click to edit title'))

      // Type something
      const input = screen.getByRole('textbox')
      await user.clear(input)
      await user.type(input, 'Changed Title{Escape}')

      // Should exit edit mode without saving
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      expect(screen.getByText('Test Document')).toBeInTheDocument()
    })

    it('should save on blur', async () => {
      const user = userEvent.setup()
      mockApi.documents.update.mockResolvedValue({
        id: 'doc-123',
        title: 'Blurred Title',
        content: '',
        createdAt: '',
        updatedAt: '',
      })

      renderWithRouter(<Toolbar {...defaultProps} />)

      // Enter edit mode
      await user.click(screen.getByTitle('Click to edit title'))

      // Change value
      const input = screen.getByRole('textbox')
      await user.clear(input)
      await user.type(input, 'Blurred Title')

      // Blur the input
      fireEvent.blur(input)

      await waitFor(() => {
        expect(mockApi.documents.update).toHaveBeenCalledWith('doc-123', { title: 'Blurred Title' })
      })
    })

    it('should not save if title unchanged', async () => {
      const user = userEvent.setup()

      renderWithRouter(<Toolbar {...defaultProps} />)

      // Enter edit mode
      await user.click(screen.getByTitle('Click to edit title'))

      // Just press Enter without changing
      await user.keyboard('{Enter}')

      expect(mockApi.documents.update).not.toHaveBeenCalled()
    })

    it('should use "Untitled" for empty title', async () => {
      const user = userEvent.setup()
      mockApi.documents.update.mockResolvedValue({
        id: 'doc-123',
        title: 'Untitled',
        content: '',
        createdAt: '',
        updatedAt: '',
      })

      renderWithRouter(<Toolbar {...defaultProps} />)

      // Enter edit mode
      await user.click(screen.getByTitle('Click to edit title'))

      // Clear input and save
      const input = screen.getByRole('textbox')
      await user.clear(input)
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(mockApi.documents.update).toHaveBeenCalledWith('doc-123', { title: 'Untitled' })
      })
    })
  })
})
