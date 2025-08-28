'use client'

import { useEffect, useState } from 'react'
import DataTable, { Column, ActionConfig } from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import KPICard from '@/components/ui/KPICard'

interface Withdrawal {
  id: string
  withdrawal_amount: number
  status: string
  profit: number
  waiting_minutes: number
  works: {
    deposit_amount: number
    users: { first_name: string; last_name: string }
    casinos: { name: string }
    cards: { card_number_mask: string }
  }
}

export default function ManagerDashboard() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalQueue: 0,
    urgentCount: 0,
    todayProfit: 0,
    avgWaitTime: 0
  })
  
  useEffect(() => {
    loadQueue()
    const interval = setInterval(loadQueue, 30000) // Обновление каждые 30 сек
    return () => clearInterval(interval)
  }, [])
  
  async function loadQueue() {
    const res = await fetch('/api/withdrawals/queue')
    const data = await res.json()
    const withdrawalData = data.withdrawals || []
    setWithdrawals(withdrawalData)
    
    // Вычисляем статистику
    const urgentCount = withdrawalData.filter((w: Withdrawal) => w.waiting_minutes > 60).length
    const todayProfit = withdrawalData.reduce((sum: number, w: Withdrawal) => sum + w.profit, 0)
    const avgWaitTime = withdrawalData.length > 0 
      ? withdrawalData.reduce((sum: number, w: Withdrawal) => sum + w.waiting_minutes, 0) / withdrawalData.length 
      : 0
    
    setStats({
      totalQueue: withdrawalData.length,
      urgentCount,
      todayProfit,
      avgWaitTime: Math.round(avgWaitTime)
    })
    
    setLoading(false)
  }
  
  async function checkWithdrawal(id: string, status: 'received' | 'problem' | 'block') {
    const res = await fetch(`/api/withdrawals/${id}/check`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    
    if (res.ok) {
      loadQueue() // Перезагрузка очереди
    }
  }

  // Конфигурация колонок для DataTable
  const columns: Column[] = [
    {
      key: 'waiting_minutes',
      label: 'Время ожидания',
      sortable: true,
      render: (value: number) => (
        <span className={value > 60 ? 'text-red-600 font-bold' : value > 15 ? 'text-yellow-600' : ''}>
          {value} мин
        </span>
      )
    },
    {
      key: 'junior_name',
      label: 'Junior',
      sortable: true,
      render: (_, row: Withdrawal) => `${row.works.users.first_name} ${row.works.users.last_name}`
    },
    {
      key: 'casino_name',
      label: 'Казино',
      sortable: true,
      render: (_, row: Withdrawal) => row.works.casinos.name
    },
    {
      key: 'card_mask',
      label: 'Карта',
      render: (_, row: Withdrawal) => (
        <span className="font-mono text-sm">{row.works.cards.card_number_mask}</span>
      )
    },
    {
      key: 'deposit_amount',
      label: 'Депозит',
      sortable: true,
      align: 'right',
      format: 'currency',
      render: (_, row: Withdrawal) => row.works.deposit_amount
    },
    {
      key: 'withdrawal_amount',
      label: 'Вывод',
      sortable: true,
      align: 'right',
      format: 'currency'
    },
    {
      key: 'profit',
      label: 'Профит',
      sortable: true,
      align: 'right',
      render: (value: number) => (
        <span className="font-bold text-green-600">${value.toFixed(2)}</span>
      )
    },
    {
      key: 'status',
      label: 'Статус',
      render: (value: string) => <StatusBadge status={value} type="withdrawal" />
    }
  ]

  // Конфигурация действий
  const actions: ActionConfig[] = [
    {
      label: '✓',
      action: (row: Withdrawal) => checkWithdrawal(row.id, 'received'),
      variant: 'primary'
    },
    {
      label: '?',
      action: (row: Withdrawal) => checkWithdrawal(row.id, 'problem'),
      variant: 'secondary'
    },
    {
      label: '✗',
      action: (row: Withdrawal) => checkWithdrawal(row.id, 'block'),
      variant: 'danger'
    }
  ]

  if (loading) return <div className="p-8">Загрузка...</div>
  
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Manager Dashboard</h1>
        <div className="text-sm text-gray-500">
          Обновляется каждые 30 секунд
        </div>
      </div>

      {/* KPI карточки */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Очередь выводов"
          value={stats.totalQueue}
          color="blue"
          icon={<span className="text-2xl">📋</span>}
        />
        <KPICard
          title="Срочные (>1ч)"
          value={stats.urgentCount}
          color={stats.urgentCount > 0 ? "red" : "green"}
          icon={<span className="text-2xl">⚠️</span>}
        />
        <KPICard
          title="Профит сегодня"
          value={stats.todayProfit}
          format="currency"
          color="green"
          icon={<span className="text-2xl">💰</span>}
        />
        <KPICard
          title="Среднее ожидание"
          value={`${stats.avgWaitTime} мин`}
          format="text"
          color={stats.avgWaitTime > 30 ? "yellow" : "green"}
          icon={<span className="text-2xl">⏱️</span>}
        />
      </div>

      {/* Таблица выводов */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Очередь выводов</h2>
        
        {withdrawals.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-md text-center text-gray-500">
            <span className="text-4xl mb-4 block">🎉</span>
            <p className="text-lg">Нет выводов для проверки</p>
            <p className="text-sm mt-2">Все выводы обработаны!</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={withdrawals}
            actions={actions}
            sorting={{ key: 'waiting_minutes', direction: 'desc' }}
            pagination={{
              pageSize: 20,
              showTotal: true
            }}
            filters={[
              { type: 'search', key: 'search', placeholder: 'Поиск по Junior, казино...' },
              {
                type: 'select',
                key: 'status',
                placeholder: 'Все статусы',
                options: [
                  { value: 'new', label: 'Новые' },
                  { value: 'waiting', label: 'Ожидают' },
                  { value: 'received', label: 'Получены' },
                  { value: 'problem', label: 'Проблемы' },
                  { value: 'block', label: 'Блокированы' }
                ]
              }
            ]}
            export={true}
            loading={loading}
          />
        )}
      </div>

      {/* Быстрые действия */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button 
          onClick={() => window.location.reload()}
          className="bg-blue-50 hover:bg-blue-100 p-4 rounded-lg text-blue-800 font-medium text-center transition-colors"
        >
          🔄 Обновить данные
        </button>
        <button 
          onClick={() => {
            const urgentWithdrawals = withdrawals.filter(w => w.waiting_minutes > 60)
            if (urgentWithdrawals.length > 0) {
              alert(`Найдено ${urgentWithdrawals.length} срочных выводов!`)
            } else {
              alert('Срочных выводов нет')
            }
          }}
          className="bg-red-50 hover:bg-red-100 p-4 rounded-lg text-red-800 font-medium text-center transition-colors"
        >
          ⚠️ Проверить срочные
        </button>
        <button 
          onClick={() => {
            const csvData = withdrawals.map(w => ({
              junior: `${w.works.users.first_name} ${w.works.users.last_name}`,
              casino: w.works.casinos.name,
              deposit: w.works.deposit_amount,
              withdrawal: w.withdrawal_amount,
              profit: w.profit,
              waiting: w.waiting_minutes
            }))
            console.log('Export data:', csvData)
          }}
          className="bg-green-50 hover:bg-green-100 p-4 rounded-lg text-green-800 font-medium text-center transition-colors"
        >
          📊 Экспорт отчета
        </button>
      </div>
    </div>
  )
}
