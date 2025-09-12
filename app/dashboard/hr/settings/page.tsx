'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import { 
  CogIcon,
  UserIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftRightIcon,
  EyeIcon,
  EyeSlashIcon,
  UsersIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'

interface UserSettings {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  telegram_username: string | null
  usdt_wallet: string | null
  phone: string | null
  role: string
  created_at: string
}

export default function HRSettingsPage() {
  const { addToast } = useToast()
  
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showWallet, setShowWallet] = useState(false)
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    telegram_username: '',
    usdt_wallet: ''
  })

  // Загрузка настроек пользователя
  useEffect(() => {
    loadUserSettings()
  }, [])

  async function loadUserSettings() {
    try {
      setLoading(true)
      
      // Загружаем данные пользователя через API
      const response = await fetch('/api/users/me')
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить настройки пользователя')
      }

      const userData = await response.json()

      setSettings(userData)
      
      // Заполняем форму текущими данными
      setFormData({
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        telegram_username: userData.telegram_username || '',
        usdt_wallet: userData.usdt_wallet || ''
      })
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error)
      addToast({
        type: 'error',
        title: 'Ошибка загрузки',
        description: 'Не удалось загрузить настройки пользователя'
      })
    } finally {
      setLoading(false)
    }
  }

  // Сохранение настроек
  async function saveSettings() {
    if (!settings) return

    try {
      setSaving(true)

      const response = await fetch(`/api/users/${settings.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          telegram_username: formData.telegram_username,
          usdt_wallet: formData.usdt_wallet
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Не удалось сохранить настройки')
      }

      addToast({
        type: 'success',
        title: 'Настройки сохранены',
        description: 'Ваши настройки успешно обновлены'
      })

      // Перезагружаем настройки
      await loadUserSettings()

    } catch (error: any) {
      console.error('Ошибка сохранения настроек:', error)
      addToast({
        type: 'error',
        title: 'Ошибка сохранения',
        description: error.message
      })
    } finally {
      setSaving(false)
    }
  }

  function getDisplayName() {
    if (!settings) return 'Не указано'
    
    const firstName = settings.first_name || ''
    const lastName = settings.last_name || ''
    
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim()
    }
    
    return settings.email
  }

  function handleInputChange(field: string, value: string) {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  function toggleWalletVisibility() {
    setShowWallet(!showWallet)
  }

  function maskWallet(wallet: string) {
    if (!wallet) return ''
    if (wallet.length <= 8) return wallet
    return wallet.substring(0, 4) + '***' + wallet.substring(wallet.length - 4)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка настроек...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Настройки профиля</h1>
        <p className="text-gray-600">Управление личными данными и настройками HR аккаунта</p>
      </div>

      {/* Информация о пользователе */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center">
            <UserIcon className="h-5 w-5 mr-2" />
            Информация о пользователе
          </h3>
        </div>
        <div className="card-content">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-gray-900">{settings?.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Отображаемое имя</label>
                <p className="text-gray-900">{getDisplayName()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Роль</label>
                <p className="text-gray-900">HR</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Дата регистрации</label>
                <p className="text-gray-900">
                  {settings?.created_at ? new Date(settings.created_at).toLocaleDateString('ru-RU') : 'Не указана'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Форма настроек */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center">
            <CogIcon className="h-5 w-5 mr-2" />
            Личные настройки
          </h3>
        </div>
        <div className="card-content space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Имя</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                className="form-input"
                placeholder="Введите ваше имя"
              />
            </div>
            <div>
              <label className="form-label">Фамилия</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                className="form-input"
                placeholder="Введите вашу фамилию"
              />
            </div>
          </div>

          <div>
            <label className="form-label flex items-center">
              <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
              Telegram Username
            </label>
            <input
              type="text"
              value={formData.telegram_username}
              onChange={(e) => handleInputChange('telegram_username', e.target.value)}
              className="form-input"
              placeholder="@username"
            />
            <p className="text-sm text-gray-500 mt-1">
              Используется для связи и уведомлений
            </p>
          </div>

          <div>
            <label className="form-label flex items-center">
              <CurrencyDollarIcon className="h-4 w-4 mr-2" />
              USDT кошелек
            </label>
            <div className="relative">
              <input
                type={showWallet ? "text" : "password"}
                value={formData.usdt_wallet}
                onChange={(e) => handleInputChange('usdt_wallet', e.target.value)}
                className="form-input pr-10"
                placeholder="Введите адрес USDT кошелька"
              />
              <button
                type="button"
                onClick={toggleWalletVisibility}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showWallet ? (
                  <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                ) : (
                  <EyeIcon className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Для получения выплат и бонусов
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Сохранение...' : 'Сохранить настройки'}
            </button>
          </div>
        </div>
      </div>

      {/* HR функции */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center">
            <UsersIcon className="h-5 w-5 mr-2" />
            HR функции
          </h3>
        </div>
        <div className="card-content">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-3">Доступные возможности</h4>
            <div className="text-sm text-blue-800 space-y-2">
              <div className="flex items-center">
                <UsersIcon className="h-4 w-4 mr-2" />
                Управление сотрудниками и их ролями
              </div>
              <div className="flex items-center">
                <DocumentTextIcon className="h-4 w-4 mr-2" />
                Управление NDA и документооборотом
              </div>
              <div className="flex items-center">
                <CogIcon className="h-4 w-4 mr-2" />
                Настройка организационной структуры
              </div>
              <div className="flex items-center">
                <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
                Управление командами и чатами
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Безопасность */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Безопасность</h3>
        </div>
        <div className="card-content">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Важно:</strong> Как HR сотрудник, вы имеете доступ к конфиденциальной информации. 
              Убедитесь, что ваши данные актуальны и безопасны. При смене контактных данных 
              обязательно обновите их в настройках.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
