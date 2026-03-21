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
  const userColor = currentUser?.color ?? '#6366f1'
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
  const { ytext, provider, isConnected, isSynced } = useYjs(
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
      // Warn if there's content and it hasn't synced yet (changes might be lost)
      if (ytext && !isSynced) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [ytext, isSynced])

  if (isLoading || usernameAvailable === null) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-surface-50 dark:bg-surface-900">
        <div className="w-10 h-10 border-2 border-primary-600 dark:border-primary-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-surface-500 dark:text-surface-400">
          {usernameAvailable === null ? 'Checking username availability...' : 'Loading document...'}
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-surface-50 dark:bg-surface-900 px-4">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-red-500 dark:text-red-400 text-center">{error}</p>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-surface-50 dark:bg-surface-900 px-4">
        <div className="w-16 h-16 bg-surface-200 dark:bg-surface-700 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-surface-500 dark:text-surface-400">Document not found</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-surface-900">
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
        <div className={`flex-1 overflow-hidden border-r border-surface-200 dark:border-surface-700 ${
          mobileViewMode === 'preview' ? 'hidden md:block' : 'block'
        }`}>
          {ytext && provider ? (
            <CodeMirrorEditor ytext={ytext} provider={provider} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-surface-400 dark:text-surface-500">
              <div className="w-8 h-8 border-2 border-primary-600 dark:border-primary-400 border-t-transparent rounded-full animate-spin mb-3" />
              <span>Connecting...</span>
            </div>
          )}
        </div>

        {/* Preview pane - hidden on mobile when viewing editor, always shown on desktop */}
        <div className={`flex-1 overflow-auto bg-white dark:bg-surface-900 scroll-touch ${
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
