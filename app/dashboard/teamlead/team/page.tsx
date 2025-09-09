'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DataTable from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import { useToast } from '@/components/ui/Toast'

interface TeamMember {
  id: string
  name: string
  email: string
  telegram: string
  status: string
  salary_percentage: number
  monthly_accounts: number
  successful_accounts: number
  success_rate: number
  monthly_profit: number
  last_activity: string
}

interface TeamStats {
  total_juniors: number
  active_juniors: number
  total_accounts: number
  successful_accounts: number
  monthly_profit: number
  teamlead_commission: number
}

export default function TeamLeadTeamPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [team, setTeam] = useState<TeamMember[]>([])
  const [stats, setStats] = useState<TeamStats>({
    total_juniors: 0,
    active_juniors: 0,
    total_accounts: 0,
    successful_accounts: 0,
    monthly_profit: 0,
    teamlead_commission: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTeamData()
  }, [])

  const fetchTeamData = async () => {
    try {
      const response = await fetch('/api/teamlead/team')
      const data = await response.json()
      
      if (data.success) {
        setTeam(data.data || [])
        setStats(data.stats || stats)
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
      render: (member: TeamMember) => (
        <div>
          <div className="font-medium text-gray-900">{member.name}</div>
          <div className="text-sm text-gray-500">{member.email}</div>
          {member.telegram && (
            <div className="text-xs text-blue-600">@{member.telegram}</div>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Статус',
      render: (member: TeamMember) => <StatusBadge status={member.status} />
    },
    {
      key: 'monthly_accounts',
      label: 'Аккаунты за месяц',
      render: (member: TeamMember) => (
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">{member.monthly_accounts}</div>
          <div className="text-xs text-gray-500">{member.successful_accounts} успешных</div>
        </div>
      )
    },
    {
      key: 'success_rate',
      label: 'Успешность',
      render: (member: TeamMember) => {
        const rate = member.success_rate
        return (
          <div className="text-center">
            <div className={`text-lg font-semibold ${
              rate >= 80 ? 'text-success-600' : 
              rate >= 60 ? 'text-warning-600' : 
              'text-danger-600'
            }`}>
              {rate}%
            </div>
            <div className="text-xs text-gray-500">получено</div>
          </div>
        )
      }
    },
    {
      key: 'monthly_profit',
      label: 'Профит за месяц',
      render: (member: TeamMember) => (
        <div className="text-center">
          <div className="text-lg font-semibold text-success-600">
            ${member.monthly_profit.toFixed(2)}
          </div>
        </div>
      )
    },
    {
      key: 'salary_percentage',
      label: 'Процент',
      render: (member: TeamMember) => (
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            {member.salary_percentage}%
          </div>
          <div className="text-xs text-gray-500">от профита</div>
        </div>
      )
    },
    {
      key: 'last_activity',
      label: 'Последняя активность',
      render: (member: TeamMember) => (
        <div className="text-center text-sm text-gray-600">
          {member.last_activity}
        </div>
      )
    }
  ]

  const actions = [
    {
      label: 'Назначить карту',
      action: (member: TeamMember) => router.push(`/dashboard/teamlead/cards?assign=${member.id}`),
      variant: 'primary' as const
    }
  ]

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Моих Junior'ов</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.total_juniors}</p>
          <p className="text-xs text-gray-500">{stats.active_juniors} активных</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Аккаунтов за месяц</h3>
          <p className="text-2xl font-bold text-primary-600">{stats.total_accounts}</p>
          <p className="text-xs text-gray-500">{stats.successful_accounts} успешных</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Профит команды</h3>
          <p className="text-2xl font-bold text-success-600">
            ${stats.monthly_profit.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500">за месяц</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Моя комиссия (10%)</h3>
          <p className="text-2xl font-bold text-purple-600">
            ${stats.teamlead_commission.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500">от брутто команды</p>
        </div>
      </div>

      {/* Таблица команды */}
      <div className="card">
        <DataTable
          data={team}
          columns={columns}
          actions={actions}
          loading={loading}
        />
      </div>
    </div>
  )
}
