'use client'
import { ReactNode } from 'react'

export interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  children: ReactNode
  icon?: ReactNode
  actions?: ReactNode
  onClose?: () => void
}

const variantClasses = {
  info: {
    container: 'bg-blue-50 border-blue-200',
    icon: 'text-blue-500',
    title: 'text-blue-800',
    text: 'text-blue-700'
  },
  success: {
    container: 'bg-green-50 border-green-200',
    icon: 'text-green-500',
    title: 'text-green-800',
    text: 'text-green-700'
  },
  warning: {
    container: 'bg-yellow-50 border-yellow-200',
    icon: 'text-yellow-500',
    title: 'text-yellow-800',
    text: 'text-yellow-700'
  },
  error: {
    container: 'bg-red-50 border-red-200',
    icon: 'text-red-500',
    title: 'text-red-800',
    text: 'text-red-700'
  }
}

const defaultIcons = {
  info: '💡',
  success: '✅',
  warning: '⚠️',
  error: '❌'
}

export default function Alert({ 
  variant = 'info', 
  title, 
  children, 
  icon, 
  actions, 
  onClose 
}: AlertProps) {
  const classes = variantClasses[variant]
  const defaultIcon = defaultIcons[variant]

  return (
    <div className={`border rounded-lg p-4 ${classes.container}`}>
      <div className="flex">
        <div className={`flex-shrink-0 ${classes.icon}`}>
          {icon || <span className="text-lg">{defaultIcon}</span>}
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-medium ${classes.title}`}>
              {title}
            </h3>
          )}
          <div className={`${title ? 'mt-2' : ''} text-sm ${classes.text}`}>
            {children}
          </div>
          {actions && (
            <div className="mt-4">
              {actions}
            </div>
          )}
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <button
              onClick={onClose}
              className={`inline-flex rounded-md p-1.5 ${classes.icon} hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 focus:ring-gray-600`}
            >
              <span className="sr-only">Закрыть</span>
              <span className="text-lg">×</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
