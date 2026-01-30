import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Avatar from 'boring-avatars'
import { api } from '../../lib/api'
import { useDocumentStore } from '../../stores/documentStore'
import { useUserStore } from '../../stores/userStore'
import type { ConnectionStatus } from '../../types'

const AVATAR_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#06b6d4']

interface ToolbarProps {
  title: string
  documentId: string
  connectionStatus: ConnectionStatus
  isConnected: boolean
  onToggleUserPanel?: () => void
  showUserPanel?: boolean
  onTitleChange?: (newTitle: string) => void
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
    <div className="flex items-center gap-2">
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

function UserAvatars({ onToggle, userCount }: { onToggle?: () => void; userCount: number }) {
  const users = useDocumentStore((s) => s.users)
  const currentUser = useUserStore((s) => s.currentUser)

  // Combine current user with remote users for display
  const allUsers = currentUser
    ? [{ id: 'me', name: currentUser.name, color: currentUser.color, isMe: true }, ...users]
    : users

  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 hover:bg-gray-100 rounded-lg px-2 py-1 transition-colors"
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
        className="text-lg font-medium text-gray-900 bg-gray-100 border border-gray-300 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[200px]"
        maxLength={255}
      />
    )
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="text-lg font-medium text-gray-900 hover:bg-gray-100 rounded px-2 py-0.5 transition-colors group flex items-center gap-1"
      title="Click to edit title"
    >
      {title}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
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
}: ToolbarProps) {
  const users = useDocumentStore((s) => s.users)
  const currentUser = useUserStore((s) => s.currentUser)
  const totalUsers = (currentUser ? 1 : 0) + users.length

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="text-gray-500 hover:text-gray-700 transition-colors"
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
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </Link>
        <EditableTitle
          title={title}
          documentId={documentId}
          onTitleChange={onTitleChange}
        />
      </div>

      <div className="flex items-center gap-4">
        <UserAvatars onToggle={onToggleUserPanel} userCount={totalUsers} />
        <ConnectionIndicator status={connectionStatus} isConnected={isConnected} />
        <CurrentUserBadge />
      </div>
    </div>
  )
}
