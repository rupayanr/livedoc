import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useDocument } from '../../hooks/useDocument'
import { useYjs } from '../../hooks/useYjs'
import { useDocumentStore } from '../../stores/documentStore'
import { useUserStore } from '../../stores/userStore'
import { api } from '../../lib/api'
import { CodeMirrorEditor } from './CodeMirrorEditor'
import { Toolbar } from './Toolbar'
import { MarkdownPreview } from '../Preview/MarkdownPreview'
import { UserPanel } from '../UserPanel'
import { VersionHistory } from '../VersionHistory'

type MobileViewMode = 'editor' | 'preview'

export function Editor() {
  const { documentId } = useParams<{ documentId: string }>()
  const navigate = useNavigate()
  const { document, isLoading, error, refetch } = useDocument(documentId ?? null)
  const currentUser = useUserStore((s) => s.currentUser)
  const clearCurrentUser = useUserStore((s) => s.clearCurrentUser)
  const userName = currentUser?.name ?? `User-${Math.random().toString(36).slice(2, 6)}`
  const userColor = currentUser?.color ?? '#3b82f6'  // Default blue for mobile/private browsing
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)

  // Check username availability before connecting
  useEffect(() => {
    if (!documentId || !userName) return

    let cancelled = false

    api.documents.checkUsername(documentId, userName)
      .then((result) => {
        if (cancelled) return
        if (!result.available) {
          toast.error(`Username "${userName}" is already in use. Please choose a different name.`, { duration: 4000 })
          clearCurrentUser()
          navigate('/user-select')
        } else {
          setUsernameAvailable(true)
        }
      })
      .catch(() => {
        // On error, allow connection (server might not be reachable yet)
        if (!cancelled) setUsernameAvailable(true)
      })

    return () => { cancelled = true }
  }, [documentId, userName, clearCurrentUser, navigate])

  // Only connect to Yjs if username is available
  const { ytext, provider, isConnected } = useYjs(
    usernameAvailable ? (documentId ?? null) : null,
    userName,
    userColor
  )
  const connectionStatus = useDocumentStore((s) => s.connectionStatus)
  const setCurrentDocument = useDocumentStore((s) => s.setCurrentDocument)
  const [showUserPanel, setShowUserPanel] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [currentTitle, setCurrentTitle] = useState<string | null>(null)
  const [mobileViewMode, setMobileViewMode] = useState<MobileViewMode>('editor')

  const handleTitleChange = useCallback((newTitle: string) => {
    setCurrentTitle(newTitle)
    if (document) {
      setCurrentDocument(document.id, newTitle)
    }
  }, [document, setCurrentDocument])

  const handleVersionRestore = useCallback(() => {
    // Refetch the document to get the restored content
    refetch()
  }, [refetch])

  // Warn users before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only warn if connected and has content (changes might be syncing)
      if (ytext && !isConnected) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [ytext, isConnected])

  if (isLoading || usernameAvailable === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">
          {usernameAvailable === null ? 'Checking username availability...' : 'Loading document...'}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Document not found</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <Toolbar
        title={currentTitle ?? document.title}
        documentId={document.id}
        connectionStatus={connectionStatus}
        isConnected={isConnected}
        onToggleUserPanel={() => setShowUserPanel(!showUserPanel)}
        showUserPanel={showUserPanel}
        onTitleChange={handleTitleChange}
        onOpenVersionHistory={() => setShowVersionHistory(true)}
        mobileViewMode={mobileViewMode}
        onMobileViewModeChange={setMobileViewMode}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Editor pane - hidden on mobile when viewing preview, always shown on desktop */}
        <div className={`flex-1 overflow-hidden border-r border-gray-200 ${
          mobileViewMode === 'preview' ? 'hidden md:block' : 'block'
        }`}>
          {ytext && provider ? (
            <CodeMirrorEditor ytext={ytext} provider={provider} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              Connecting...
            </div>
          )}
        </div>

        {/* Preview pane - hidden on mobile when viewing editor, always shown on desktop */}
        <div className={`flex-1 overflow-auto bg-white scroll-touch ${
          mobileViewMode === 'editor' ? 'hidden md:block' : 'block'
        }`}>
          <MarkdownPreview />
        </div>
      </div>

      {/* User Panel */}
      <UserPanel isOpen={showUserPanel} onClose={() => setShowUserPanel(false)} />

      {/* Version History Modal */}
      <VersionHistory
        documentId={document.id}
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        onRestore={handleVersionRestore}
      />
    </div>
  )
}
