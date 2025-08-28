'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExportExcel } from '@/components/ExportExcel'

interface HRStats {
  total_employees: number
  juniors_count: number
  average_profit: number
  pending_nda: Array<{
    id: string
    first_name: string
    last_name: string
    email: string
  }>
  recent_hires: Array<{
    id: string
    first_name: string
    last_name: string
    role: string
    created_at: string
  }>
}

export default function HRDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<HRStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  useEffect(() => {
    loadStats()
  }, [])
  
  async function loadStats() {
    try {
      const res = await fetch('/api/hr/statistics')
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error)
      }
      
      setStats(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) return <div className="p-8">Загрузка...</div>
  if (error) return <div className="p-8 text-red-600">Ошибка: {error}</div>
  if (!stats) return <div className="p-8">Нет данных</div>
  
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">HR Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/hr/users')}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Управление пользователями
          </button>
          <button
            onClick={() => router.push('/hr/users/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Создать пользователя
          </button>
          <ExportExcel
            data={stats?.recent_hires || []}
            filename="новые_сотрудники"
            columns={[
              { key: 'first_name', label: 'Имя' },
              { key: 'last_name', label: 'Фамилия' },
              { key: 'role', label: 'Роль' },
              { key: 'created_at', label: 'Дата создания', format: 'date' }
            ]}
          />
        </div>
      </div>
      
      {/* KPI карточки */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500">Всего сотрудников</div>
          <div className="text-2xl font-bold">{stats.total_employees}</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500">Активных Junior</div>
          <div className="text-2xl font-bold text-blue-600">{stats.juniors_count}</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500">Средний профит</div>
          <div className="text-2xl font-bold text-green-600">
            ${stats.average_profit.toFixed(2)}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-8">
        {/* Новые сотрудники */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Новые сотрудники (7 дней)</h2>
          </div>
          <div className="p-4">
            {stats.recent_hires.length === 0 ? (
              <div className="text-gray-500">Нет новых сотрудников</div>
            ) : (
              <div className="space-y-2">
                {stats.recent_hires.map(hire => (
                  <div key={hire.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">
                        {hire.first_name} {hire.last_name}
                      </div>
                      <div className="text-sm text-gray-500 capitalize">{hire.role}</div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(hire.created_at).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Список для подписания NDA */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">
              Ожидают подписания NDA ({stats.pending_nda.length})
            </h2>
          </div>
          <div className="p-4">
            {stats.pending_nda.length === 0 ? (
              <div className="text-green-600">Все NDA подписаны ✓</div>
            ) : (
              <div className="space-y-2">
                {stats.pending_nda.map(user => (
                  <div key={user.id} className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                    <div>
                      <div className="font-medium">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                    <button
                      onClick={() => window.open(`/nda/${user.id}`, '_blank')}
                      className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                    >
                      Отправить NDA
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* График текучести кадров (заглушка) */}
      <div className="mt-8 bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Текучесть кадров</h2>
        </div>
        <div className="p-8 text-center text-gray-500">
          <div className="w-full h-40 bg-gray-100 rounded flex items-center justify-center">
            График текучести кадров (интеграция с Chart.js)
          </div>
        </div>
      </div>
    </div>
  )
}
