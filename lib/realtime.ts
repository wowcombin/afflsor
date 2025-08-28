import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

let channel: RealtimeChannel | null = null

export function subscribeToNotifications(userId: string, onNotification: (payload: any) => void) {
  const supabase = createClient()
  
  // Отписаться от предыдущего канала
  if (channel) {
    supabase.removeChannel(channel)
  }
  
  // Подписаться на личный канал уведомлений
  channel = supabase
    .channel(`user:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        onNotification(payload.new)
      }
    )
    .subscribe()
  
  return channel
}

export function subscribeToWithdrawals(onUpdate: (payload: any) => void) {
  const supabase = createClient()
  
  const channel = supabase
    .channel('withdrawals-queue')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'work_withdrawals',
        filter: `status=in.(new,waiting)`
      },
      (payload) => {
        onUpdate(payload)
      }
    )
    .subscribe()
  
  return channel
}

export function subscribeToBalanceChanges(onUpdate: (payload: any) => void) {
  const supabase = createClient()
  
  const channel = supabase
    .channel('balance-changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'bank_accounts',
        filter: 'balance=neq.null'
      },
      (payload) => {
        onUpdate(payload)
      }
    )
    .subscribe()
  
  return channel
}

export function subscribeToUserChanges(onUpdate: (payload: any) => void) {
  const supabase = createClient()
  
  const channel = supabase
    .channel('user-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'users'
      },
      (payload) => {
        onUpdate(payload)
      }
    )
    .subscribe()
  
  return channel
}

export function unsubscribe(channel: RealtimeChannel) {
  const supabase = createClient()
  supabase.removeChannel(channel)
}

// Утилита для показа toast уведомлений
export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  // Простая реализация toast (можно заменить на библиотеку)
  const toast = document.createElement('div')
  toast.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
    type === 'success' ? 'bg-green-500' :
    type === 'error' ? 'bg-red-500' :
    'bg-blue-500'
  } text-white`
  toast.textContent = message
  
  document.body.appendChild(toast)
  
  // Автоматически убрать через 5 секунд
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast)
    }
  }, 5000)
}

// Хук для использования в React компонентах
export function useRealtimeSubscription(
  subscriptionType: 'notifications' | 'withdrawals' | 'balance' | 'users',
  userId?: string,
  callback?: (payload: any) => void
) {
  const supabase = createClient()
  
  const subscribe = () => {
    let channel: RealtimeChannel
    
    switch (subscriptionType) {
      case 'notifications':
        if (!userId) throw new Error('userId required for notifications')
        channel = subscribeToNotifications(userId, callback || (() => {}))
        break
      case 'withdrawals':
        channel = subscribeToWithdrawals(callback || (() => {}))
        break
      case 'balance':
        channel = subscribeToBalanceChanges(callback || (() => {}))
        break
      case 'users':
        channel = subscribeToUserChanges(callback || (() => {}))
        break
      default:
        throw new Error('Unknown subscription type')
    }
    
    return channel
  }
  
  const unsubscribeAll = () => {
    if (channel) {
      supabase.removeChannel(channel)
      channel = null
    }
  }
  
  return { subscribe, unsubscribe: unsubscribeAll }
}
