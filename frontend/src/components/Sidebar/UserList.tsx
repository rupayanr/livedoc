import { useDocumentStore } from '../../stores/documentStore'

// Default color for users with invalid/missing colors
const DEFAULT_USER_COLOR = '#6b7280'

// Validate color string format
function isValidColor(color: string | undefined | null): boolean {
  if (!color) return false
  // Accept hex colors and hsl/rgb formats
  return /^#[0-9a-f]{3,6}$/i.test(color) ||
         /^(hsl|rgb)a?\(.+\)$/i.test(color)
}

export function UserList() {
  const users = useDocumentStore((s) => s.users)

  if (!users || users.length === 0) {
    return null
  }

  return (
    <div className="p-4 border-b border-gray-200">
      <h3 className="text-sm font-medium text-gray-500 mb-2">Online Users</h3>
      <div className="space-y-2">
        {users.map((user) => {
          // Validate user data before rendering
          if (!user || !user.id) return null

          const userName = user.name || 'Anonymous'
          const userColor = isValidColor(user.color) ? user.color : DEFAULT_USER_COLOR

          return (
            <div key={user.id} className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                style={{ backgroundColor: userColor }}
              >
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-gray-700 truncate">{userName}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
