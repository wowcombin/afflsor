'use client'
import { ReactNode } from 'react'

export interface KPICardProps {
  title: string
  value: number | string
  format?: 'currency' | 'percentage' | 'number' | 'text'
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
    label?: string
  }
  icon?: ReactNode
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray'
  footer?: ReactNode
  loading?: boolean
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-600',
    icon: 'text-blue-500'
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-600',
    icon: 'text-green-500'
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-600',
    icon: 'text-red-500'
  },
  yellow: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-600',
    icon: 'text-yellow-500'
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-600',
    icon: 'text-purple-500'
  },
  gray: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-600',
    icon: 'text-gray-500'
  }
}

export default function KPICard({
  title,
  value,
  format = 'number',
  trend,
  icon,
  color = 'blue',
  footer,
  loading = false
}: KPICardProps) {
  const colors = colorClasses[color]

  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val
    
    switch (format) {
      case 'currency':
        return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      case 'percentage':
        return `${val.toFixed(1)}%`
      case 'number':
        return val.toLocaleString()
      default:
        return String(val)
    }
  }

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up':
        return '↗'
      case 'down':
        return '↘'
      default:
        return '→'
    }
  }

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md border animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-6 w-6 bg-gray-200 rounded"></div>
        </div>
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
      </div>
    )
  }

  return (
    <div className={`bg-white p-6 rounded-lg shadow-md border ${colors.border} hover:shadow-lg transition-shadow`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        {icon && (
          <div className={`${colors.icon}`}>
            {icon}
          </div>
        )}
      </div>
      
      <div className="mb-2">
        <div className={`text-3xl font-bold ${colors.text}`}>
          {formatValue(value)}
        </div>
      </div>

      {trend && (
        <div className="flex items-center text-sm">
          <span className={`${getTrendColor(trend.direction)} mr-1`}>
            {getTrendIcon(trend.direction)} {Math.abs(trend.value)}%
          </span>
          <span className="text-gray-500">
            {trend.label || 'vs прошлый период'}
          </span>
        </div>
      )}

      {footer && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          {footer}
        </div>
      )}
    </div>
  )
}
