import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import { useUserStore } from '../../stores/userStore'
import type { VersionListItem, Version } from '../../types'

interface VersionHistoryProps {
  documentId: string
  isOpen: boolean
  onClose: () => void
  onRestore?: () => void
}

export function VersionHistory({ documentId, isOpen, onClose, onRestore }: VersionHistoryProps) {
  const [versions, setVersions] = useState<VersionListItem[]>([])
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  // On mobile, track whether we're viewing the version list or a specific version
  const [mobileShowPreview, setMobileShowPreview] = useState(false)
  const currentUser = useUserStore((s) => s.currentUser)

  const fetchVersions = useCallback(async () => {
    if (!documentId) return

    setIsLoading(true)
    try {
      const data = await api.versions.list(documentId)
      setVersions(data)
    } catch {
      toast.error('Failed to load version history')
    } finally {
      setIsLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    if (isOpen) {
      fetchVersions()
      setSelectedVersion(null)
      setMobileShowPreview(false)
    }
  }, [isOpen, fetchVersions])

  const handleSelectVersion = async (versionId: string) => {
    try {
      const version = await api.versions.get(documentId, versionId)
      setSelectedVersion(version)
      setMobileShowPreview(true)
    } catch {
      toast.error('Failed to load version')
    }
  }

  const handleMobileBack = () => {
    setMobileShowPreview(false)
  }

  const handleCreateSnapshot = async () => {
    setIsCreating(true)
    try {
      await api.versions.create(documentId, currentUser?.name)
      toast.success('Version saved')
      fetchVersions()
    } catch {
      toast.error('Failed to create version')
    } finally {
      setIsCreating(false)
    }
  }

  const handleRestore = async () => {
    if (!selectedVersion) return

    setIsRestoring(true)
    try {
      await api.versions.restore(documentId, selectedVersion.id, currentUser?.name)
      toast.success(`Restored to version ${selectedVersion.versionNumber}`)
      onRestore?.()
      onClose()
    } catch {
      toast.error('Failed to restore version')
    } finally {
      setIsRestoring(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
      {/* Modal container - bottom sheet on mobile, centered modal on desktop */}
      <div className="bg-white rounded-t-2xl md:rounded-lg shadow-xl w-full md:max-w-4xl h-[85vh] md:h-auto md:max-h-[80vh] flex flex-col animate-bottom-sheet md:animate-none safe-area-bottom">
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b">
          {/* Mobile back button when viewing preview */}
          {mobileShowPreview && selectedVersion && (
            <button
              onClick={handleMobileBack}
              className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 touch-target flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          )}
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 flex-1">
            {mobileShowPreview && selectedVersion ? `v${selectedVersion.versionNumber}` : 'Version History'}
          </h2>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={handleCreateSnapshot}
              disabled={isCreating}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors touch-target"
            >
              {isCreating ? 'Saving...' : 'Save Version'}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors touch-target flex items-center justify-center"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content - stacked on mobile, side-by-side on desktop */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Version List - hidden on mobile when viewing preview */}
          <div className={`${mobileShowPreview ? 'hidden' : 'flex-1'} md:flex-none md:block md:w-80 border-b md:border-b-0 md:border-r overflow-y-auto scroll-touch`}>
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : versions.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p>No versions yet</p>
                <p className="text-sm mt-1">Versions are created automatically every 5 minutes</p>
              </div>
            ) : (
              <div className="divide-y">
                {versions.map((version) => (
                  <button
                    key={version.id}
                    onClick={() => handleSelectVersion(version.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors touch-target ${
                      selectedVersion?.id === version.id ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">
                        v{version.versionNumber}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        version.snapshotType === 'manual'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {version.snapshotType === 'manual' ? 'Manual' : 'Auto'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(version.createdAt)}
                    </div>
                    {version.createdBy && (
                      <div className="text-xs text-gray-400 mt-1">
                        by {version.createdBy}
                      </div>
                    )}
                    {version.contentPreview && (
                      <div className="text-xs text-gray-400 mt-1 truncate">
                        {version.contentPreview}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Version Preview - shown on mobile only when mobileShowPreview is true */}
          <div className={`${!mobileShowPreview ? 'hidden' : 'flex'} md:flex flex-1 flex-col overflow-hidden`}>
            {selectedVersion ? (
              <>
                <div className="px-4 md:px-6 py-3 border-b bg-gray-50">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        <span className="hidden md:inline">Version {selectedVersion.versionNumber}: </span>
                        {selectedVersion.title}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formatDate(selectedVersion.createdAt)}
                        {selectedVersion.createdBy && ` by ${selectedVersion.createdBy}`}
                      </p>
                    </div>
                    <button
                      onClick={handleRestore}
                      disabled={isRestoring}
                      className="w-full md:w-auto px-4 py-2.5 md:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors touch-target"
                    >
                      {isRestoring ? 'Restoring...' : 'Restore This Version'}
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto p-4 md:p-6 scroll-touch">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                    {selectedVersion.content || '(empty document)'}
                  </pre>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                Select a version to preview
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
