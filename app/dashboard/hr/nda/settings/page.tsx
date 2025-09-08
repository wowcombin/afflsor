'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import { 
  Cog6ToothIcon,
  ClockIcon,
  DocumentTextIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'

interface NDASetting {
  key: string
  value: string
  description: string
}

export default function NDASettingsPage() {
  const { addToast } = useToast()
  
  const [settings, setSettings] = useState({
    link_expiry_hours: '168', // 7 дней по умолчанию
    auto_reminder_enabled: true,
    reminder_days: '3',
    require_selfie: true,
    require_passport_photo: true,
    max_file_size_mb: '10',
    allowed_file_types: 'pdf,jpg,jpeg,png'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      // В реальном приложении здесь будет API для получения настроек
      // Пока используем значения по умолчанию
      setLoading(false)
    } catch (error) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Не удалось загрузить настройки' })
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      // В реальном приложении здесь будет API для сохранения настроек
      await new Promise(resolve => setTimeout(resolve, 1000)) // Имитация запроса
      
      addToast({ 
        type: 'success', 
        title: 'Успешно', 
        description: 'Настройки сохранены' 
      })
    } catch (error) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Не удалось сохранить настройки' })
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = () => {
    if (confirm('Вы уверены, что хотите сбросить все настройки к значениям по умолчанию?')) {
      setSettings({
        link_expiry_hours: '168',
        auto_reminder_enabled: true,
        reminder_days: '3',
        require_selfie: true,
        require_passport_photo: true,
        max_file_size_mb: '10',
        allowed_file_types: 'pdf,jpg,jpeg,png'
      })
      addToast({ 
        type: 'success', 
        title: 'Сброшено', 
        description: 'Настройки сброшены к значениям по умолчанию' 
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-lg text-gray-500">Загрузка настроек...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Настройки системы NDA</h2>
          <p className="text-sm text-gray-500">Конфигурация параметров соглашений о неразглашении</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetToDefaults}
            className="btn-secondary"
          >
            Сбросить к умолчанию
          </button>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : 'Сохранить настройки'}
          </button>
        </div>
      </div>

      {/* Настройки ссылок */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center">
            <ClockIcon className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Настройки ссылок</h3>
              <p className="text-sm text-gray-500">Параметры генерации и срока действия ссылок</p>
            </div>
          </div>
        </div>
        <div className="card-body space-y-4">
          <div>
            <label className="form-label">Срок действия ссылки (часы)</label>
            <input
              type="number"
              value={settings.link_expiry_hours}
              onChange={(e) => setSettings(prev => ({ ...prev, link_expiry_hours: e.target.value }))}
              className="form-input w-full max-w-xs"
              min="1"
              max="8760"
            />
            <p className="text-sm text-gray-500 mt-1">
              Время в часах, в течение которого ссылка остается активной (1-8760 часов)
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="auto_reminder"
              checked={settings.auto_reminder_enabled}
              onChange={(e) => setSettings(prev => ({ ...prev, auto_reminder_enabled: e.target.checked }))}
              className="mr-3"
            />
            <div>
              <label htmlFor="auto_reminder" className="form-label mb-0">
                Автоматические напоминания
              </label>
              <p className="text-sm text-gray-500">
                Отправлять напоминания сотрудникам о необходимости подписать NDA
              </p>
            </div>
          </div>

          {settings.auto_reminder_enabled && (
            <div className="ml-6">
              <label className="form-label">Напоминать через (дни)</label>
              <input
                type="number"
                value={settings.reminder_days}
                onChange={(e) => setSettings(prev => ({ ...prev, reminder_days: e.target.value }))}
                className="form-input w-full max-w-xs"
                min="1"
                max="30"
              />
              <p className="text-sm text-gray-500 mt-1">
                Количество дней после создания ссылки для отправки напоминания
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Настройки документов */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center">
            <DocumentTextIcon className="w-6 h-6 text-green-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Требования к документам</h3>
              <p className="text-sm text-gray-500">Настройка обязательных документов и файлов</p>
            </div>
          </div>
        </div>
        <div className="card-body space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="require_passport"
              checked={settings.require_passport_photo}
              onChange={(e) => setSettings(prev => ({ ...prev, require_passport_photo: e.target.checked }))}
              className="mr-3"
            />
            <div>
              <label htmlFor="require_passport" className="form-label mb-0">
                Обязательное фото документа
              </label>
              <p className="text-sm text-gray-500">
                Требовать загрузку фотографии паспорта или удостоверения личности
              </p>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="require_selfie"
              checked={settings.require_selfie}
              onChange={(e) => setSettings(prev => ({ ...prev, require_selfie: e.target.checked }))}
              className="mr-3"
            />
            <div>
              <label htmlFor="require_selfie" className="form-label mb-0">
                Обязательное селфи с документом
              </label>
              <p className="text-sm text-gray-500">
                Требовать загрузку селфи с документом в руках для верификации
              </p>
            </div>
          </div>

          <div>
            <label className="form-label">Максимальный размер файла (МБ)</label>
            <input
              type="number"
              value={settings.max_file_size_mb}
              onChange={(e) => setSettings(prev => ({ ...prev, max_file_size_mb: e.target.value }))}
              className="form-input w-full max-w-xs"
              min="1"
              max="50"
            />
            <p className="text-sm text-gray-500 mt-1">
              Максимальный размер загружаемых файлов в мегабайтах
            </p>
          </div>

          <div>
            <label className="form-label">Разрешенные типы файлов</label>
            <input
              type="text"
              value={settings.allowed_file_types}
              onChange={(e) => setSettings(prev => ({ ...prev, allowed_file_types: e.target.value }))}
              className="form-input w-full max-w-md"
              placeholder="pdf,jpg,jpeg,png"
            />
            <p className="text-sm text-gray-500 mt-1">
              Список разрешенных расширений файлов через запятую
            </p>
          </div>
        </div>
      </div>

      {/* Настройки безопасности */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center">
            <ShieldCheckIcon className="w-6 h-6 text-red-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Безопасность</h3>
              <p className="text-sm text-gray-500">Параметры безопасности и доступа</p>
            </div>
          </div>
        </div>
        <div className="card-body space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-2">⚠️ Важная информация</h4>
            <div className="text-sm text-yellow-800 space-y-1">
              <p>• Доступ к NDA записям имеют только HR, Manager и Admin</p>
              <p>• Все файлы хранятся в защищенном хранилище Supabase</p>
              <p>• Ссылки для подписания содержат уникальные токены безопасности</p>
              <p>• Истекшие ссылки автоматически становятся недоступными</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 border rounded-lg">
              <h5 className="font-medium text-gray-900 mb-2">Роли с доступом к NDA</h5>
              <ul className="space-y-1 text-gray-600">
                <li>• HR - полный доступ</li>
                <li>• Manager - полный доступ</li>
                <li>• Admin - полный доступ</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg">
              <h5 className="font-medium text-gray-900 mb-2">Хранение данных</h5>
              <ul className="space-y-1 text-gray-600">
                <li>• Файлы: Supabase Storage</li>
                <li>• Данные: PostgreSQL с RLS</li>
                <li>• Шифрование: TLS/SSL</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Информация о системе */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center">
            <Cog6ToothIcon className="w-6 h-6 text-gray-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Информация о системе</h3>
              <p className="text-sm text-gray-500">Текущие параметры и статистика</p>
            </div>
          </div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="font-medium text-gray-500">Версия системы</label>
              <p className="text-gray-900">NDA v1.0.0</p>
            </div>
            <div>
              <label className="font-medium text-gray-500">Последнее обновление</label>
              <p className="text-gray-900">{new Date().toLocaleDateString('ru-RU')}</p>
            </div>
            <div>
              <label className="font-medium text-gray-500">Статус</label>
              <p className="text-green-600 font-medium">Активна</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
