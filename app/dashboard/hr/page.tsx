'use client'

export default function HRDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">HR Dashboard</h1>
        <p className="text-gray-600">Управление персоналом и кадровые процессы</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Сотрудники</h3>
          <p className="text-3xl font-bold text-primary-600">6</p>
          <p className="text-sm text-gray-500">Всего в системе</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Активные</h3>
          <p className="text-3xl font-bold text-success-600">6</p>
          <p className="text-sm text-gray-500">Работают</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Новые</h3>
          <p className="text-3xl font-bold text-warning-600">0</p>
          <p className="text-sm text-gray-500">За месяц</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Текучесть</h3>
          <p className="text-3xl font-bold text-gray-600">0%</p>
          <p className="text-sm text-gray-500">За год</p>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Управление персоналом</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="btn-primary">Управление сотрудниками</button>
          <button className="btn-secondary">Отчеты</button>
          <button className="btn-secondary">Комментарии</button>
        </div>
      </div>
    </div>
  )
}
