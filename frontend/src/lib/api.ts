import type { Document, DocumentListItem, Version, VersionListItem } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Auth token storage key
const AUTH_TOKEN_KEY = 'livedoc-auth-token'

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

// Get stored auth token
export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY)
  } catch {
    return null
  }
}

// Set auth token
export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token)
  } catch {
    // Silent fail for private browsing
  }
}

// Clear auth token
export function clearAuthToken(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY)
  } catch {
    // Silent fail
  }
}

// Default request timeout in milliseconds
const DEFAULT_TIMEOUT = 30000

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit & { requireAuth?: boolean; timeout?: number }
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }

  // Add auth header if token exists
  const token = getAuthToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Create AbortController for timeout and cancellation
  const controller = new AbortController()
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT

  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeout)

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      signal: options?.signal ?? controller.signal,
    })

    if (!response.ok) {
      throw new ApiError(response.status, `API error: ${response.statusText}`)
    }

    if (response.status === 204) {
      return undefined as T
    }

    // Validate Content-Type before parsing JSON
    const contentType = response.headers.get('Content-Type')
    if (!contentType || !contentType.includes('application/json')) {
      throw new ApiError(
        response.status,
        `Expected JSON response but got ${contentType || 'no Content-Type'}`
      )
    }

    return response.json()
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(408, 'Request timeout')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export const api = {
  auth: {
    login: async (name: string): Promise<{ token: string; userName: string }> => {
      const response = await fetchApi<{ token: string; user_name: string }>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
      // Store the token
      setAuthToken(response.token)
      return { token: response.token, userName: response.user_name }
    },

    logout: async (): Promise<void> => {
      try {
        await fetchApi<{ success: boolean }>('/api/v1/auth/logout', {
          method: 'POST',
        })
      } finally {
        clearAuthToken()
      }
    },

    isAuthenticated: (): boolean => {
      return getAuthToken() !== null
    },

    getActiveUsers: async (): Promise<string[]> => {
      const response = await fetchApi<{ users: string[] }>('/api/v1/auth/active-users')
      return response.users
    },

    validate: async (): Promise<{ valid: boolean; userName: string | null }> => {
      try {
        const response = await fetchApi<{ valid: boolean; user_name: string | null }>('/api/v1/auth/validate')
        return { valid: response.valid, userName: response.user_name }
      } catch {
        // On network error or timeout, assume invalid
        return { valid: false, userName: null }
      }
    },
  },

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
