'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface LogoutButtonProps {
  className?: string
}

export default function LogoutButton({ className = '' }: LogoutButtonProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      // Принудительный редирект даже при ошибке
      router.push('/login')
    }
  }

  return (
    <button
      onClick={handleLogout}
      className={`px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors ${className}`}
    >
      Выйти
    </button>
  )
}
