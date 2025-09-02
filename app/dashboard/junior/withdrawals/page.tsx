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
  ExclamationTriangleIcon,
  PlusIcon
} from '@heroicons/react/24/outline'

interface Work {
  id: string
  deposit_amount: number
  status: string
  created_at: string
  casino_login: string
  notes: string | null
  work_date: string
  casino_name: string
  casino_currency: string
  card_mask: string
  card_type: string
  bank_name: string
  withdrawals: WorkWithdrawal[]
}

interface WorkWithdrawal {
  id: string
  withdrawal_amount: number
  status: string
  created_at: string
  checked_at: string | null
}

interface WorkStats {
  totalWorks: number
  activeWorks: number
  completedWorks: number
  totalDeposits: number
  totalWithdrawals: number
}

export default function JuniorWithdrawalsPage() {
  const { addToast } = useToast()
  const [works, setWorks] = useState<Work[]>([])
  const [stats, setStats] = useState<WorkStats>({
    totalWorks: 0,
    activeWorks: 0,
    completedWorks: 0,
    totalDeposits: 0,
    totalWithdrawals: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWorks()
  }, [])

  async function loadWorks() {
    try {
      const response = await fetch('/api/works')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка загрузки работ')
      }

      const { works: worksData } = await response.json()
      
      // Форматируем данные для интерфейса
      const formattedWorks = worksData.map((w: any) => ({
        id: w.id,
        deposit_amount: w.deposit_amount,
        status: w.status,
        created_at: w.created_at,
        casino_login: w.casino_login,
        notes: w.notes,
        work_date: w.work_date,
        casino_name: w.casinos?.name || 'Неизвестное казино',
        casino_currency: w.casinos?.currency || 'USD',
        card_mask: w.cards?.card_number_mask || 'Неизвестная карта',
        card_type: w.cards?.card_type || 'Неизвестный тип',
        bank_name: w.cards?.bank_account?.bank?.name || 'Неизвестный банк',
        withdrawals: w.work_withdrawals || []
      }))

      setWorks(formattedWorks)

      // Рассчитываем статистику
      const totalWorks = formattedWorks.length
      const activeWorks = formattedWorks.filter((w: Work) => w.status === 'active').length
      const completedWorks = formattedWorks.filter((w: Work) => w.status === 'completed').length
      const totalDeposits = formattedWorks.reduce((sum: number, w: Work) => sum + w.deposit_amount, 0)
      const totalWithdrawals = formattedWorks.reduce((sum: number, w: Work) => 
        sum + w.withdrawals.filter((wd: WorkWithdrawal) => wd.status === 'received').length, 0)

      setStats({
        totalWorks,
        activeWorks,
        completedWorks,
        totalDeposits,
        totalWithdrawals
      })

    } catch (error: any) {
      console.error('Ошибка загрузки работ:', error)
      addToast({
        type: 'error',
        title: 'Ошибка загрузки работ',
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  // Функция для создания вывода
  async function createWithdrawal(workId: string, amount: number) {
    try {
      const response = await fetch('/api/work-withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_id: workId,
          withdrawal_amount: amount
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка создания вывода')
      }

      addToast({
        type: 'success',
        title: 'Вывод создан',
        description: 'Вывод добавлен в очередь на проверку'
      })

      // Перезагружаем данные
      loadWorks()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка создания вывода',
        description: error.message
      })
    }
  }

  // Функция для изменения статуса вывода
  async function updateWithdrawalStatus(withdrawalId: string, newStatus: string) {
    try {
      const response = await fetch(`/api/work-withdrawals/${withdrawalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка изменения статуса')
      }

      addToast({
        type: 'success',
        title: 'Статус изменен',
        description: `Статус вывода изменен на "${newStatus}"`
      })

      // Перезагружаем данные
      loadWorks()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка изменения статуса',
        description: error.message
      })
    }
  }

  // Функция для удаления работы
  async function deleteWork(workId: string, workName: string) {
    if (!confirm(`Вы уверены, что хотите удалить работу с ${workName}? Это действие нельзя отменить.`)) {
      return
    }

    try {
      const response = await fetch(`/api/works/${workId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка удаления работы')
      }

      addToast({
        type: 'success',
        title: 'Работа удалена',
        description: 'Работа успешно удалена'
      })

      // Перезагружаем данные
      loadWorks()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка удаления работы',
        description: error.message
      })
    }
  }

  // Функция для изменения статуса работы
  async function updateWorkStatus(workId: string, newStatus: string, workName: string) {
    try {
      const response = await fetch(`/api/works/${workId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка изменения статуса')
      }

      addToast({
        type: 'success',
        title: 'Статус работы изменен',
        description: `Статус работы с ${workName} изменен на "${newStatus}"`
      })

      // Перезагружаем данные
      loadWorks()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка изменения статуса работы',
        description: error.message
      })
    }
  }

  // Функция для форматирования времени
  function formatTimeAgo(dateString: string) {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffWeeks = Math.floor(diffDays / 7)
    const diffMonths = Math.floor(diffDays / 30)
    const diffYears = Math.floor(diffDays / 365)

    if (diffMinutes < 60) {
      return `${diffMinutes} мин назад`
    } else if (diffHours < 24) {
      return `${diffHours} ч назад`
    } else if (diffDays < 7) {
      return `${diffDays} д назад`
    } else if (diffWeeks < 4) {
      return `${diffWeeks} нед назад`
    } else if (diffMonths < 12) {
      return `${diffMonths} мес назад`
    } else {
      return `${diffYears} г назад`
    }
  }

  const columns: Column<Work>[] = [
    {
      key: 'created_at',
      label: 'Дата',
      render: (work) => (
        <div>
          <div className="font-medium">{new Date(work.created_at).toLocaleDateString('ru-RU')}</div>
          <div className="text-sm text-gray-500">{formatTimeAgo(work.created_at)}</div>
        </div>
      )
    },
    {
      key: 'casino_name',
      label: 'Казино',
      render: (work) => (
        <div>
          <div className="font-medium">{work.casino_name}</div>
          <div className="text-sm text-gray-500">Логин: {work.casino_login}</div>
        </div>
      )
    },
    {
      key: 'deposit_amount',
      label: 'Депозит',
      render: (work) => (
        <div className="font-medium text-blue-600">
          {work.deposit_amount} {work.casino_currency}
        </div>
      )
    },
    {
      key: 'card_info',
      label: 'Карта',
      render: (work) => (
        <div>
          <div className="font-medium">{work.card_mask}</div>
          <div className="text-sm text-gray-500">{work.bank_name}</div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Статус работы',
      render: (work) => (
        <StatusBadge status={work.status} />
      )
    },
    {
      key: 'withdrawals',
      label: 'Выводы',
      render: (work) => (
        <div className="space-y-1">
          {work.withdrawals.length === 0 ? (
            <span className="text-sm text-gray-500">Нет выводов</span>
          ) : (
            work.withdrawals.map((withdrawal) => (
              <div key={withdrawal.id} className="flex items-center space-x-2">
                <span className="text-sm font-medium">
                  {withdrawal.withdrawal_amount} {work.casino_currency}
                </span>
                <StatusBadge status={withdrawal.status} />
                <span className="text-xs text-gray-500">
                  {formatTimeAgo(withdrawal.created_at)}
                </span>
              </div>
            ))
          )}
        </div>
      )
    }
  ]

  const actions: ActionButton<Work>[] = [
    {
      label: 'Создать вывод',
      variant: 'primary',
      condition: (work) => work.status === 'active',
      action: (work) => {
        const amount = prompt(`Введите сумму вывода для ${work.casino_name} (${work.casino_currency}):`)
        if (amount && !isNaN(Number(amount)) && Number(amount) > 0) {
          createWithdrawal(work.id, Number(amount))
        }
      }
    },
    {
      label: 'Изменить статус',
      variant: 'secondary',
      condition: (work) => work.status !== 'completed',
      action: (work) => {
        const statuses = [
          { value: 'active', label: 'Активная' },
          { value: 'completed', label: 'Завершенная' },
          { value: 'cancelled', label: 'Отмененная' },
          { value: 'blocked', label: 'Заблокированная' }
        ]
        
        const statusOptions = statuses
          .filter(s => s.value !== work.status)
          .map(s => `${s.value} - ${s.label}`)
          .join('\n')
        
        const newStatus = prompt(`Выберите новый статус для работы с ${work.casino_name}:\n\n${statusOptions}\n\nВведите значение (active/completed/cancelled/blocked):`)
        
        if (newStatus && ['active', 'completed', 'cancelled', 'blocked'].includes(newStatus)) {
          updateWorkStatus(work.id, newStatus, work.casino_name)
        }
      }
    },
    {
      label: 'Удалить',
      variant: 'danger',
      condition: (work) => work.status !== 'completed' && work.withdrawals.every(w => !['received', 'waiting'].includes(w.status)),
      action: (work) => {
        deleteWork(work.id, work.casino_name)
      }
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="container-main">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Мои работы и выводы</h1>
          <p className="text-gray-600">Управление депозитами и выводами средств</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
        <KPICard
          title="Всего работ"
          value={stats.totalWorks}
          icon={<BanknotesIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Активные"
          value={stats.activeWorks}
          icon={<ClockIcon className="h-6 w-6" />}
          color="warning"
        />
        <KPICard
          title="Завершенные"
          value={stats.completedWorks}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="success"
        />
        <KPICard
          title="Общий депозит"
          value={`${stats.totalDeposits}`}
          icon={<BanknotesIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Выводов получено"
          value={stats.totalWithdrawals}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="success"
        />
      </div>

      {/* Works Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Список работ</h2>
        </div>
        
        {works.length === 0 ? (
          <div className="text-center py-8">
            <BanknotesIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Нет работ</h3>
            <p className="mt-1 text-sm text-gray-500">
              Создайте первую работу, чтобы начать зарабатывать
            </p>
          </div>
        ) : (
          <DataTable
            data={works}
            columns={columns}
            actions={actions}
          />
        )}
      </div>
    </div>
  )
}