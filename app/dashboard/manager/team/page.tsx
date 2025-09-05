'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DataTable from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { User, CasinoTest } from '@/types/database.types'

interface JuniorWithStats extends User {
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

export default function TeamManagement() {
  const router = useRouter()
  const { addToast } = useToast()
  const [juniors, setJuniors] = useState<JuniorWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSalary, setEditingSalary] = useState<JuniorWithStats | null>(null)
  const [newSalaryPercentage, setNewSalaryPercentage] = useState('')
  const [showTeamLeadModal, setShowTeamLeadModal] = useState(false)
  const [assigningJunior, setAssigningJunior] = useState<string | null>(null)
  const [teamLeads, setTeamLeads] = useState<User[]>([])
  const [selectedTeamLead, setSelectedTeamLead] = useState<string>('')

  useEffect(() => {
    fetchTeamData()
    fetchTeamLeads()
  }, [])

  const fetchTeamData = async () => {
    try {
      const response = await fetch('/api/manager/team')
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

  const fetchTeamLeads = async () => {
    try {
      const response = await fetch('/api/users?role=teamlead')
      const data = await response.json()
      
      if (data.success) {
        setTeamLeads(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching team leads:', error)
    }
  }

  const assignJuniorToTeamLead = async () => {
    if (!assigningJunior || !selectedTeamLead) return

    try {
      const response = await fetch(`/api/users/${assigningJunior}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          team_lead_id: selectedTeamLead === 'none' ? null : selectedTeamLead 
        })
      })

      if (response.ok) {
        addToast({ 
          type: 'success', 
          title: 'Успешно', 
          description: selectedTeamLead === 'none' ? 
            'Junior откреплен от Team Lead' : 
            'Junior назначен к Team Lead' 
        })
        await fetchTeamData()
        setShowTeamLeadModal(false)
        setAssigningJunior(null)
        setSelectedTeamLead('')
      } else {
        addToast({ type: 'error', title: 'Ошибка', description: 'Не удалось назначить Team Lead' })
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Ошибка сети' })
    }
  }

  const updateSalaryPercentage = async () => {
    if (!editingSalary || !newSalaryPercentage) return

    try {
      const response = await fetch(`/api/users/${editingSalary.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salary_percentage: parseInt(newSalaryPercentage) })
      })

      if (response.ok) {
        addToast({ type: 'success', title: 'Успешно', description: 'Процент обновлен' })
        setEditingSalary(null)
        setNewSalaryPercentage('')
        fetchTeamData()
      } else {
        addToast({ type: 'error', title: 'Ошибка', description: 'Не удалось обновить процент' })
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Ошибка сети' })
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
      key: 'stats.pending_withdrawals',
      label: 'Выводы',
      render: (item: JuniorWithStats) => (
        <div className="text-center">
          <div className={`text-lg font-semibold ${
            (item.stats?.pending_withdrawals || 0) > 0 ? 'text-warning-600' : 'text-gray-400'
          }`}>
            {item.stats?.pending_withdrawals || 0}
          </div>
          <div className="text-xs text-gray-500">ожидают</div>
        </div>
      )
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
          <button 
            onClick={() => {
              setEditingSalary(item)
              setNewSalaryPercentage(item.salary_percentage.toString())
            }}
            className="text-lg font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
          >
            {item.salary_percentage}%
          </button>
          <div className="text-xs text-gray-500">от профита</div>
        </div>
      )
    },
    {
      key: 'stats.last_activity',
      label: 'Активность',
      render: (item: JuniorWithStats) => {
        if (!item.stats?.last_activity) {
          return <span className="text-gray-400">Нет данных</span>
        }
        
        const lastActivity = new Date(item.stats.last_activity)
        const hoursAgo = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60))
        
        return (
          <div className="text-sm">
            <div className={hoursAgo < 24 ? 'text-success-600' : hoursAgo < 72 ? 'text-warning-600' : 'text-danger-600'}>
              {hoursAgo < 24 ? 'Сегодня' : 
               hoursAgo < 48 ? 'Вчера' : 
               `${Math.floor(hoursAgo / 24)} дн. назад`}
            </div>
            <div className="text-xs text-gray-500">
              {lastActivity.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        )
      }
    }
  ]

  const actions = [
    {
      label: 'Детали',
      action: (item: JuniorWithStats) => router.push(`/dashboard/manager/team/${item.id}`),
      variant: 'primary' as const
    },
    {
      label: 'Назначить карту',
      action: (item: JuniorWithStats) => router.push(`/dashboard/manager/cards?assign=${item.id}`),
      variant: 'secondary' as const,
      condition: (item: JuniorWithStats) => item.status === 'active'
    },
    {
      label: 'Team Lead',
      action: (item: JuniorWithStats) => {
        setAssigningJunior(item.id)
        setShowTeamLeadModal(true)
      },
      variant: 'warning' as const,
      condition: (item: JuniorWithStats) => item.role === 'junior'
    }
  ]

  // Статистика команды
  const teamStats = {
    total_juniors: juniors.length,
    active_juniors: juniors.filter(j => j.status === 'active').length,
    total_monthly_accounts: juniors.reduce((sum, j) => sum + (j.stats?.monthly_accounts || 0), 0),
    total_monthly_profit: juniors.reduce((sum, j) => sum + (j.stats?.total_profit || 0), 0),
    avg_success_rate: juniors.length > 0 ? 
      Math.round(juniors.reduce((sum, j) => sum + (j.stats?.success_rate || 0), 0) / juniors.length) : 0,
    pending_withdrawals: juniors.reduce((sum, j) => sum + (j.stats?.pending_withdrawals || 0), 0)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Управление командой</h1>
          <p className="text-gray-600">Мониторинг и управление junior'ами</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => router.push('/dashboard/manager')}>
            ← Назад
          </button>
          <button className="btn-primary" onClick={() => router.push('/dashboard/manager/cards')}>
            Управление картами
          </button>
        </div>
      </div>

      {/* Статистика команды */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Всего Junior'ов</h3>
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
          <h3 className="text-sm font-medium text-gray-500">Средняя успешность</h3>
          <p className={`text-2xl font-bold ${
            teamStats.avg_success_rate >= 80 ? 'text-success-600' : 
            teamStats.avg_success_rate >= 60 ? 'text-warning-600' : 
            'text-danger-600'
          }`}>
            {teamStats.avg_success_rate}%
          </p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Профит команды</h3>
          <p className="text-2xl font-bold text-success-600">
            ${teamStats.total_monthly_profit.toFixed(2)}
          </p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Ожидают выводы</h3>
          <p className={`text-2xl font-bold ${
            teamStats.pending_withdrawals > 0 ? 'text-warning-600' : 'text-gray-400'
          }`}>
            {teamStats.pending_withdrawals}
          </p>
        </div>
      </div>

      {/* Матрица эффективности */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Рейтинг эффективности</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Топ по успешности */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">🏆 Лучшие по успешности</h4>
            <div className="space-y-2">
              {juniors
                .filter(j => j.stats?.total_accounts && j.stats.total_accounts > 0)
                .sort((a, b) => (b.stats?.success_rate || 0) - (a.stats?.success_rate || 0))
                .slice(0, 3)
                .map((junior, index) => (
                  <div key={junior.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">#{index + 1}</span>
                      <span className="text-sm">{junior.first_name} {junior.last_name}</span>
                    </div>
                    <span className="text-sm font-semibold text-success-600">
                      {junior.stats?.success_rate}%
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Топ по профиту */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">💰 Лучшие по профиту</h4>
            <div className="space-y-2">
              {juniors
                .sort((a, b) => (b.stats?.total_profit || 0) - (a.stats?.total_profit || 0))
                .slice(0, 3)
                .map((junior, index) => (
                  <div key={junior.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">#{index + 1}</span>
                      <span className="text-sm">{junior.first_name} {junior.last_name}</span>
                    </div>
                    <span className="text-sm font-semibold text-success-600">
                      ${(junior.stats?.total_profit || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Требуют внимания */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">⚠️ Требуют внимания</h4>
            <div className="space-y-2">
              {juniors
                .filter(j => 
                  j.status !== 'active' || 
                  (j.stats?.success_rate || 0) < 50 ||
                  (j.stats?.pending_withdrawals || 0) > 3
                )
                .slice(0, 3)
                .map((junior) => (
                  <div key={junior.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                    <div>
                      <div className="text-sm font-medium">{junior.first_name} {junior.last_name}</div>
                      <div className="text-xs text-red-600">
                        {junior.status !== 'active' ? 'Неактивен' :
                         (junior.stats?.success_rate || 0) < 50 ? 'Низкая успешность' :
                         'Много ожидающих выводов'}
                      </div>
                    </div>
                    <button 
                      className="btn-sm btn-danger"
                      onClick={() => router.push(`/dashboard/manager/team/${junior.id}`)}
                    >
                      Проверить
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Таблица команды */}
      <DataTable
        data={juniors}
        columns={columns}
        actions={actions}
        loading={loading}
      />
      {/* Модальное окно редактирования процента */}
      {editingSalary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              Изменить процент для {editingSalary.first_name} {editingSalary.last_name}
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Процент от профита
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={newSalaryPercentage}
                onChange={(e) => setNewSalaryPercentage(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Введите процент"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={updateSalaryPercentage}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
              >
                Сохранить
              </button>
              <button
                onClick={() => {
                  setEditingSalary(null)
                  setNewSalaryPercentage('')
                }}
                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно назначения Team Lead */}
      <Modal
        isOpen={showTeamLeadModal}
        onClose={() => {
          setShowTeamLeadModal(false)
          setAssigningJunior(null)
          setSelectedTeamLead('')
        }}
        title="Назначить Team Lead"
      >
        <div className="space-y-4">
          <div>
            <label className="form-label">Выберите Team Lead</label>
            <select
              value={selectedTeamLead}
              onChange={(e) => setSelectedTeamLead(e.target.value)}
              className="form-input w-full"
            >
              <option value="">-- Выберите Team Lead --</option>
              <option value="none">🚫 Убрать Team Lead</option>
              {teamLeads.map(tl => (
                <option key={tl.id} value={tl.id}>
                  👤 {tl.first_name} {tl.last_name}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Junior будет подчиняться выбранному Team Lead
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={assignJuniorToTeamLead}
              disabled={!selectedTeamLead}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              Назначить
            </button>
            <button
              onClick={() => {
                setShowTeamLeadModal(false)
                setAssigningJunior(null)
                setSelectedTeamLead('')
              }}
              className="btn-secondary flex-1"
            >
              Отмена
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
