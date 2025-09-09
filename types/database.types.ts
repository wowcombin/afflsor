// Типы для Afflsor ERP System v2.0 - согласно реальной структуре БД

export type UserRole = 'junior' | 'manager' | 'teamlead' | 'tester' | 'hr' | 'cfo' | 'admin' | 'ceo' | 'qa_assistant'
export type UserStatus = 'active' | 'inactive' | 'terminated'
export type CardType = 'grey' | 'gold' | 'platinum' | 'black'
export type CardStatus = 'active' | 'inactive' | 'blocked' | 'expired'
export type ActionType = 'create' | 'update' | 'delete' | 'assign' | 'unassign' | 'approve' | 'reject'
export type CasinoStatus = 'active' | 'inactive' | 'testing' | 'approved' | 'rejected'
export type TestResult = 'pending' | 'passed' | 'failed' | 'cancelled'
export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled'
export type ExpenseStatus = 'pending' | 'approved' | 'rejected' | 'paid'

// Основные сущности
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
  team_lead_id: string | null
  team_lead_name: string | null
  team_chat_link: string | null
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  name: string
  description: string | null
  chat_link: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: 'member' | 'leader' | 'admin'
  joined_at: string
  user?: User
  team?: Team
}

export interface Bank {
  id: string
  name: string
  country: string | null
  currency: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BankAccount {
  id: string
  bank_id: string
  holder_name: string
  account_number: string | null
  balance: number
  currency: string
  is_active: boolean
  balance_updated_at: string
  balance_updated_by: string | null
  sort_code: string | null
  bank_url: string | null
  login_password: string | null
  created_at: string
  updated_at: string
  // Relations
  bank?: Bank
  balance_updated_by_user?: User
}

export interface Card {
  id: string
  bank_account_id: string
  card_number_mask: string
  card_bin: string
  card_type: CardType
  exp_month: number
  exp_year: number
  status: CardStatus
  assigned_to: string | null
  assigned_at: string | null
  assigned_casino_id: string | null
  daily_limit: number | null
  full_card_number: string | null
  cvv: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Relations
  bank_account?: BankAccount
  assigned_user?: User
  assigned_casino?: Casino
}

export interface CardSecret {
  id: string
  card_id: string
  pan_encrypted: string
  cvv_encrypted: string
  encryption_key_id: string
  created_at: string
}

export interface Casino {
  id: string
  name: string
  url: string | null
  company: string | null
  promo: string | null
  currency: string
  status: CasinoStatus
  accepted_bins: string[] | null
  rejected_bins: string[] | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  // Relations
  created_by_user?: User
}

export interface CasinoTest {
  id: string
  casino_id: string
  tester_id: string
  card_id: string | null
  test_result: TestResult
  status: string
  deposit_amount: number | null
  deposit_date: string | null
  withdrawal_amount: number | null
  withdrawal_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Relations
  casino?: Casino
  tester?: User
  card?: Card
}

export interface TestWithdrawal {
  id: string
  work_id: string
  withdrawal_amount: number
  withdrawal_status: WithdrawalStatus
  withdrawal_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Relations
  work?: CasinoTest
}

export interface Expense {
  id: string
  title: string
  description: string | null
  amount: number
  currency: string
  category: string
  status: ExpenseStatus
  expense_date: string
  receipt_url: string | null
  created_by: string
  approved_by: string | null
  created_at: string
  updated_at: string
  // Relations
  created_by_user?: User
  approved_by_user?: User
}

export interface SalaryCalculation {
  id: string
  employee_id: string
  month: string
  base_salary: number
  bonus_amount: number
  total_amount: number
  currency: string
  calculated_by: string
  created_at: string
  updated_at: string
  // Relations
  employee?: User
  calculated_by_user?: User
}

export interface ActionHistory {
  id: string
  action_type: ActionType
  entity_type: string
  entity_id: string
  entity_name: string | null
  old_values: Record<string, any> | null
  new_values: Record<string, any> | null
  change_description: string
  performed_by: string
  ip_address: string | null
  user_agent: string | null
  created_at: string
  // Relations
  performed_by_user?: User
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
