import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Avatar from 'boring-avatars'

const DEMO_USERS = [
  { id: '1', name: 'Alice', color: '#ef4444' },
  { id: '2', name: 'Bob', color: '#3b82f6' },
  { id: '3', name: 'Charlie', color: '#22c55e' },
  { id: '4', name: 'Diana', color: '#a855f7' },
  { id: '5', name: 'Eve', color: '#f59e0b' },
  { id: '6', name: 'Frank', color: '#06b6d4' },
]

const AVATAR_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#06b6d4']

interface UserSelectProps {
  onSelectUser: (user: { name: string; color: string }) => void
}

export function UserSelect({ onSelectUser }: UserSelectProps) {
  const [customName, setCustomName] = useState('')
  const [selectedUser, setSelectedUser] = useState<typeof DEMO_USERS[0] | null>(null)
  const navigate = useNavigate()

  const handleSelectUser = (user: typeof DEMO_USERS[0]) => {
    setSelectedUser(user)
    setCustomName('')
  }

  const handleContinue = () => {
    if (selectedUser) {
      onSelectUser({ name: selectedUser.name, color: selectedUser.color })
      toast.success(`Welcome, ${selectedUser.name}!`)
      navigate('/')
    } else if (customName.trim()) {
      // Generate color from name
      let hash = 0
      for (let i = 0; i < customName.length; i++) {
        hash = customName.charCodeAt(i) + ((hash << 5) - hash)
      }
      const hue = Math.abs(hash % 360)
      onSelectUser({ name: customName.trim(), color: `hsl(${hue}, 70%, 50%)` })
      toast.success(`Welcome, ${customName.trim()}!`)
      navigate('/')
    }
  }

  const canContinue = selectedUser || customName.trim().length > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to LiveDoc</h1>
          <p className="text-gray-600">Choose your avatar to start collaborating</p>
        </div>

        {/* Demo Users Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {DEMO_USERS.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelectUser(user)}
              className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                selectedUser?.id === user.id
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="mx-auto mb-2">
                <Avatar
                  size={48}
                  name={user.name}
                  variant="beam"
                  colors={AVATAR_COLORS}
                />
              </div>
              <p className="text-sm font-medium text-gray-700">{user.name}</p>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-sm text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Custom Name Input */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Enter your name..."
            value={customName}
            onChange={(e) => {
              setCustomName(e.target.value)
              setSelectedUser(null)
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className={`w-full py-3 rounded-lg font-medium transition-all ${
            canContinue
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue to Documents
        </button>

        {/* Online Users Indicator */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            Real-time collaborative markdown editing
          </p>
        </div>
      </div>
    </div>
  )
}
