// Enums для статусов
export type UserRole = 'junior' | 'tester' | 'manager' | 'hr' | 'cfo' | 'admin'
export type UserStatus = 'active' | 'inactive' | 'terminated'
export type CardStatus = 'active' | 'blocked' | 'expired' | 'temporarily_unavailable'
export type WithdrawalStatus = 'new' | 'waiting' | 'received' | 'problem' | 'block'
export type CasinoStatus = 'pending' | 'testing' | 'approved' | 'rejected' | 'maintenance'
export type TestStatus = 'pending' | 'in_progress' | 'completed' | 'failed'

// Интерфейсы для таблиц
export interface User {
  id: string
  email: string
  role: UserRole
  status: UserStatus
  first_name?: string
  last_name?: string
  salary_percentage: number
  salary_bonus: number
  created_at: string
}

export interface BankAccount {
  id: string
  bank_id: string
  holder_name: string
  balance: number // КРИТИЧНО: >= 10 для показа карт
  status: 'active' | 'blocked'
}

export interface Card {
  id: string
  bank_account_id: string
  card_number_mask: string
  card_bin: string
  exp_month: number
  exp_year: number
  status: CardStatus
}

export interface WorkWithdrawal {
  id: string
  work_id: string
  withdrawal_amount: number
  status: WithdrawalStatus
  checked_by?: string
  checked_at?: string
  created_at: string
}

export interface Casino {
  id: string
  name: string
  url: string
  status: CasinoStatus
  allowed_bins?: string[]
  manual?: string
  auto_approve_limit: number
  created_at: string
  updated_at: string
}

export interface CasinoTest {
  id: string
  casino_id: string
  tester_id: string
  status: TestStatus
  registration_time?: number
  deposit_success: boolean
  withdrawal_time?: number
  issues_found?: string[]
  recommended_bins?: string[]
  test_result?: 'approved' | 'rejected'
  notes?: string
  created_at: string
  completed_at?: string
}

export interface CasinoManual {
  id: string
  casino_id: string
  version: number
  content: string
  created_by: string
  is_published: boolean
  created_at: string
}

// Database type для Supabase
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: Omit<User, 'id' | 'created_at'>
        Update: Partial<Omit<User, 'id' | 'created_at'>>
      }
      bank_accounts: {
        Row: BankAccount
        Insert: Omit<BankAccount, 'id'>
        Update: Partial<Omit<BankAccount, 'id'>>
      }
      cards: {
        Row: Card
        Insert: Omit<Card, 'id'>
        Update: Partial<Omit<Card, 'id'>>
      }
      work_withdrawals: {
        Row: WorkWithdrawal
        Insert: Omit<WorkWithdrawal, 'id' | 'created_at'>
        Update: Partial<Omit<WorkWithdrawal, 'id' | 'created_at'>>
      }
      casinos: {
        Row: Casino
        Insert: Omit<Casino, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Casino, 'id' | 'created_at' | 'updated_at'>>
      }
      casino_tests: {
        Row: CasinoTest
        Insert: Omit<CasinoTest, 'id' | 'created_at'>
        Update: Partial<Omit<CasinoTest, 'id' | 'created_at'>>
      }
      casino_manuals: {
        Row: CasinoManual
        Insert: Omit<CasinoManual, 'id' | 'created_at'>
        Update: Partial<Omit<CasinoManual, 'id' | 'created_at'>>
      }
    }
  }
}
