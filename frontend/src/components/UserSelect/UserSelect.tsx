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
    <div className="min-h-screen h-screen-mobile bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center px-5 py-8 safe-area-top safe-area-bottom">
      <div className="bg-white rounded-3xl shadow-xl shadow-blue-500/10 p-6 md:p-8 max-w-md w-full">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
            Welcome to LiveDoc
          </h1>
          <p className="text-gray-500">Choose an avatar to get started</p>
        </div>

        {/* Demo Users Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {DEMO_USERS.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelectUser(user)}
              className={`p-4 rounded-2xl border-2 transition-all active:scale-95 touch-target ${
                selectedUser?.id === user.id
                  ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/20'
                  : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white'
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
          <span className="text-sm text-gray-400 font-medium">or enter name</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Custom Name Input */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Your name..."
            value={customName}
            onChange={(e) => {
              setCustomName(e.target.value)
              setSelectedUser(null)
            }}
            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition-all text-gray-900 placeholder:text-gray-400"
          />
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className={`w-full py-3.5 rounded-xl font-semibold transition-all touch-target ${
            canContinue
              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 shadow-lg shadow-blue-500/25 hover:shadow-xl'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue
        </button>

        {/* Footer */}
        <p className="text-xs text-gray-400 text-center mt-6">
          Real-time collaborative markdown editing
        </p>
      </div>
    </div>
  )
}
