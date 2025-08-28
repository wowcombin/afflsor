'use client'

export interface StatusBadgeProps {
  status: string
  type?: 'withdrawal' | 'card' | 'casino' | 'test' | 'user' | 'work'
  size?: 'sm' | 'md' | 'lg'
}

const statusConfigs = {
  withdrawal: {
    new: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Новый' },
    waiting: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Ожидает' },
    received: { bg: 'bg-green-100', text: 'text-green-800', label: 'Получен' },
    problem: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Проблема' },
    block: { bg: 'bg-red-100', text: 'text-red-800', label: 'Блокирован' }
  },
  card: {
    active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Активна' },
    blocked: { bg: 'bg-red-100', text: 'text-red-800', label: 'Заблокирована' },
    expired: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Истекла' },
    temporarily_unavailable: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Недоступна' }
  },
  casino: {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Ожидает' },
    testing: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Тестируется' },
    approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Одобрено' },
    rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Отклонено' },
    maintenance: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Обслуживание' }
  },
  test: {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Ожидает' },
    in_progress: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'В процессе' },
    completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Завершен' },
    failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Провален' }
  },
  user: {
    active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Активен' },
    inactive: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Неактивен' },
    terminated: { bg: 'bg-red-100', text: 'text-red-800', label: 'Уволен' }
  },
  work: {
    active: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Активна' },
    completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Завершена' },
    cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Отменена' }
  }
}

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-2 text-base'
}

export default function StatusBadge({ status, type = 'withdrawal', size = 'md' }: StatusBadgeProps) {
  const config = statusConfigs[type]?.[status] || {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    label: status
  }

  return (
    <span className={`inline-flex items-center font-semibold rounded-full ${config.bg} ${config.text} ${sizeClasses[size]}`}>
      {config.label}
    </span>
  )
}
