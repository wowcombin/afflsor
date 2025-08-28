import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

export function createClient() {
  // Проверяем, что мы в браузере и переменные окружения доступны
  if (typeof window === 'undefined') {
    throw new Error('createClient should only be called on the client side')
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}
