import type { Document, DocumentListItem } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    throw new ApiError(response.status, `API error: ${response.statusText}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

export const api = {
  documents: {
    list: (): Promise<DocumentListItem[]> =>
      fetchApi<DocumentListItem[]>('/api/v1/documents'),

    get: (id: string): Promise<Document> =>
      fetchApi<Document>(`/api/v1/documents/${id}`),

    create: (title: string = 'Untitled'): Promise<Document> =>
      fetchApi<Document>('/api/v1/documents', {
        method: 'POST',
        body: JSON.stringify({ title }),
      }),

    update: (id: string, data: { title?: string; content?: string }): Promise<Document> =>
      fetchApi<Document>(`/api/v1/documents/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    delete: (id: string): Promise<void> =>
      fetchApi<void>(`/api/v1/documents/${id}`, {
        method: 'DELETE',
      }),
  },
}
