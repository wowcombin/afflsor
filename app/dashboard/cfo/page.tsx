'use client'

import { useRouter } from 'next/navigation'

export default function CFODashboard() {
  const router = useRouter()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">CFO Dashboard</h1>
        <p className="text-gray-600">Финансовое управление и контроль</p>
      </div>

      {/* Финансовые KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">P&L текущий месяц</h3>
          <p className="text-3xl font-bold text-success-600">$0</p>
          <p className="text-sm text-gray-500">Прибыль за месяц</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Расходы</h3>
          <p className="text-3xl font-bold text-danger-600">$0</p>
          <p className="text-sm text-gray-500">За текущий месяц</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">К выплате</h3>
          <p className="text-3xl font-bold text-warning-600">$0</p>
          <p className="text-sm text-gray-500">Зарплаты сотрудников</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">ROI</h3>
          <p className="text-3xl font-bold text-primary-600">0%</p>
          <p className="text-sm text-gray-500">Рентабельность</p>
        </div>
      </div>

      {/* Быстрые действия */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Финансовые операции</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button 
            onClick={() => router.push('/dashboard/cfo/salaries')}
            className="btn-primary"
          >
            Расчет зарплат
          </button>
          <button 
            onClick={() => router.push('/dashboard/cfo/transfers')}
            className="btn-warning"
          >
            USDT переводы
          </button>
          <button 
            onClick={() => router.push('/dashboard/cfo/expenses')}
            className="btn-secondary"
          >
            Учет расходов
          </button>
          <button 
            onClick={() => router.push('/dashboard/cfo/banks')}
            className="btn-secondary"
          >
            Банковские аккаунты
          </button>
        </div>
      </div>

      {/* Информация */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="font-medium text-green-900 mb-3">💰 CFO функции</h3>
        <div className="text-sm text-green-800 space-y-2">
          <div>• Полный контроль финансовых потоков</div>
          <div>• Управление зарплатами и бонусами сотрудников</div>
          <div>• Контроль балансов всех банковских аккаунтов</div>
          <div>• Анализ P&L и создание финансовых отчетов</div>
          <div>• Управление USDT переводами и выплатами</div>
        </div>
      </div>
    </div>
  )
}