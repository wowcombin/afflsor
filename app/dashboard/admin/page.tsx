'use client'

import { useRouter } from 'next/navigation'

export default function AdminDashboard() {
  const router = useRouter()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">Системное администрирование и полный контроль</p>
      </div>

      {/* System KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Активные сессии</h3>
          <p className="text-3xl font-bold text-success-600">0</p>
          <p className="text-sm text-gray-500">Пользователей онлайн</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Системные алерты</h3>
          <p className="text-3xl font-bold text-danger-600">0</p>
          <p className="text-sm text-gray-500">Требуют внимания</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Операций/день</h3>
          <p className="text-3xl font-bold text-primary-600">0</p>
          <p className="text-sm text-gray-500">Средняя активность</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Время отклика</h3>
          <p className="text-3xl font-bold text-warning-600">0ms</p>
          <p className="text-sm text-gray-500">Средний API response</p>
        </div>
      </div>

      {/* Быстрые действия */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Системное управление</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button 
            onClick={() => router.push('/dashboard/hr/users')}
            className="btn-primary"
          >
            Управление пользователями
          </button>
          <button 
            onClick={() => router.push('/dashboard/admin/settings')}
            className="btn-warning"
          >
            Системные настройки
          </button>
          <button 
            onClick={() => router.push('/dashboard/admin/audit')}
            className="btn-secondary"
          >
            Аудит системы
          </button>
          <button 
            onClick={() => router.push('/dashboard/admin/backup')}
            className="btn-secondary"
          >
            Резервные копии
          </button>
        </div>
      </div>

      {/* Доступ к другим модулям */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Доступ к модулям</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => router.push('/dashboard/cfo')}
            className="btn-success"
          >
            💰 Финансовый модуль
          </button>
          <button 
            onClick={() => router.push('/dashboard/manager')}
            className="btn-info"
          >
            📊 Менеджерский модуль
          </button>
          <button 
            onClick={() => router.push('/dashboard/tester')}
            className="btn-secondary"
          >
            🧪 Модуль тестирования
          </button>
        </div>
      </div>

      {/* Информация */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="font-medium text-red-900 mb-3">⚡ Admin права</h3>
        <div className="text-sm text-red-800 space-y-2">
          <div>• Полный доступ ко всем функциям системы</div>
          <div>• Управление пользователями и их правами</div>
          <div>• Системные настройки и конфигурация</div>
          <div>• Мониторинг безопасности и аудит действий</div>
          <div>• Управление резервными копиями и восстановление</div>
          <div>• Override любых ограничений при необходимости</div>
        </div>
      </div>
    </div>
  )
}