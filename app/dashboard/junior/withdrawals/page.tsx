'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column, ActionButton } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import StatusBadge from '@/components/ui/StatusBadge'
import { 
  ClockIcon,
  BanknotesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface Withdrawal {
  id: string
  work_id: string
  withdrawal_amount: number
  status: string
  created_at: string
  checked_at: string | null
  alarm_message: string | null
  casino_name: string
  card_mask: string
  deposit_amount: number
  profit: number
}

interface WithdrawalStats {
  totalWithdrawals: number
  pendingWithdrawals: number
  approvedWithdrawals: number
  rejectedWithdrawals: number
  totalProfit: number
}

export default function JuniorWithdrawalsPage() {
  const { addToast } = useToast()
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [stats, setStats] = useState<WithdrawalStats>({
    totalWithdrawals: 0,
    pendingWithdrawals: 0,
    approvedWithdrawals: 0,
    rejectedWithdrawals: 0,
    totalProfit: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWithdrawals()
  }, [])

  async function loadWithdrawals() {
    try {
      const response = await fetch('/api/withdrawals')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка загрузки выводов')
      }

      const { withdrawals: withdrawalsData } = await response.json()
      
      // Форматируем данные для интерфейса
      const formattedWithdrawals = withdrawalsData.map((w: any) => ({
        id: w.id,
        work_id: w.work_id,
        withdrawal_amount: w.withdrawal_amount,
        status: w.status,
        created_at: w.created_at,
        checked_at: w.checked_at,
        alarm_message: w.alarm_message,
        casino_name: w.casino_name,
        card_mask: w.card_number_mask,
        deposit_amount: w.deposit_amount,
        profit: w.profit || (w.withdrawal_amount - w.deposit_amount)
      }))

      setWithdrawals(formattedWithdrawals)

      // Рассчитываем статистику
      const totalWithdrawals = formattedWithdrawals.length
      const pendingWithdrawals = formattedWithdrawals.filter((w: Withdrawal) => ['new', 'waiting'].includes(w.status)).length
      const approvedWithdrawals = formattedWithdrawals.filter((w: Withdrawal) => w.status === 'received').length
      const rejectedWithdrawals = formattedWithdrawals.filter((w: Withdrawal) => ['problem', 'block'].includes(w.status)).length
      const totalProfit = formattedWithdrawals.filter((w: Withdrawal) => w.status === 'received').reduce((sum: number, w: Withdrawal) => sum + w.profit, 0)

      setStats({
        totalWithdrawals,
        pendingWithdrawals,
        approvedWithdrawals,
        rejectedWithdrawals,
        totalProfit
      })

    } catch (error: any) {
      console.error('Ошибка загрузки выводов:', error)
      addToast({
        type: 'error',
        title: 'Ошибка загрузки выводов',
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  const columns: Column<Withdrawal>[] = [
    {
      key: 'created_at',
      label: 'Дата',
      sortable: true,
      render: (withdrawal) => (
        <span className="text-sm text-gray-600">
          {new Date(withdrawal.created_at).toLocaleDateString('ru-RU')}
        </span>
      )
    },
    {
      key: 'casino_name',
      label: 'Казино',
      sortable: true,
      filterable: true,
      render: (withdrawal) => (
        <div>
          <div className="font-medium text-gray-900">{withdrawal.casino_name}</div>
          <div className="text-sm text-gray-500 font-mono">{withdrawal.card_mask}</div>
        </div>
      )
    },
    {
      key: 'deposit_amount',
      label: 'Депозит',
      align: 'right',
      sortable: true,
      render: (withdrawal) => (
        <span className="font-mono text-gray-600">
          ${withdrawal.deposit_amount.toFixed(2)}
        </span>
      )
    },
    {
      key: 'withdrawal_amount',
      label: 'Вывод',
      align: 'right',
      sortable: true,
      render: (withdrawal) => (
        <span className="font-mono text-primary-600">
          ${withdrawal.withdrawal_amount.toFixed(2)}
        </span>
      )
    },
    {
      key: 'profit',
      label: 'Профит',
      align: 'right',
      sortable: true,
      render: (withdrawal) => (
        <span className={`font-mono font-medium ${withdrawal.profit > 0 ? 'text-success-600' : 'text-danger-600'}`}>
          ${withdrawal.profit.toFixed(2)}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Статус',
      sortable: true,
      render: (withdrawal) => <StatusBadge status={withdrawal.status} />
    }
  ]

  const actions: ActionButton<Withdrawal>[] = [
    {
      label: 'Отменить',
      action: (withdrawal) => {
        addToast({ type: 'info', title: 'Отмена вывода - в разработке' })
      },
      variant: 'warning',
      condition: (withdrawal) => withdrawal.status === 'waiting'
    },
    {
      label: 'Детали',
      action: (withdrawal) => {
        addToast({ type: 'info', title: 'Просмотр деталей - в разработке' })
      },
      variant: 'secondary'
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Мои выводы</h1>
        <p className="text-gray-600">История и статус выводов средств</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KPICard
          title="Всего выводов"
          value={stats.totalWithdrawals}
          icon={<ClockIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Ожидают"
          value={stats.pendingWithdrawals}
          icon={<ClockIcon className="h-6 w-6" />}
          color="warning"
        />
        <KPICard
          title="Одобрены"
          value={stats.approvedWithdrawals}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="success"
        />
        <KPICard
          title="Отклонены"
          value={stats.rejectedWithdrawals}
          icon={<XCircleIcon className="h-6 w-6" />}
          color="danger"
        />
        <KPICard
          title="Общий профит"
          value={`$${stats.totalProfit.toFixed(2)}`}
          icon={<BanknotesIcon className="h-6 w-6" />}
          color="success"
        />
      </div>

      {/* Таблица выводов */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">
            Выводы ({withdrawals.length})
          </h3>
        </div>
        
        <DataTable
          data={withdrawals}
          columns={columns}
          actions={actions}
          loading={loading}
          pagination={{ pageSize: 20 }}
          filtering={true}
          exportable={true}
          emptyMessage="Выводы не найдены"
        />
      </div>

      {/* Информация */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
        <h3 className="font-medium text-primary-900 mb-3">💡 Работа с выводами</h3>
        <div className="text-sm text-primary-800 space-y-2">
          <div>• <strong>Создавайте выводы</strong> только после успешного депозита</div>
          <div>• <strong>Ожидайте проверки</strong> Manager в течение 15 минут</div>
          <div>• <strong>Следите за статусом</strong> - waiting → received/problem/block</div>
          <div>• <strong>Профит засчитывается</strong> только при статусе "received"</div>
        </div>
      </div>
    </div>
  )
}
