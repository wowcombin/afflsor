import { clsx } from 'clsx'

export type StatusType = 
  | 'active' | 'inactive' | 'terminated'  // User statuses
  | 'pending' | 'approved' | 'rejected'   // General statuses
  | 'new' | 'waiting' | 'received' | 'problem' | 'block'  // Withdrawal statuses
  | 'available' | 'assigned' | 'expired' | 'blocked'  // Card statuses
  | 'testing' | 'live' | 'maintenance'  // Casino statuses

interface StatusBadgeProps {
  status: StatusType | string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function StatusBadge({ 
  status, 
  size = 'md', 
  className 
}: StatusBadgeProps) {
  const statusConfig = {
    // User statuses
    active: { label: 'Активен', color: 'bg-success-100 text-success-800' },
    inactive: { label: 'Неактивен', color: 'bg-gray-100 text-gray-800' },
    terminated: { label: 'Уволен', color: 'bg-danger-100 text-danger-800' },
    
    // General statuses
    pending: { label: 'Ожидает', color: 'bg-warning-100 text-warning-800' },
    approved: { label: 'Одобрено', color: 'bg-success-100 text-success-800' },
    rejected: { label: 'Отклонено', color: 'bg-danger-100 text-danger-800' },
    
    // Withdrawal statuses
    new: { label: 'Новый', color: 'bg-primary-100 text-primary-800' },
    waiting: { label: 'Ожидает', color: 'bg-warning-100 text-warning-800' },
    received: { label: 'Получен', color: 'bg-success-100 text-success-800' },
    problem: { label: 'Проблема', color: 'bg-danger-100 text-danger-800' },
    block: { label: 'Заблокирован', color: 'bg-gray-100 text-gray-800' },
    
    // Card statuses
    available: { label: 'Доступна', color: 'bg-success-100 text-success-800' },
    assigned: { label: 'Назначена', color: 'bg-primary-100 text-primary-800' },
    expired: { label: 'Истекла', color: 'bg-danger-100 text-danger-800' },
    blocked: { label: 'Заблокирована', color: 'bg-gray-100 text-gray-800' },
    
    // Casino statuses
    testing: { label: 'Тестирование', color: 'bg-warning-100 text-warning-800' },
    live: { label: 'Активно', color: 'bg-success-100 text-success-800' },
    maintenance: { label: 'Обслуживание', color: 'bg-gray-100 text-gray-800' },
  }

  const config = statusConfig[status as keyof typeof statusConfig] || {
    label: status,
    color: 'bg-gray-100 text-gray-800'
  }

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm'
  }

  return (
    <span className={clsx(
      'status-badge inline-flex items-center font-medium rounded-full',
      config.color,
      sizeStyles[size],
      className
    )}>
      {config.label}
    </span>
  )
}
