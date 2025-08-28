'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import FormCard from '@/components/ui/FormCard'
import Alert from '@/components/ui/Alert'
import { useToast } from '@/components/ui/Toast'

interface User {
  id: string
  email: string
  role: 'junior' | 'manager' | 'hr' | 'cfo' | 'admin' | 'tester'
  status: 'active' | 'inactive' | 'terminated'
  first_name?: string
  last_name?: string
  telegram_username?: string
  usdt_wallet?: string
  salary_percentage: number
  salary_bonus: number
  created_at: string
  updated_at: string
}

export default function EditUserPage() {
  const router = useRouter()
  const params = useParams()
  const { addToast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    role: 'junior' as User['role'],
    status: 'active' as User['status'],
    first_name: '',
    last_name: '',
    telegram_username: '',
    usdt_wallet: '',
    salary_percentage: '10',
    salary_bonus: '0'
  })

  useEffect(() => {
    if (params.id) {
      loadUser(params.id as string)
    }
  }, [params.id])

  async function loadUser(userId: string) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error

      setUser(data)
      setFormData({
        email: data.email,
        role: data.role,
        status: data.status,
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        telegram_username: data.telegram_username || '',
        usdt_wallet: data.usdt_wallet || '',
        salary_percentage: data.salary_percentage.toString(),
        salary_bonus: data.salary_bonus.toString()
      })
    } catch (error) {
      console.error('Ошибка загрузки пользователя:', error)
      addToast('Пользователь не найден', 'error')
      router.push('/hr/users')
    } finally {
      setLoading(false)
    }
  }

  function validateUSDTWallet(wallet: string): boolean {
    if (!wallet) return true // Пустой кошелек допустим
    return /^T[A-Za-z0-9]{33}$/.test(wallet)
  }

  function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    // Валидация
    if (!validateEmail(formData.email)) {
      addToast('Некорректный email адрес', 'error')
      return
    }
    
    if (formData.usdt_wallet && !validateUSDTWallet(formData.usdt_wallet)) {
      addToast('Некорректный USDT кошелек (должен быть TRC20)', 'error')
      return
    }
    
    const percentage = parseFloat(formData.salary_percentage)
    if (percentage < 0 || percentage > 100) {
      addToast('Процент зарплаты должен быть от 0 до 100', 'error')
      return
    }

    const bonus = parseFloat(formData.salary_bonus)
    if (bonus < 0) {
      addToast('Бонус не может быть отрицательным', 'error')
      return
    }

    setSaving(true)

    try {
      const supabase = createClient()
      
      const updateData = {
        email: formData.email,
        role: formData.role,
        status: formData.status,
        first_name: formData.first_name || null,
        last_name: formData.last_name || null,
        telegram_username: formData.telegram_username || null,
        usdt_wallet: formData.usdt_wallet || null,
        salary_percentage: percentage,
        salary_bonus: bonus,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user!.id)

      if (error) throw error

      addToast('Пользователь успешно обновлен', 'success')
      router.push('/hr/users')
    } catch (error: any) {
      console.error('Ошибка обновления пользователя:', error)
      if (error.code === '23505') {
        addToast('Пользователь с таким email уже существует', 'error')
      } else {
        addToast('Ошибка обновления пользователя', 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleResetPassword() {
    if (!user) return

    try {
      const supabase = createClient()
      
      // Генерируем новый пароль
      const newPassword = Math.random().toString(36).slice(-12)
      
      // Обновляем пароль через Supabase Auth Admin API
      const { error } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
      )

      if (error) throw error

      addToast(`Новый пароль: ${newPassword}`, 'success')
    } catch (error) {
      console.error('Ошибка сброса пароля:', error)
      addToast('Ошибка сброса пароля', 'error')
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="bg-white rounded-lg p-6 space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-8">
        <Alert variant="error">Пользователь не найден</Alert>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Редактирование пользователя
        </h1>
        <div className="flex space-x-3">
          <button
            onClick={handleResetPassword}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            Сбросить пароль
          </button>
          <button
            onClick={() => router.push('/hr/users')}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            Отмена
          </button>
        </div>
      </div>

      <div className="max-w-2xl">
        <FormCard title="Основная информация">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Role and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Роль *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="junior">Junior</option>
                  <option value="manager">Manager</option>
                  <option value="tester">Tester</option>
                  <option value="hr">HR</option>
                  <option value="cfo">CFO</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Статус *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as User['status'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="active">Активный</option>
                  <option value="inactive">Неактивный</option>
                  <option value="terminated">Уволен</option>
                </select>
              </div>
            </div>

            {/* Personal Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Имя
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Фамилия
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telegram Username
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">@</span>
                <input
                  type="text"
                  value={formData.telegram_username}
                  onChange={(e) => setFormData({ ...formData, telegram_username: e.target.value })}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                USDT Кошелек (TRC20)
              </label>
              <input
                type="text"
                value={formData.usdt_wallet}
                onChange={(e) => setFormData({ ...formData, usdt_wallet: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXx"
              />
            </div>

            {/* Salary Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Процент от прибыли (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.salary_percentage}
                  onChange={(e) => setFormData({ ...formData, salary_percentage: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Фиксированный бонус ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.salary_bonus}
                  onChange={(e) => setFormData({ ...formData, salary_bonus: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.push('/hr/users')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
            </div>
          </form>
        </FormCard>

        {/* User Info */}
        <div className="mt-6">
          <FormCard title="Системная информация">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-500">ID пользователя:</span>
                <div className="font-mono text-gray-900">{user.id}</div>
              </div>
              <div>
                <span className="font-medium text-gray-500">Дата создания:</span>
                <div className="text-gray-900">
                  {new Date(user.created_at).toLocaleString('ru-RU')}
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-500">Последнее обновление:</span>
                <div className="text-gray-900">
                  {new Date(user.updated_at).toLocaleString('ru-RU')}
                </div>
              </div>
            </div>
          </FormCard>
        </div>
      </div>
    </div>
  )
}
