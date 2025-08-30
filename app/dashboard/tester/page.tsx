'use client'

export default function TesterDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tester Dashboard</h1>
        <p className="text-gray-600">Тестирование казино и управление мануалами</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Казино протестировано</h3>
          <p className="text-3xl font-bold text-success-600">0</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">В очереди</h3>
          <p className="text-3xl font-bold text-warning-600">0</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Успешность</h3>
          <p className="text-3xl font-bold text-primary-600">0%</p>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Действия</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button className="btn-primary">Новое тестирование</button>
          <button className="btn-secondary">Управление мануалами</button>
        </div>
      </div>
    </div>
  )
}
