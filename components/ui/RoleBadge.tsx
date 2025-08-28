'use client'

export interface RoleBadgeProps {
  role: string
  size?: 'sm' | 'md' | 'lg'
}

const roleConfigs = {
  junior: { bg: 'bg-green-100', text: 'text-green-800', label: 'Junior' },
  tester: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Tester' },
  manager: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Manager' },
  hr: { bg: 'bg-pink-100', text: 'text-pink-800', label: 'HR' },
  cfo: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'CFO' },
  admin: { bg: 'bg-red-100', text: 'text-red-800', label: 'Admin' },
  ceo: { bg: 'bg-red-100', text: 'text-red-800', label: 'CEO' }
}

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-2 text-base'
}

export default function RoleBadge({ role, size = 'md' }: RoleBadgeProps) {
  const config = roleConfigs[role] || {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    label: role
  }

  return (
    <span className={`inline-flex items-center font-semibold rounded-full ${config.bg} ${config.text} ${sizeClasses[size]}`}>
      {config.label}
    </span>
  )
}
