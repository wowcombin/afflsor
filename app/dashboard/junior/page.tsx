'use client'

export default function JuniorDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Junior Dashboard</h1>
        <p className="text-gray-600">Добро пожаловать в систему управления работами</p>
      </div>

      {/* Временные карточки */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Профит за месяц</h3>
          <p className="text-3xl font-bold text-success-600">$0</p>
          <p className="text-sm text-gray-500">Пока нет данных</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Успешность</h3>
          <p className="text-3xl font-bold text-primary-600">0%</p>
          <p className="text-sm text-gray-500">Выводов одобрено</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Рейтинг</h3>
          <p className="text-3xl font-bold text-warning-600">-</p>
          <p className="text-sm text-gray-500">Место в команде</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">До выплаты</h3>
          <p className="text-3xl font-bold text-gray-600">- дней</p>
          <p className="text-sm text-gray-500">До конца месяца</p>
        </div>
      </div>

      {/* Быстрые действия */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Быстрые действия</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="btn-primary">
            Создать новую работу
          </button>
          <button className="btn-secondary">
            Просмотреть выводы
          </button>
          <button className="btn-secondary">
            Мои карты
          </button>
        </div>
      </div>

      {/* Информация */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
        <h3 className="font-medium text-primary-900 mb-3">🚀 Новая ERP система</h3>
        <div className="text-sm text-primary-800 space-y-2">
          <div>• Система полностью переписана с нуля</div>
          <div>• Улучшенная производительность и безопасность</div>
          <div>• Новый современный интерфейс</div>
          <div>• Функционал будет добавляться поэтапно</div>
        </div>
      </div>
    </div>
  )
}
