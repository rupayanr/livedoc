import { useDocumentStore } from '../../stores/documentStore'

export function UserList() {
  const users = useDocumentStore((s) => s.users)

  if (users.length === 0) {
    return null
  }

  return (
    <div className="p-4 border-b border-gray-200">
      <h3 className="text-sm font-medium text-gray-500 mb-2">Online Users</h3>
      <div className="space-y-2">
        {users.map((user) => (
          <div key={user.id} className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
              style={{ backgroundColor: user.color }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-gray-700">{user.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
