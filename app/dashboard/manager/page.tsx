'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'

interface ManagerStats {
  pending_withdrawals: number
  team_size: number
  team_profit: number
  critical_alerts: number
  avg_success_rate: number
  available_cards: number
}

export default function ManagerDashboard() {
  const router = useRouter()
  const { addToast } = useToast()
  const [stats, setStats] = useState<ManagerStats>({
    pending_withdrawals: 0,
    team_size: 0,
    team_profit: 0,
    critical_alerts: 0,
    avg_success_rate: 0,
    available_cards: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats?role=manager')
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
      } else {
        addToast({ type: 'error', title: 'Ошибка', description: 'Не удалось загрузить статистику' })
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Ошибка сети' })
    } finally {
      setLoading(false)
    }
  }

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
          <p className={`text-3xl font-bold ${stats.pending_withdrawals > 0 ? 'text-warning-600' : 'text-gray-400'}`}>
            {loading ? '...' : stats.pending_withdrawals}
          </p>
          <p className="text-sm text-gray-500">Ожидают проверки</p>
          {stats.pending_withdrawals > 5 && (
            <p className="text-xs text-danger-600 mt-1">⚠️ Много ожидающих</p>
          )}
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Команда</h3>
          <p className="text-3xl font-bold text-primary-600">
            {loading ? '...' : stats.team_size}
          </p>
          <p className="text-sm text-gray-500">Активных Junior'ов</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Профит команды</h3>
          <p className="text-3xl font-bold text-success-600">
            {loading ? '...' : `$${stats.team_profit.toFixed(2)}`}
          </p>
          <p className="text-sm text-gray-500">За текущий месяц</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Эффективность</h3>
          <p className={`text-3xl font-bold ${
            stats.avg_success_rate >= 80 ? 'text-success-600' : 
            stats.avg_success_rate >= 60 ? 'text-warning-600' : 
            'text-danger-600'
          }`}>
            {loading ? '...' : `${stats.avg_success_rate}%`}
          </p>
          <p className="text-sm text-gray-500">Средняя успешность</p>
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
