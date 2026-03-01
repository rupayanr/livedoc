interface NotificationBadgeProps {
  count: number
  max?: number
  variant?: 'default' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md'
  pulse?: boolean
}

const variantStyles = {
  default: 'bg-blue-500 text-white',
  success: 'bg-green-500 text-white',
  warning: 'bg-yellow-400 text-gray-900',
  error: 'bg-red-500 text-white',
}

const sizeStyles = {
  sm: 'min-w-[18px] h-[18px] text-xs px-1',
  md: 'min-w-[22px] h-[22px] text-xs px-1.5',
}

export function NotificationBadge({
  count,
  max = 99,
  variant = 'default',
  size = 'sm',
  pulse = false,
}: NotificationBadgeProps) {
  if (count <= 0) return null

  const displayCount = count > max ? `${max}+` : count.toString()

  return (
    <span
      className={`
        inline-flex items-center justify-center
        rounded-full font-semibold
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${pulse ? 'animate-pulse' : ''}
      `}
      role="status"
      aria-label={`${count} notifications`}
    >
      {displayCount}
    </span>
  )
}

// Dot variant for simple indicators
export function NotificationDot({
  variant = 'default',
  pulse = false,
}: {
  variant?: 'default' | 'success' | 'warning' | 'error'
  pulse?: boolean
}) {
  const dotVariants = {
    default: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-400',
    error: 'bg-red-500',
  }

  return (
    <span
      className={`
        inline-block w-2 h-2 rounded-full
        ${dotVariants[variant]}
        ${pulse ? 'animate-pulse' : ''}
      `}
      role="status"
      aria-label="New notification"
    />
  )
}
