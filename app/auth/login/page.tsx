'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

export default function LoginPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      
      // Аутентификация через Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      })

      if (authError) {
        throw new Error(authError.message)
      }

      if (!authData.user) {
        throw new Error('Ошибка аутентификации')
      }

      // Получаем данные пользователя из нашей таблицы users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, status, first_name, last_name')
        .eq('auth_id', authData.user.id)
        .single()

      if (userError || !userData) {
        throw new Error('Пользователь не найден в системе')
      }

      // Проверяем статус пользователя
      if (userData.status === 'terminated') {
        throw new Error('Ваш аккаунт был деактивирован. Обратитесь к HR для получения информации.')
      }

      if (userData.status === 'inactive') {
        throw new Error('Ваш аккаунт временно заблокирован. Обратитесь к администратору.')
      }

      if (userData.status !== 'active') {
        throw new Error('Аккаунт заблокирован. Обратитесь к администратору.')
      }

      // Редирект по роли
      const roleRoutes = {
        junior: '/dashboard/junior',
        manager: '/dashboard/manager', 
        tester: '/dashboard/tester',
        hr: '/dashboard/hr',
        cfo: '/dashboard/cfo',
        admin: '/dashboard/admin'
      }

      const redirectPath = roleRoutes[userData.role as keyof typeof roleRoutes] || '/dashboard'
      
      addToast({
        type: 'success',
        title: 'Добро пожаловать!',
        description: `Вход выполнен как ${userData.role}`
      })
      
      router.push(redirectPath)

    } catch (error: any) {
      console.error('Ошибка входа:', error)
      setError(error.message || 'Ошибка входа в систему')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-primary-600 rounded-full flex items-center justify-center mb-6">
            <span className="text-2xl font-bold text-white">A</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Afflsor ERP
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Войдите в систему управления
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-danger-50 border border-danger-200 rounded-lg p-4">
                <div className="text-sm text-danger-700">{error}</div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="form-label">
                Email адрес
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="form-input"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="form-label">
                Пароль
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="form-input pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="loading-spinner mr-2"></div>
                    Вход в систему...
                  </>
                ) : (
                  'Войти'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Afflsor ERP System v2.0 • Безопасный вход
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
