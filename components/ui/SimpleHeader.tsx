'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UserCircleIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'

interface User {
  id: string
  email: string
  role: 'junior' | 'manager' | 'hr' | 'cfo' | 'admin' | 'tester'
  first_name?: string
  last_name?: string
}

export default function SimpleHeader() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Проверяем, что мы в браузере
    if (typeof window !== 'undefined') {
      loadUser()
    } else {
      setLoading(false)
    }
  }, [])

  async function loadUser() {
    try {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (authUser) {
        const { data: userData } = await supabase
          .from('users')
          .select('id, email, role, first_name, last_name')
          .eq('auth_id', authUser.id)
          .single()
        
        if (userData) {
          setUser(userData)
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки пользователя:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Ошибка выхода:', error)
    }
  }

  function getRoleName(role: string): string {
    const roleNames: { [key: string]: string } = {
      junior: 'Junior',
      manager: 'Manager', 
      tester: 'Tester',
      hr: 'HR',
      cfo: 'CFO',
      admin: 'Admin'
    }
    return roleNames[role] || 'Dashboard'
  }

  if (loading) {
    return (
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="animate-pulse bg-gray-200 h-6 w-48 rounded"></div>
            <div className="animate-pulse bg-gray-200 h-8 w-8 rounded-full"></div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Левая часть - логотип/название */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">
              ERP System
            </h1>
            {user && (
              <span className="ml-3 text-sm text-gray-500">
                {getRoleName(user.role)}
              </span>
            )}
          </div>

          {/* Правая часть - профиль пользователя */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center space-x-3 p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="text-right">
                <div className="text-sm font-medium">
                  {user?.first_name && user?.last_name 
                    ? `${user.first_name} ${user.last_name}`
                    : user?.email
                  }
                </div>
                <div className="text-xs text-gray-500 capitalize">
                  {getRoleName(user?.role || '')}
                </div>
              </div>
              <UserCircleIcon className="h-8 w-8 text-gray-400" />
            </button>

            {/* Выпадающее меню профиля */}
            {showProfileMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowProfileMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                  <div className="p-3 border-b border-gray-100">
                    <div className="text-sm font-medium text-gray-900">
                      {user?.first_name && user?.last_name 
                        ? `${user.first_name} ${user.last_name}`
                        : 'Пользователь'
                      }
                    </div>
                    <div className="text-xs text-gray-500">{user?.email}</div>
                    <div className="text-xs text-blue-600 capitalize mt-1">
                      {getRoleName(user?.role || '')}
                    </div>
                  </div>

                  <div className="py-2">
                    <button
                      onClick={() => {
                        router.push('/profile')
                        setShowProfileMenu(false)
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <Cog6ToothIcon className="h-4 w-4 mr-3 text-gray-400" />
                      Настройки профиля
                    </button>

                    <button
                      onClick={() => {
                        handleLogout()
                        setShowProfileMenu(false)
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3 text-red-500" />
                      Выйти
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
