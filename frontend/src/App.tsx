import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Editor } from './components/Editor'
import { DocumentList } from './components/Sidebar'
import { UserSelect } from './components/UserSelect'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import { useUserStore } from './stores/userStore'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const currentUser = useUserStore((s) => s.currentUser)
  const isValidating = useUserStore((s) => s.isValidating)
  const [hasHydrated, setHasHydrated] = useState(false)

  useEffect(() => {
    // Check if store has already hydrated
    if (useUserStore.persist.hasHydrated()) {
      setHasHydrated(true)
    } else {
      // Wait for hydration to complete
      const unsubscribe = useUserStore.persist.onFinishHydration(() => {
        setHasHydrated(true)
      })
      return () => unsubscribe()
    }
  }, [])

  // Show loading while hydrating or validating token
  if (!hasHydrated || isValidating) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-surface-50 dark:bg-surface-900">
        <div className="w-10 h-10 border-2 border-primary-600 dark:border-primary-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-surface-500 dark:text-surface-400">Loading...</p>
      </div>
    )
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function LoginRoute({ children }: { children: React.ReactNode }) {
  const currentUser = useUserStore((s) => s.currentUser)

  // If already logged in, redirect to home
  if (currentUser) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function ToasterWithTheme() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: isDark ? '#1e293b' : '#ffffff',
          color: isDark ? '#f1f5f9' : '#0f172a',
          borderRadius: '12px',
          border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
          boxShadow: isDark
            ? '0 10px 15px -3px rgb(0 0 0 / 0.4)'
            : '0 10px 15px -3px rgb(0 0 0 / 0.1)',
          marginBottom: 'env(safe-area-inset-bottom, 0px)',
          padding: '12px 16px',
        },
        success: {
          iconTheme: {
            primary: '#10b981',
            secondary: isDark ? '#1e293b' : '#ffffff',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: isDark ? '#1e293b' : '#ffffff',
          },
        },
      }}
    />
  )
}

function AppRoutes() {
  const login = useUserStore((s) => s.login)

  return (
    <>
      <ToasterWithTheme />
      <Routes>
        <Route
          path="/login"
          element={
            <LoginRoute>
              <UserSelect onSelectUser={login} />
            </LoginRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DocumentList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doc/:documentId"
          element={
            <ProtectedRoute>
              <Editor />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    </ThemeProvider>
  )
}
