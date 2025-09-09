'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import Navigation from '@/components/ui/Navigation'
import { User } from '@/types/database.types'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { addToast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient()
        
        const { data: { user: authUser } } = await supabase.auth.getUser()
        
        if (!authUser) {
          router.push('/auth/login')
          return
        }

        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', authUser.id)
          .single()

        if (error || !userData) {
          console.error('Ошибка загрузки пользователя:', error)
          router.push('/auth/login?error=user_not_found')
          return
        }

        if (userData.status !== 'active') {
          router.push('/auth/login?error=account_disabled')
          return
        }

        setUser(userData)
      } catch (error) {
        console.error('Ошибка аутентификации:', error)
        router.push('/auth/login')
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [router])

  async function handleLogout() {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      
      addToast({
        type: 'info',
        title: 'Выход выполнен',
        description: 'До свидания!'
      })
      
      router.push('/auth/login')
    } catch (error) {
      console.error('Ошибка выхода:', error)
      addToast({
        type: 'error',
        title: 'Ошибка выхода'
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Будет редирект на логин
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Боковая навигация */}
      <Navigation userRole={user.role} />

      {/* Основной контент */}
      <div className="flex-1 flex flex-col">
        {/* Хедер */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-semibold text-gray-900 capitalize">
                  {user.role} Dashboard
                </h1>
                <p className="text-sm text-gray-500">
                  {user.first_name} {user.last_name} • {user.email}
                </p>
              </div>
              
              <button
                onClick={handleLogout}
                className="btn-secondary text-sm"
              >
                Выйти
              </button>
            </div>
          </div>
        </header>

        {/* Контент */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
