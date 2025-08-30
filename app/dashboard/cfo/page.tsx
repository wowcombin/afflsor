'use client'

export default function CFODashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">CFO Dashboard</h1>
        <p className="text-gray-600">Финансовая аналитика и управление</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Месячная прибыль</h3>
          <p className="text-3xl font-bold text-success-600">$0</p>
          <p className="text-sm text-gray-500">Текущий месяц</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Расходы</h3>
          <p className="text-3xl font-bold text-danger-600">$0</p>
          <p className="text-sm text-gray-500">За месяц</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">ROI</h3>
          <p className="text-3xl font-bold text-primary-600">0%</p>
          <p className="text-sm text-gray-500">Рентабельность</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Зарплатный фонд</h3>
          <p className="text-3xl font-bold text-gray-600">$0</p>
          <p className="text-sm text-gray-500">К выплате</p>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Финансовое управление</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="btn-primary">Расчет зарплат</button>
          <button className="btn-secondary">USDT переводы</button>
          <button className="btn-secondary">Учет расходов</button>
        </div>
      </div>
    </div>
  )
}
