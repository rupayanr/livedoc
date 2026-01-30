import { useState, useCallback, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useDocument } from '../../hooks/useDocument'
import { useYjs } from '../../hooks/useYjs'
import { useDocumentStore } from '../../stores/documentStore'
import { useUserStore } from '../../stores/userStore'
import { CodeMirrorEditor } from './CodeMirrorEditor'
import { Toolbar } from './Toolbar'
import { MarkdownPreview } from '../Preview/MarkdownPreview'
import { UserPanel } from '../UserPanel'

export function Editor() {
  const { documentId } = useParams<{ documentId: string }>()
  const { document, isLoading, error, refetch } = useDocument(documentId ?? null)
  const currentUser = useUserStore((s) => s.currentUser)
  const userName = currentUser?.name ?? `User-${Math.random().toString(36).slice(2, 6)}`
  const userColor = currentUser?.color
  const { ytext, provider, isConnected } = useYjs(documentId ?? null, userName, userColor)
  const connectionStatus = useDocumentStore((s) => s.connectionStatus)
  const setCurrentDocument = useDocumentStore((s) => s.setCurrentDocument)
  const [showUserPanel, setShowUserPanel] = useState(false)
  const [currentTitle, setCurrentTitle] = useState<string | null>(null)

  const handleTitleChange = useCallback((newTitle: string) => {
    setCurrentTitle(newTitle)
    if (document) {
      setCurrentDocument(document.id, newTitle)
    }
  }, [document, setCurrentDocument])

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading document...</div>
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
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Editor pane */}
        <div className="flex-1 overflow-hidden border-r border-gray-200">
          {ytext && provider ? (
            <CodeMirrorEditor ytext={ytext} provider={provider} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              Connecting...
            </div>
          )}
        </div>

        {/* Preview pane */}
        <div className="flex-1 overflow-auto bg-white">
          <MarkdownPreview />
        </div>
      </div>

      {/* User Panel */}
      <UserPanel isOpen={showUserPanel} onClose={() => setShowUserPanel(false)} />
    </div>
  )
}
