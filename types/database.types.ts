// Базовые типы для новой ERP системы

export type UserRole = 'junior' | 'manager' | 'tester' | 'hr' | 'cfo' | 'admin'

export type UserStatus = 'active' | 'inactive' | 'terminated'

export interface User {
  id: string
  auth_id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: UserRole
  status: UserStatus
  telegram_username: string | null
  usdt_wallet: string | null
  salary_percentage: number
  salary_bonus: number
  created_at: string
  updated_at: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginationParams {
  page?: number
  limit?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface FilterParams {
  [key: string]: any
}

// Типы для компонентов
export interface ComponentProps {
  className?: string
  children?: React.ReactNode
}

export interface TableColumn<T = any> {
  key: keyof T | string
  label: string
  sortable?: boolean
  filterable?: boolean
  render?: (item: T) => React.ReactNode
  width?: string
}

export interface ActionButton<T = any> {
  label: string
  action: (item: T) => void | Promise<void>
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  condition?: (item: T) => boolean
  loading?: boolean
}

// Типы для уведомлений
export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
}

// Экспорт всех типов
export type * from './database.types'
