'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

import FormCard from '@/components/ui/FormCard'
import Alert from '@/components/ui/Alert'
import { UserCircleIcon, KeyIcon, CreditCardIcon } from '@heroicons/react/24/outline'

interface User {
  id: string
  email: string
  role: 'junior' | 'manager' | 'hr' | 'cfo' | 'admin' | 'tester'
  first_name?: string
  last_name?: string
  telegram_username?: string
  usdt_wallet?: string
  salary_percentage: number
  salary_bonus: number
  created_at: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    telegram_username: '',
    usdt_wallet: ''
  })
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [showPasswordForm, setShowPasswordForm] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadUser()
  }, [])

  async function loadUser() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (authUser) {
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', authUser.id)
          .single()
        
        if (error) throw error
        
        if (userData) {
          setUser(userData)
          setFormData({
            first_name: userData.first_name || '',
            last_name: userData.last_name || '',
            telegram_username: userData.telegram_username || '',
            usdt_wallet: userData.usdt_wallet || ''
          })
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки пользователя:', error)
      setMessage({ type: 'error', text: 'Ошибка загрузки данных профиля' })
    } finally {
      setLoading(false)
    }
  }

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: formData.first_name || null,
          last_name: formData.last_name || null,
          telegram_username: formData.telegram_username || null,
          usdt_wallet: formData.usdt_wallet || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Профиль успешно обновлен' })
      await loadUser() // Перезагружаем данные
    } catch (error) {
      console.error('Ошибка обновления профиля:', error)
      setMessage({ type: 'error', text: 'Ошибка обновления профиля' })
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ type: 'error', text: 'Пароли не совпадают' })
      return
    }

    if (passwordData.new_password.length < 6) {
      setMessage({ type: 'error', text: 'Пароль должен содержать минимум 6 символов' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new_password
      })

      if (error) throw error

      setMessage({ type: 'success', text: 'Пароль успешно изменен' })
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      })
      setShowPasswordForm(false)
    } catch (error) {
      console.error('Ошибка изменения пароля:', error)
      setMessage({ type: 'error', text: 'Ошибка изменения пароля' })
    } finally {
      setSaving(false)
    }
  }

  function getRoleName(role: string): string {
    const roleNames: { [key: string]: string } = {
      junior: 'Junior',
      manager: 'Manager', 
      tester: 'Tester',
      hr: 'HR специалист',
      cfo: 'CFO',
      admin: 'Администратор'
    }
    return roleNames[role] || role
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="bg-white rounded-lg p-6">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Alert variant="error">Пользователь не найден</Alert>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
        {message && (
          <div className="mb-6">
            <Alert variant={message.type as 'success' | 'error'}>
              {message.text}
            </Alert>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Основная информация */}
          <div className="lg:col-span-2 space-y-6">
            {/* Персональные данные */}
            <FormCard
              title="Персональные данные"
              description="Обновите свою личную информацию"
              icon={<UserCircleIcon className="h-6 w-6 text-blue-600" />}
            >
              <form onSubmit={handleProfileUpdate} className="space-y-4">
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
                      placeholder="Введите имя"
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
                      placeholder="Введите фамилию"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telegram Username
                  </label>
                  <input
                    type="text"
                    value={formData.telegram_username}
                    onChange={(e) => setFormData({ ...formData, telegram_username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="@username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    USDT кошелек
                  </label>
                  <input
                    type="text"
                    value={formData.usdt_wallet}
                    onChange={(e) => setFormData({ ...formData, usdt_wallet: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Адрес USDT кошелька"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? 'Сохранение...' : 'Сохранить изменения'}
                  </button>
                </div>
              </form>
            </FormCard>

            {/* Смена пароля */}
            <FormCard
              title="Безопасность"
              description="Управление паролем и настройки безопасности"
              icon={<KeyIcon className="h-6 w-6 text-red-600" />}
            >
              {!showPasswordForm ? (
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Изменить пароль
                </button>
              ) : (
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Новый пароль
                    </label>
                    <input
                      type="password"
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Введите новый пароль"
                      required
                      minLength={6}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Подтвердите пароль
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Повторите новый пароль"
                      required
                      minLength={6}
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {saving ? 'Изменение...' : 'Изменить пароль'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordForm(false)
                        setPasswordData({
                          current_password: '',
                          new_password: '',
                          confirm_password: ''
                        })
                      }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Отмена
                    </button>
                  </div>
                </form>
              )}
            </FormCard>
          </div>

          {/* Боковая панель с информацией */}
          <div className="space-y-6">
            {/* Информация об аккаунте */}
            <FormCard
              title="Информация об аккаунте"
              icon={<CreditCardIcon className="h-6 w-6 text-green-600" />}
            >
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-500">Email</div>
                  <div className="text-sm text-gray-900">{user.email}</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-gray-500">Роль</div>
                  <div className="text-sm text-gray-900">{getRoleName(user.role)}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500">Процент от прибыли</div>
                  <div className="text-sm text-gray-900">{user.salary_percentage}%</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500">Бонус</div>
                  <div className="text-sm text-gray-900">${user.salary_bonus}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500">Дата регистрации</div>
                  <div className="text-sm text-gray-900">
                    {new Date(user.created_at).toLocaleDateString('ru-RU')}
                  </div>
                </div>
              </div>
            </FormCard>
          </div>
        </div>
      </div>
    )
}
