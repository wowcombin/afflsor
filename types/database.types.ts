// Enums для статусов
export type UserRole = 'junior' | 'manager' | 'hr' | 'cfo' | 'admin'
export type UserStatus = 'active' | 'inactive' | 'terminated'
export type CardStatus = 'active' | 'blocked' | 'expired' | 'temporarily_unavailable'
export type WithdrawalStatus = 'new' | 'waiting' | 'received' | 'problem' | 'block'

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
    }
  }
}
