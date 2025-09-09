'use client'

import { useRouter } from 'next/navigation'

export default function HRDashboard() {
  const router = useRouter()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">HR Dashboard</h1>
        <p className="text-gray-600">Управление персоналом и кадровая политика</p>
      </div>

      {/* HR KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Активные сотрудники</h3>
          <p className="text-3xl font-bold text-success-600">0</p>
          <p className="text-sm text-gray-500">Работающих в системе</p>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Новые сотрудники</h3>
          <p className="text-3xl font-bold text-primary-600">0</p>
          <p className="text-sm text-gray-500">За текущий месяц</p>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Эффективность</h3>
          <p className="text-3xl font-bold text-warning-600">0%</p>
          <p className="text-sm text-gray-500">Средняя по команде</p>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">NDA подписаны</h3>
          <p className="text-3xl font-bold text-info-600">0</p>
          <p className="text-sm text-gray-500">Из общего количества</p>
        </div>
      </div>

      {/* Быстрые действия */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">HR операции</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => router.push('/dashboard/hr/users')}
            className="btn-primary"
          >
            Управление сотрудниками
          </button>
          <button
            onClick={() => router.push('/dashboard/hr/nda')}
            className="btn-primary"
          >
            Управление NDA
          </button>
          <button
            onClick={() => router.push('/dashboard/hr/structure')}
            className="btn-primary"
          >
            Организационная структура
          </button>
          <button
            onClick={() => router.push('/dashboard/hr/teams')}
            className="btn-primary"
          >
            Управление командами
          </button>
          <button
            onClick={() => router.push('/dashboard/hr/reports')}
            className="btn-secondary"
          >
            Отчеты по эффективности
          </button>
          <button
            onClick={() => router.push('/dashboard/hr/banks')}
            className="btn-secondary"
          >
            Контроль балансов
          </button>
        </div>
      </div>

      {/* Информация */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
        <h3 className="font-medium text-purple-900 mb-3">👥 HR функции</h3>
        <div className="text-sm text-purple-800 space-y-2">
          <div>• Создание и управление учетными записями сотрудников</div>
          <div>• Настройка процентов и бонусов для каждого сотрудника</div>
          <div>• Управление NDA и документооборотом</div>
          <div>• Просмотр организационной структуры и иерархии команд</div>
          <div>• Управление ссылками на чаты команд для аналитики</div>
          <div>• Мониторинг эффективности и добавление HR комментариев</div>
          <div>• Контроль балансов банковских аккаунтов</div>
        </div>
      </div>
    </div>
  )
}