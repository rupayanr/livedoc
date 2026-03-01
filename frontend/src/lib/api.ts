import type { Document, DocumentListItem, Version, VersionListItem } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Transform snake_case API response to camelCase
function snakeToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    const value = obj[key]
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[camelKey] = snakeToCamel(value as Record<string, unknown>)
    } else if (Array.isArray(value)) {
      result[camelKey] = value.map(item =>
        typeof item === 'object' && item !== null ? snakeToCamel(item as Record<string, unknown>) : item
      )
    } else {
      result[camelKey] = value
    }
  }
  return result
}

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

    checkUsername: (id: string, name: string): Promise<{ available: boolean; name: string }> =>
      fetchApi<{ available: boolean; name: string }>(`/api/v1/documents/${id}/check-username?name=${encodeURIComponent(name)}`),
  },

  versions: {
    list: async (documentId: string): Promise<VersionListItem[]> => {
      const data = await fetchApi<Record<string, unknown>[]>(`/api/v1/documents/${documentId}/versions`)
      return data.map(item => snakeToCamel(item)) as unknown as VersionListItem[]
    },

    get: async (documentId: string, versionId: string): Promise<Version> => {
      const data = await fetchApi<Record<string, unknown>>(`/api/v1/documents/${documentId}/versions/${versionId}`)
      return snakeToCamel(data) as unknown as Version
    },

    create: async (documentId: string, userName?: string): Promise<Version> => {
      const data = await fetchApi<Record<string, unknown>>(`/api/v1/documents/${documentId}/versions${userName ? `?user_name=${encodeURIComponent(userName)}` : ''}`, {
        method: 'POST',
      })
      return snakeToCamel(data) as unknown as Version
    },

    restore: async (documentId: string, versionId: string, userName?: string): Promise<Version> => {
      const data = await fetchApi<Record<string, unknown>>(`/api/v1/documents/${documentId}/versions/${versionId}/restore${userName ? `?user_name=${encodeURIComponent(userName)}` : ''}`, {
        method: 'POST',
      })
      return snakeToCamel(data) as unknown as Version
    },
  },
}
