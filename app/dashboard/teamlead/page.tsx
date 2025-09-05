'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import KPICard from '@/components/ui/KPICard'
import { 
  BanknotesIcon,
  CheckCircleIcon,
  TrophyIcon,
  CalendarDaysIcon,
  UsersIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface DashboardStats {
  totalJuniors: number
  activeJuniors: number
  monthlyProfit: number
  teamLeadCommission: number // 10% от брутто команды
  totalWorks: number
  successRate: number
  pendingWithdrawals: number
}

export default function TeamLeadDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalJuniors: 0,
    activeJuniors: 0,
    monthlyProfit: 0,
    teamLeadCommission: 0,
    totalWorks: 0,
    successRate: 0,
    pendingWithdrawals: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/teamlead/dashboard')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats || stats)
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Lead Dashboard</h1>
          <p className="text-gray-600">Управление командой Junior'ов</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => router.push('/dashboard/teamlead/team')}
            className="btn-primary"
          >
            Моя команда
          </button>
          <button 
            onClick={() => router.push('/dashboard/teamlead/withdrawals')}
            className="btn-secondary"
          >
            Выводы
          </button>
        </div>
      </div>

      {/* KPI карточки */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Моих Junior'ов"
          value={stats.totalJuniors}
          subtitle={`${stats.activeJuniors} активных`}
          icon={UsersIcon}
          trend={{ value: 0, isPositive: true }}
          loading={loading}
        />
        
        <KPICard
          title="Профит команды"
          value={`$${stats.monthlyProfit.toFixed(2)}`}
          subtitle="за месяц"
          icon={BanknotesIcon}
          trend={{ value: 0, isPositive: true }}
          loading={loading}
        />

        <KPICard
          title="Моя комиссия"
          value={`$${stats.teamLeadCommission.toFixed(2)}`}
          subtitle="10% от брутто"
          icon={TrophyIcon}
          trend={{ value: 0, isPositive: true }}
          loading={loading}
        />

        <KPICard
          title="Успешность"
          value={`${stats.successRate}%`}
          subtitle={`${stats.totalWorks} работ`}
          icon={CheckCircleIcon}
          trend={{ value: 0, isPositive: true }}
          loading={loading}
        />
      </div>

      {/* Быстрые действия */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card cursor-pointer hover:shadow-lg transition-shadow" 
             onClick={() => router.push('/dashboard/teamlead/team')}>
          <div className="flex items-center gap-4">
            <UsersIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h3 className="font-semibold">Управление командой</h3>
              <p className="text-sm text-gray-600">Просмотр и управление Junior'ами</p>
            </div>
          </div>
        </div>

        <div className="card cursor-pointer hover:shadow-lg transition-shadow"
             onClick={() => router.push('/dashboard/teamlead/withdrawals')}>
          <div className="flex items-center gap-4">
            <ClockIcon className="h-8 w-8 text-orange-600" />
            <div>
              <h3 className="font-semibold">Проверка выводов</h3>
              <p className="text-sm text-gray-600">{stats.pendingWithdrawals} ожидают</p>
            </div>
          </div>
        </div>

        <div className="card cursor-pointer hover:shadow-lg transition-shadow"
             onClick={() => router.push('/dashboard/teamlead/cards')}>
          <div className="flex items-center gap-4">
            <CalendarDaysIcon className="h-8 w-8 text-green-600" />
            <div>
              <h3 className="font-semibold">Управление картами</h3>
              <p className="text-sm text-gray-600">Назначение карт Junior'ам</p>
            </div>
          </div>
        </div>
      </div>

      {/* Статистика команды */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Статистика команды</h3>
        <div className="text-center text-gray-500">
          <p>Детальная статистика будет доступна в разделе "Моя команда"</p>
        </div>
      </div>
    </div>
  )
}
