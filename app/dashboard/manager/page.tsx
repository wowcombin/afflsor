'use client'

import { useRouter } from 'next/navigation'

export default function ManagerDashboard() {
  const router = useRouter()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
        <p className="text-gray-600">Управление командой и проверка операций</p>
      </div>

      {/* KPI карточки */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Очередь выводов</h3>
          <p className="text-3xl font-bold text-warning-600">0</p>
          <p className="text-sm text-gray-500">Ожидают проверки</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Команда</h3>
          <p className="text-3xl font-bold text-primary-600">0</p>
          <p className="text-sm text-gray-500">Активных Junior</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Профит команды</h3>
          <p className="text-3xl font-bold text-success-600">$0</p>
          <p className="text-sm text-gray-500">За текущий месяц</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Эффективность</h3>
          <p className="text-3xl font-bold text-success-600">0%</p>
          <p className="text-sm text-gray-500">Успешных операций</p>
        </div>
      </div>

      {/* Быстрые действия */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Управление</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => router.push('/dashboard/manager/withdrawals')}
            className="btn-primary"
          >
            Очередь выводов
          </button>
          <button 
            onClick={() => router.push('/dashboard/manager/cards')}
            className="btn-secondary"
          >
            Управление картами
          </button>
          <button 
            onClick={() => router.push('/dashboard/manager/team')}
            className="btn-secondary"
          >
            Команда
          </button>
        </div>
      </div>
    </div>
  )
}
