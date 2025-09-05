'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DataTable from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import { useToast } from '@/components/ui/Toast'

interface JuniorWithStats {
  id: string
  first_name: string
  last_name: string
  email: string
  telegram_username: string
  role: string
  status: string
  salary_percentage: number
  stats?: {
    total_accounts: number
    successful_accounts: number
    success_rate: number
    monthly_accounts: number
    assigned_cards: number
    pending_withdrawals: number
    total_profit: number
    last_activity: string
  }
}

export default function TeamLeadTeamPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [juniors, setJuniors] = useState<JuniorWithStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTeamData()
  }, [])

  const fetchTeamData = async () => {
    try {
      const response = await fetch('/api/teamlead/team')
      const data = await response.json()
      
      if (data.success) {
        setJuniors(data.data)
      } else {
        addToast({ type: 'error', title: 'Ошибка', description: data.error || 'Не удалось загрузить данные команды' })
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Ошибка сети' })
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      key: 'name',
      label: 'Junior',
      render: (item: JuniorWithStats) => (
        <div>
          <div className="font-medium text-gray-900">
            {item.first_name} {item.last_name}
          </div>
          <div className="text-sm text-gray-500">{item.email}</div>
          {item.telegram_username && (
            <div className="text-xs text-blue-600">@{item.telegram_username}</div>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Статус',
      render: (item: JuniorWithStats) => <StatusBadge status={item.status} />
    },
    {
      key: 'stats.assigned_cards',
      label: 'Карты',
      render: (item: JuniorWithStats) => (
        <div className="text-center">
          <div className="text-lg font-semibold text-primary-600">
            {item.stats?.assigned_cards || 0}
          </div>
          <div className="text-xs text-gray-500">назначено</div>
        </div>
      )
    },
    {
      key: 'stats.monthly_accounts',
      label: 'Аккаунты за месяц',
      render: (item: JuniorWithStats) => (
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            {item.stats?.monthly_accounts || 0}
          </div>
          <div className="text-xs text-gray-500">создано</div>
        </div>
      )
    },
    {
      key: 'stats.success_rate',
      label: 'Успешность',
      render: (item: JuniorWithStats) => {
        const rate = item.stats?.success_rate || 0
        return (
          <div className="text-center">
            <div className={`text-lg font-semibold ${
              rate >= 80 ? 'text-success-600' : 
              rate >= 60 ? 'text-warning-600' : 
              'text-danger-600'
            }`}>
              {rate}%
            </div>
            <div className="text-xs text-gray-500">
              {item.stats?.successful_accounts || 0}/{item.stats?.total_accounts || 0}
            </div>
          </div>
        )
      }
    },
    {
      key: 'stats.total_profit',
      label: 'Профит',
      render: (item: JuniorWithStats) => (
        <div className="text-center">
          <div className="text-lg font-semibold text-success-600">
            ${(item.stats?.total_profit || 0).toFixed(2)}
          </div>
          <div className="text-xs text-gray-500">за месяц</div>
        </div>
      )
    },
    {
      key: 'salary_percentage',
      label: 'Процент',
      render: (item: JuniorWithStats) => (
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            {item.salary_percentage}%
          </div>
          <div className="text-xs text-gray-500">от профита</div>
        </div>
      )
    }
  ]

  const actions = [
    {
      label: 'Назначить карту',
      action: (item: JuniorWithStats) => router.push(`/dashboard/teamlead/cards?assign=${item.id}`),
      variant: 'primary' as const
    }
  ]

  // Статистика команды
  const teamStats = {
    total_juniors: juniors.length,
    active_juniors: juniors.filter(j => j.status === 'active').length,
    total_monthly_accounts: juniors.reduce((sum, j) => sum + (j.stats?.monthly_accounts || 0), 0),
    total_monthly_profit: juniors.reduce((sum, j) => sum + (j.stats?.total_profit || 0), 0),
    team_lead_commission: juniors.reduce((sum, j) => sum + (j.stats?.total_profit || 0), 0) * 0.1,
    avg_success_rate: juniors.length > 0 ? 
      Math.round(juniors.reduce((sum, j) => sum + (j.stats?.success_rate || 0), 0) / juniors.length) : 0,
    pending_withdrawals: juniors.reduce((sum, j) => sum + (j.stats?.pending_withdrawals || 0), 0)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Моя команда</h1>
          <p className="text-gray-600">Управление подчиненными Junior'ами</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => router.push('/dashboard/teamlead')}>
            ← Назад
          </button>
          <button className="btn-primary" onClick={() => router.push('/dashboard/teamlead/cards')}>
            Управление картами
          </button>
        </div>
      </div>

      {/* Статистика команды */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Моих Junior'ов</h3>
          <p className="text-2xl font-bold text-gray-900">{teamStats.total_juniors}</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Активных</h3>
          <p className="text-2xl font-bold text-success-600">{teamStats.active_juniors}</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Аккаунтов за месяц</h3>
          <p className="text-2xl font-bold text-primary-600">{teamStats.total_monthly_accounts}</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Профит команды</h3>
          <p className="text-2xl font-bold text-success-600">
            ${teamStats.total_monthly_profit.toFixed(2)}
          </p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Моя комиссия</h3>
          <p className="text-2xl font-bold text-purple-600">
            ${teamStats.team_lead_commission.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500">10% от брутто</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Средняя успешность</h3>
          <p className={`text-2xl font-bold ${
            teamStats.avg_success_rate >= 80 ? 'text-success-600' : 
            teamStats.avg_success_rate >= 60 ? 'text-warning-600' : 
            'text-danger-600'
          }`}>
            {teamStats.avg_success_rate}%
          </p>
        </div>
      </div>

      {/* Таблица команды */}
      <div className="card">
        <DataTable
          data={juniors}
          columns={columns}
          actions={actions}
          loading={loading}
        />
      </div>
    </div>
  )
}
