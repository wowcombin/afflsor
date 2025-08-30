'use client'

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">Полный контроль системы и администрирование</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Пользователи</h3>
          <p className="text-3xl font-bold text-primary-600">6</p>
          <p className="text-sm text-gray-500">В системе</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Активность</h3>
          <p className="text-3xl font-bold text-success-600">100%</p>
          <p className="text-sm text-gray-500">Система работает</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Безопасность</h3>
          <p className="text-3xl font-bold text-success-600">✓</p>
          <p className="text-sm text-gray-500">Все в порядке</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Версия</h3>
          <p className="text-3xl font-bold text-gray-600">2.0</p>
          <p className="text-sm text-gray-500">ERP System</p>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Администрирование</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button className="btn-primary">Управление пользователями</button>
          <button className="btn-secondary">Системные настройки</button>
          <button className="btn-secondary">Аудит и логи</button>
          <button className="btn-secondary">Резервные копии</button>
        </div>
      </div>

      <div className="bg-success-50 border border-success-200 rounded-lg p-6">
        <h3 className="font-medium text-success-900 mb-3">✅ Система готова к работе</h3>
        <div className="text-sm text-success-800 space-y-2">
          <div>• База данных очищена и готова к новым данным</div>
          <div>• Пользователи созданы и настроены</div>
          <div>• Система безопасности активна</div>
          <div>• Модули будут добавляться поэтапно</div>
        </div>
      </div>
    </div>
  )
}
