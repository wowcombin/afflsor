import { ReactNode } from 'react'
import { clsx } from 'clsx'

interface KPICardProps {
  title: string
  value: string | number
  description?: string
  icon?: ReactNode
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'gray'
  trend?: {
    value: number
    label?: string
    direction: 'up' | 'down' | 'neutral'
  }
  loading?: boolean
  className?: string
}

export default function KPICard({
  title,
  value,
  description,
  icon,
  color = 'gray',
  trend,
  loading = false,
  className
}: KPICardProps) {
  const colorStyles = {
    primary: 'bg-primary-50 text-primary-600',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
    danger: 'bg-danger-50 text-danger-600',
    gray: 'bg-gray-50 text-gray-600'
  }

  const trendStyles = {
    up: 'text-success-600',
    down: 'text-danger-600',
    neutral: 'text-gray-600'
  }

  const trendIcons = {
    up: '↗',
    down: '↘',
    neutral: '→'
  }

  if (loading) {
    return (
      <div className={clsx('card animate-pulse', className)}>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
      </div>
    )
  }

  return (
    <div className={clsx('card hover:shadow-md transition-shadow', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-600 mb-2">
            {title}
          </h3>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {value}
          </div>
          {description && (
            <p className="text-sm text-gray-500">
              {description}
            </p>
          )}
          {trend && (
            <div className={clsx('text-sm font-medium mt-2', trendStyles[trend.direction])}>
              <span className="mr-1">{trendIcons[trend.direction]}</span>
              {trend.value > 0 ? '+' : ''}{trend.value}%
              {trend.label && <span className="ml-1 text-gray-500">{trend.label}</span>}
            </div>
          )}
        </div>
        
        {icon && (
          <div className={clsx('p-3 rounded-lg', colorStyles[color])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
