import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useDocumentStore } from '../stores/documentStore'
import type { Document, DocumentListItem } from '../types'

interface UseDocumentReturn {
  document: Document | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useDocument(documentId: string | null): UseDocumentReturn {
  const [document, setDocument] = useState<Document | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setCurrentDocument = useDocumentStore((s) => s.setCurrentDocument)

  const fetchDocument = useCallback(async () => {
    if (!documentId) {
      setDocument(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const doc = await api.documents.get(documentId)
      setDocument(doc)
      setCurrentDocument(doc.id, doc.title)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document')
      setDocument(null)
    } finally {
      setIsLoading(false)
    }
  }, [documentId, setCurrentDocument])

  useEffect(() => {
    // Track if this effect is still active to prevent stale closure issues
    let isActive = true

    const loadDocument = async () => {
      if (!documentId) {
        setDocument(null)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const doc = await api.documents.get(documentId)
        // Only update state if this effect is still active
        if (isActive) {
          setDocument(doc)
          setCurrentDocument(doc.id, doc.title)
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Failed to load document')
          setDocument(null)
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadDocument()

    return () => {
      isActive = false
    }
  }, [documentId, setCurrentDocument])

  return { document, isLoading, error, refetch: fetchDocument }
}

interface UseDocumentListReturn {
  documents: DocumentListItem[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  createDocument: (title?: string) => Promise<Document | null>
  deleteDocument: (id: string) => Promise<boolean>
}

export function useDocumentList(): UseDocumentListReturn {
  const documents = useDocumentStore((s) => s.documents)
  const isLoading = useDocumentStore((s) => s.isLoadingDocuments)
  const setDocuments = useDocumentStore((s) => s.setDocuments)
  const setIsLoading = useDocumentStore((s) => s.setIsLoadingDocuments)

  const [error, setError] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const docs = await api.documents.list()
      setDocuments(docs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setIsLoading(false)
    }
  }, [setDocuments, setIsLoading])

  const createDocument = useCallback(
    async (title?: string): Promise<Document | null> => {
      try {
        const doc = await api.documents.create(title)
        await fetchDocuments()
        return doc
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create document')
        return null
      }
    },
    [fetchDocuments]
  )

  const deleteDocument = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await api.documents.delete(id)
        await fetchDocuments()
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete document')
        return false
      }
    },
    [fetchDocuments]
  )

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  return {
    documents,
    isLoading,
    error,
    refetch: fetchDocuments,
    createDocument,
    deleteDocument,
  }
}
