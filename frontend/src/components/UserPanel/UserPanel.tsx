import Avatar from 'boring-avatars'
import { useDocumentStore } from '../../stores/documentStore'
import { useUserStore } from '../../stores/userStore'

const AVATAR_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#06b6d4']

interface UserPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function UserPanel({ isOpen, onClose }: UserPanelProps) {
  const users = useDocumentStore((s) => s.users)
  const currentUser = useUserStore((s) => s.currentUser)

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl z-50 flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Online Users</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Current User */}
          {currentUser && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">You</p>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="ring-2 ring-blue-400 ring-offset-2 rounded-full">
                  <Avatar
                    size={40}
                    name={currentUser.name}
                    variant="beam"
                    colors={AVATAR_COLORS}
                  />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{currentUser.name}</p>
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Active now
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Other Users */}
          {users.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                Collaborators ({users.length})
              </p>
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Avatar
                      size={40}
                      name={user.name}
                      variant="beam"
                      colors={AVATAR_COLORS}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Editing
                      </p>
                    </div>
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: user.color }}
                      title={`Cursor color: ${user.color}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {users.length === 0 && !currentUser && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-gray-500">No other users online</p>
              <p className="text-sm text-gray-400 mt-1">Share the link to collaborate</p>
            </div>
          )}

          {users.length === 0 && currentUser && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <p className="text-gray-500">You're the only one here</p>
              <p className="text-sm text-gray-400 mt-1">Open another browser to test collaboration</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-400 text-center">
            Changes sync in real-time
          </p>
        </div>
      </div>
    </>
  )
}
