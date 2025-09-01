'use client'

import { useRouter } from 'next/navigation'

export default function TesterDashboard() {
  const router = useRouter()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tester Dashboard</h1>
        <p className="text-gray-600">Тестирование казино и управление мануалами</p>
      </div>

      {/* Tester KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Казино протестировано</h3>
          <p className="text-3xl font-bold text-success-600">0</p>
          <p className="text-sm text-gray-500">За текущий месяц</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Одобрено</h3>
          <p className="text-3xl font-bold text-primary-600">0</p>
          <p className="text-sm text-gray-500">Казино прошли тест</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Отклонено</h3>
          <p className="text-3xl font-bold text-danger-600">0</p>
          <p className="text-sm text-gray-500">Не прошли проверку</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">В процессе</h3>
          <p className="text-3xl font-bold text-warning-600">0</p>
          <p className="text-sm text-gray-500">Ожидают тестирования</p>
        </div>
      </div>

      {/* Быстрые действия */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Тестирование</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button 
            onClick={() => router.push('/dashboard/tester/casinos')}
            className="btn-primary"
          >
            Список казино
          </button>
          <button 
            onClick={() => router.push('/dashboard/tester/testing')}
            className="btn-warning"
          >
            Новое тестирование
          </button>
          <button 
            onClick={() => router.push('/dashboard/tester/manuals')}
            className="btn-secondary"
          >
            Мануалы
          </button>
          <button 
            onClick={() => router.push('/dashboard/tester/work')}
            className="btn-secondary"
          >
            Тестовые работы
          </button>
        </div>
      </div>

      {/* Информация */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
        <h3 className="font-medium text-indigo-900 mb-3">🧪 Tester функции</h3>
        <div className="text-sm text-indigo-800 space-y-2">
          <div>• Тестирование новых казино по установленным критериям</div>
          <div>• Создание и обновление мануалов для Junior'ов</div>
          <div>• Проведение тестовых депозитов и выводов</div>
          <div>• Анализ совместимости BIN кодов карт с казино</div>
          <div>• Документирование процессов и рекомендаций</div>
        </div>
      </div>
    </div>
  )
}