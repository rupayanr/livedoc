import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Editor } from './components/Editor'
import { DocumentList } from './components/Sidebar'
import { UserSelect } from './components/UserSelect'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useUserStore } from './stores/userStore'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const currentUser = useUserStore((s) => s.currentUser)

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

export default function App() {
  const login = useUserStore((s) => s.login)

  return (
    <ErrorBoundary>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
            borderRadius: '8px',
            marginBottom: 'env(safe-area-inset-bottom, 0px)',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
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
    </ErrorBoundary>
  )
}
