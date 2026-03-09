import { useState, useRef, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Avatar from 'boring-avatars'
import { api } from '../../lib/api'
import { useDocumentStore } from '../../stores/documentStore'
import { useUserStore } from '../../stores/userStore'
import type { ConnectionStatus } from '../../types'

// Memoized outside component to prevent re-creation
const AVATAR_COLORS: string[] = ['#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#06b6d4']

type MobileViewMode = 'editor' | 'preview'

interface ToolbarProps {
  title: string
  documentId: string
  connectionStatus: ConnectionStatus
  isConnected: boolean
  onToggleUserPanel?: () => void
  showUserPanel?: boolean
  onTitleChange?: (newTitle: string) => void
  onOpenVersionHistory?: () => void
  mobileViewMode?: MobileViewMode
  onMobileViewModeChange?: (mode: MobileViewMode) => void
}

function ConnectionIndicator({
  status,
  isConnected,
}: {
  status: ConnectionStatus
  isConnected: boolean
}) {
  const connected = status === 'connected' && isConnected

  return (
    <div className="hidden sm:flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full ${
          connected
            ? 'bg-green-500'
            : status === 'connecting'
              ? 'bg-yellow-500 animate-pulse'
              : 'bg-red-500'
        }`}
      />
      <span className="text-sm text-gray-500">
        {connected ? 'Connected' : status === 'connecting' ? 'Connecting...' : 'Disconnected'}
      </span>
    </div>
  )
}

function MobileViewToggle({
  mode,
  onChange,
}: {
  mode: MobileViewMode
  onChange: (mode: MobileViewMode) => void
}) {
  return (
    <div className="flex md:hidden bg-gray-100 rounded-xl p-1 gap-1">
      <button
        onClick={() => onChange('editor')}
        className={`p-2.5 xs:px-3 xs:py-2 rounded-lg transition-colors touch-target flex items-center justify-center gap-1.5 ${
          mode === 'editor'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        title="Edit"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <span className="hidden xs:inline text-sm font-medium">Edit</span>
      </button>
      <button
        onClick={() => onChange('preview')}
        className={`p-2.5 xs:px-3 xs:py-2 rounded-lg transition-colors touch-target flex items-center justify-center gap-1.5 ${
          mode === 'preview'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        title="Preview"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <span className="hidden xs:inline text-sm font-medium">Preview</span>
      </button>
    </div>
  )
}

function UserAvatars({ onToggle }: { onToggle?: () => void }) {
  const users = useDocumentStore((s) => s.users)
  const currentUser = useUserStore((s) => s.currentUser)

  // Memoize combined users list to prevent unnecessary re-renders
  const allUsers = useMemo(() => {
    return currentUser
      ? [{ id: 'me', name: currentUser.name, color: currentUser.color, isMe: true }, ...users]
      : users
  }, [currentUser, users])

  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 hover:bg-gray-100 rounded-lg p-2 md:px-2 md:py-1 transition-colors touch-target"
    >
      <div className="flex items-center -space-x-2">
        {allUsers.slice(0, 4).map((user, index) => (
          <div
            key={user.id}
            className={`rounded-full border-2 border-white shadow-sm ${
              'isMe' in user && user.isMe ? 'ring-2 ring-blue-400 ring-offset-1' : ''
            }`}
            style={{ zIndex: 10 - index }}
            title={`${'isMe' in user && user.isMe ? '(You) ' : ''}${user.name}`}
          >
            <Avatar
              size={32}
              name={user.name}
              variant="beam"
              colors={AVATAR_COLORS}
            />
          </div>
        ))}
        {allUsers.length > 4 && (
          <div
            className="w-8 h-8 rounded-full border-2 border-white bg-gray-500 flex items-center justify-center text-white text-xs font-bold shadow-sm"
            style={{ zIndex: 5 }}
          >
            +{allUsers.length - 4}
          </div>
        )}
      </div>
      <span className="text-sm font-medium text-gray-600">
        {allUsers.length} online
      </span>
    </button>
  )
}

function CurrentUserBadge() {
  const currentUser = useUserStore((s) => s.currentUser)
  const clearCurrentUser = useUserStore((s) => s.clearCurrentUser)
  const navigate = useNavigate()

  if (!currentUser) return null

  const handleLogout = () => {
    clearCurrentUser()
    toast.success('Signed out')
    navigate('/login')
  }

  return (
    <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
      <Avatar
        size={32}
        name={currentUser.name}
        variant="beam"
        colors={AVATAR_COLORS}
      />
      <span className="text-sm font-medium text-gray-700">{currentUser.name}</span>
      <button
        onClick={handleLogout}
        className="text-xs text-gray-400 hover:text-gray-600 ml-1"
        title="Switch user"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
    </div>
  )
}

function EditableTitle({
  title,
  documentId,
  onTitleChange,
}: {
  title: string
  documentId: string
  onTitleChange?: (newTitle: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(title)
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setEditValue(title)
  }, [title])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = async () => {
    const newTitle = editValue.trim() || 'Untitled'
    if (newTitle === title) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      await api.documents.update(documentId, { title: newTitle })
      onTitleChange?.(newTitle)
      toast.success('Title updated')
    } catch {
      toast.error('Failed to update title')
      setEditValue(title)
    } finally {
      setIsSaving(false)
      setIsEditing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setEditValue(title)
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={isSaving}
        className="text-base md:text-lg font-semibold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full max-w-[200px] md:max-w-[300px]"
        maxLength={255}
      />
    )
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="text-base md:text-lg font-semibold text-gray-900 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors group flex items-center gap-1.5 min-w-0 truncate"
      title="Click to edit title"
    >
      <span className="truncate">{title}</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-3.5 w-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hidden md:block"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        />
      </svg>
    </button>
  )
}

export function Toolbar({
  title,
  documentId,
  connectionStatus,
  isConnected,
  onToggleUserPanel,
  onTitleChange,
  onOpenVersionHistory,
  mobileViewMode = 'editor',
  onMobileViewModeChange,
}: ToolbarProps) {
  return (
    <div className="flex items-center justify-between px-3 md:px-4 py-4 md:py-3 border-b border-gray-100 bg-white/95 backdrop-blur-sm safe-area-top">
      <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
        <Link
          to="/"
          className="text-gray-400 hover:text-gray-600 transition-colors touch-target flex items-center justify-center p-1 -ml-1 rounded-lg hover:bg-gray-100"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <EditableTitle
          title={title}
          documentId={documentId}
          onTitleChange={onTitleChange}
        />
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Mobile View Toggle */}
        {onMobileViewModeChange && (
          <MobileViewToggle mode={mobileViewMode} onChange={onMobileViewModeChange} />
        )}

        {/* Version History Button - icon only on mobile */}
        <button
          onClick={onOpenVersionHistory}
          className="flex items-center gap-1.5 p-2 md:px-3 md:py-1.5 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors touch-target"
          title="Version History"
        >
          <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="hidden md:inline">History</span>
        </button>

        <UserAvatars onToggle={onToggleUserPanel} />
        <ConnectionIndicator status={connectionStatus} isConnected={isConnected} />
        <div className="hidden md:block">
          <CurrentUserBadge />
        </div>
      </div>
    </div>
  )
}
