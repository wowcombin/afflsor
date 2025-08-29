'use client'

import { useState, useEffect } from 'react'
import KPICard from '@/components/ui/KPICard'
import DataTable, { Column } from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import { UsersIcon, ClockIcon, TrophyIcon } from '@heroicons/react/24/outline'

interface Worker {
  id: string
  name: string
  telegram_username?: string
  status: 'online' | 'offline' | 'break'
  todayProfit: number
  monthProfit: number
  activeCards: number
  activeCasinos: number
  lastActivity: string
}

export default function ManagerWorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalWorkers: 0,
    onlineWorkers: 0,
    totalProfit: 0,
    avgProfit: 0
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadWorkers()
    } else {
      setLoading(false)
    }
  }, [])

  async function loadWorkers() {
    try {
      // TODO: Реализовать API для загрузки команды
      setWorkers([])
      setStats({ totalWorkers: 0, onlineWorkers: 0, totalProfit: 0, avgProfit: 0 })
    } catch (error) {
      console.error('Ошибка загрузки команды:', error)
    } finally {
      setLoading(false)
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'online': return 'text-green-600'
      case 'offline': return 'text-gray-600'
      case 'break': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  function getStatusIcon(status: string): string {
    switch (status) {
      case 'online': return '🟢'
      case 'offline': return '🔴'
      case 'break': return '🟡'
      default: return '⚪'
    }
  }

  const columns: Column[] = [
    {
      key: 'name',
      label: 'Сотрудник',
      sortable: true,
      render: (worker: Worker) => (
        <div className="flex items-center">
          <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
            {worker.name[0] || 'U'}
          </div>
          <div>
            <div className="font-medium text-gray-900">{worker.name}</div>
            {worker.telegram_username && (
              <div className="text-sm text-blue-600">@{worker.telegram_username}</div>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Статус',
      sortable: true,
      render: (worker: Worker) => (
        <div className="flex items-center">
          <span className="mr-2">{getStatusIcon(worker.status)}</span>
          <span className={getStatusColor(worker.status)}>
            {worker.status === 'online' ? 'Онлайн' : 
             worker.status === 'offline' ? 'Оффлайн' : 'Перерыв'}
          </span>
        </div>
      )
    },
    {
      key: 'todayProfit',
      label: 'Профит сегодня',
      sortable: true,
      render: (worker: Worker) => (
        <div className="text-green-600 font-semibold">
          ${worker.todayProfit.toFixed(2)}
        </div>
      )
    },
    {
      key: 'monthProfit',
      label: 'Профит месяц',
      sortable: true,
      render: (worker: Worker) => (
        <div className="text-blue-600 font-semibold">
          ${worker.monthProfit.toFixed(2)}
        </div>
      )
    },
    {
      key: 'activeCards',
      label: 'Активные карты',
      sortable: true
    },
    {
      key: 'lastActivity',
      label: 'Последняя активность',
      sortable: true,
      render: (worker: Worker) => (
        <div className="text-sm text-gray-500">
          {new Date(worker.lastActivity).toLocaleString('ru-RU')}
        </div>
      )
    }
  ]

  const actions = [
    {
      label: 'Детали',
      action: (worker: Worker) => {
        // TODO: Открыть детальную информацию о Junior
        console.log('View worker details:', worker.id)
      },
      variant: 'primary' as const
    },
    {
      label: 'Назначить карты',
      action: (worker: Worker) => {
        // TODO: Открыть модальное окно назначения карт
        console.log('Assign cards to worker:', worker.id)
      },
      variant: 'secondary' as const
    }
  ]

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Управление командой</h1>
        <div className="text-sm text-gray-500">
          Обновляется в реальном времени
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Всего Junior"
          value={stats.totalWorkers.toString()}
          icon={<UsersIcon className="h-6 w-6" />}
        />
        <KPICard
          title="Онлайн сейчас"
          value={stats.onlineWorkers.toString()}
          color="green"
          icon={<span className="text-xl">🟢</span>}
          footer={
            <span className="text-sm text-green-600">
              {stats.totalWorkers > 0 ? Math.round((stats.onlineWorkers / stats.totalWorkers) * 100) : 0}% команды
            </span>
          }
        />
        <KPICard
          title="Общий профит"
          value={stats.totalProfit}
          format="currency"
          color="blue"
          icon={<TrophyIcon className="h-6 w-6" />}
        />
        <KPICard
          title="Средний профит"
          value={stats.avgProfit}
          format="currency"
          color="purple"
          icon={<span className="text-xl">📊</span>}
        />
      </div>

      {/* Workers Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            Список Junior ({workers.length} сотрудников)
          </h3>
        </div>
        
        <DataTable
          data={workers}
          columns={columns}
          actions={actions}
          pagination={{ pageSize: 20 }}
          sorting={{ key: 'monthProfit', direction: 'desc' }}
          export={true}
        />
      </div>

      {/* Заглушка */}
      <div className="mt-8 text-center text-gray-500">
        <UsersIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium mb-2">Управление командой в разработке</h3>
        <p className="text-sm">
          Здесь будет детальная информация о Junior, назначение карт, создание задач
        </p>
      </div>
    </div>
  )
}
