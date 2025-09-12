'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import { 
  CogIcon,
  UserIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftRightIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline'

interface UserSettings {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  telegram_username: string | null
  usdt_wallet: string | null
  phone: string | null
  created_at: string
}

export default function SettingsPage() {
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

      const data = await response.json()
      const userData = data.user || data

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
    try {
      setSaving(true)
      
      // Подготавливаем данные для обновления
      const updateData = {
        first_name: formData.first_name?.trim() || null,
        last_name: formData.last_name?.trim() || null,
        telegram_username: formData.telegram_username?.trim()?.replace('@', '') || null,
        usdt_wallet: formData.usdt_wallet?.trim() || null
      }

      // Отправляем запрос к API
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка сохранения настроек')
      }

      const updatedUser = await response.json()
      setSettings(updatedUser)
      
      addToast({
        type: 'success',
        title: 'Настройки сохранены',
        description: 'Ваши настройки успешно обновлены'
      })
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error)
      addToast({
        type: 'error',
        title: 'Ошибка сохранения',
        description: error instanceof Error ? error.message : 'Не удалось сохранить настройки'
      })
    } finally {
      setSaving(false)
    }
  }

  // Обработка изменений в форме
  function handleInputChange(field: keyof typeof formData, value: string) {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Валидация Telegram username
  function validateTelegramUsername(username: string): boolean {
    if (!username) return true // Пустое значение допустимо
    const telegramRegex = /^@?[a-zA-Z0-9_]{5,32}$/
    return telegramRegex.test(username.replace('@', ''))
  }

  // Валидация USDT кошелька
  function validateUsdtWallet(wallet: string): boolean {
    if (!wallet) return true // Пустое значение допустимо
    // Валидация для USDT адресов (только BEP20)
    const bep20Regex = /^0x[a-fA-F0-9]{40}$/ // BEP20 (Binance Smart Chain)
    return bep20Regex.test(wallet)
  }

  // Форматирование отображаемого имени
  function getDisplayName(): string {
    if (settings?.telegram_username) {
      return `@${settings.telegram_username.replace('@', '')}`
    }
    if (settings?.first_name || settings?.last_name) {
      return `${settings.first_name || ''} ${settings.last_name || ''}`.trim()
    }
    return settings?.email || 'Пользователь'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка настроек...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Настройки профиля</h1>
        <p className="text-gray-600">Управление личными данными и настройками аккаунта</p>
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
                <p className="text-gray-900">Junior</p>
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
            Личные данные
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label flex items-center">
                <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
                Telegram Username
              </label>
              <input
                type="text"
                value={formData.telegram_username}
                onChange={(e) => handleInputChange('telegram_username', e.target.value)}
                className={`form-input ${
                  formData.telegram_username && !validateTelegramUsername(formData.telegram_username)
                    ? 'border-red-300 focus:border-red-500'
                    : ''
                }`}
                placeholder="@username"
              />
              {formData.telegram_username && !validateTelegramUsername(formData.telegram_username) && (
                <p className="text-sm text-red-600 mt-1">
                  Некорректный формат
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Приоритетное имя в системе
              </p>
            </div>
            
            <div className="md:col-span-2">
              <label className="form-label flex items-center">
                <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                USDT Кошелек (BEP20)
              </label>
              <div className="relative">
                <input
                  type={showWallet ? "text" : "password"}
                  value={formData.usdt_wallet}
                  onChange={(e) => handleInputChange('usdt_wallet', e.target.value)}
                  className={`form-input pr-10 ${
                    formData.usdt_wallet && !validateUsdtWallet(formData.usdt_wallet)
                      ? 'border-red-300 focus:border-red-500'
                      : ''
                  }`}
                  placeholder="0x1234567890abcdef1234567890abcdef12345678"
                />
                <button
                  type="button"
                  onClick={() => setShowWallet(!showWallet)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showWallet ? (
                    <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {formData.usdt_wallet && !validateUsdtWallet(formData.usdt_wallet) && (
                <p className="text-sm text-red-600 mt-1">
                  Некорректный адрес кошелька. Поддерживается только BEP20 формат (0x...)
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                BEP20 адрес для получения выплат в USDT (Binance Smart Chain)
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={saveSettings}
              disabled={saving || (!!formData.telegram_username && !validateTelegramUsername(formData.telegram_username)) || (!!formData.usdt_wallet && !validateUsdtWallet(formData.usdt_wallet))}
              className="btn-primary"
            >
              {saving ? 'Сохранение...' : 'Сохранить настройки'}
            </button>
          </div>
        </div>
      </div>

      {/* Информация о приоритете отображения */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">📋 Приоритет отображения имени:</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <div>1. <strong>Telegram Username</strong> - если указан, будет отображаться везде</div>
          <div>2. <strong>Имя и Фамилия</strong> - если Telegram не указан</div>
          <div>3. <strong>Email</strong> - если ничего не указано</div>
        </div>
      </div>

      {/* Информация о безопасности */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-900 mb-2">🔒 Безопасность:</h4>
        <div className="text-sm text-yellow-800 space-y-1">
          <div>• USDT кошелек хранится в зашифрованном виде</div>
          <div>• Поддерживается только BEP20 (Binance Smart Chain)</div>
          <div>• Данные передаются по защищенному соединению</div>
          <div>• Доступ к настройкам только у владельца аккаунта</div>
          <div>• Регулярно проверяйте корректность адреса кошелька</div>
        </div>
      </div>
    </div>
  )
}
