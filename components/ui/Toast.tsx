'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast = { ...toast, id }
    
    setToasts(prev => [...prev, newToast])

    // Автоматическое удаление через duration (по умолчанию 5 секунд)
    const duration = toast.duration ?? 5000
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

function ToastContainer() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

interface ToastItemProps {
  toast: Toast
  onClose: () => void
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const typeStyles = {
    success: {
      container: 'bg-green-50 border-green-200',
      icon: 'text-green-500',
      title: 'text-green-800',
      description: 'text-green-700'
    },
    error: {
      container: 'bg-red-50 border-red-200',
      icon: 'text-red-500',
      title: 'text-red-800',
      description: 'text-red-700'
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200',
      icon: 'text-yellow-500',
      title: 'text-yellow-800',
      description: 'text-yellow-700'
    },
    info: {
      container: 'bg-blue-50 border-blue-200',
      icon: 'text-blue-500',
      title: 'text-blue-800',
      description: 'text-blue-700'
    }
  }

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: '💡'
  }

  const styles = typeStyles[toast.type]

  return (
    <div className={`max-w-sm w-full border rounded-lg shadow-lg p-4 ${styles.container} animate-slide-in-right`}>
      <div className="flex">
        <div className={`flex-shrink-0 ${styles.icon}`}>
          <span className="text-lg">{icons[toast.type]}</span>
        </div>
        <div className="ml-3 flex-1">
          <p className={`text-sm font-medium ${styles.title}`}>
            {toast.title}
          </p>
          {toast.description && (
            <p className={`mt-1 text-sm ${styles.description}`}>
              {toast.description}
            </p>
          )}
          {toast.action && (
            <div className="mt-3">
              <button
                onClick={toast.action.onClick}
                className={`text-sm font-medium ${styles.title} hover:underline`}
              >
                {toast.action.label}
              </button>
            </div>
          )}
        </div>
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={onClose}
            className={`inline-flex rounded-md p-1.5 ${styles.icon} hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500`}
          >
            <span className="sr-only">Закрыть</span>
            <span className="text-lg">×</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// Хелпер функции для удобного использования
export const toast = {
  success: (title: string, description?: string, options?: Partial<Toast>) => {
    const { addToast } = useToast()
    addToast({ type: 'success', title, description, ...options })
  },
  error: (title: string, description?: string, options?: Partial<Toast>) => {
    const { addToast } = useToast()
    addToast({ type: 'error', title, description, ...options })
  },
  warning: (title: string, description?: string, options?: Partial<Toast>) => {
    const { addToast } = useToast()
    addToast({ type: 'warning', title, description, ...options })
  },
  info: (title: string, description?: string, options?: Partial<Toast>) => {
    const { addToast } = useToast()
    addToast({ type: 'info', title, description, ...options })
  }
}
