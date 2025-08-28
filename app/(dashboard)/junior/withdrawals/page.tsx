'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import DataTable, { Column, ActionConfig } from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import KPICard from '@/components/ui/KPICard'
import { useToast } from '@/components/ui/Toast'

interface Withdrawal {
  id: string
  withdrawal_amount: number
  status: string
  created_at: string
  checked_by?: string
  checked_at?: string
  alarm_message?: string
  works: {
    id: string
    deposit_amount: number
    casino_username: string
    casinos: {
      name: string
    }
    cards: {
      card_number_mask: string
    }
  }
}

export default function JuniorWithdrawalsPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [stats, setStats] = useState({
    totalWithdrawals: 0,
    pendingWithdrawals: 0,
    approvedWithdrawals: 0,
    totalProfit: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWithdrawals()
  }, [])

  async function loadWithdrawals() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      // Получаем все выводы пользователя
      const { data: withdrawalsData, error } = await supabase
        .from('work_withdrawals')
        .select(`
          *,
          works!inner(
            id,
            deposit_amount,
            casino_username,
            junior_id,
            casinos(name),
            cards(card_number_mask)
          )
        `)
        .eq('works.junior_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        addToast({ type: 'error', title: 'Ошибка загрузки выводов' })
        return
      }

      const typedWithdrawals = withdrawalsData as Withdrawal[]
      setWithdrawals(typedWithdrawals)

      // Подсчитываем статистику
      const totalWithdrawals = typedWithdrawals.length
      const pendingWithdrawals = typedWithdrawals.filter(w => ['new', 'waiting'].includes(w.status)).length
      const approvedWithdrawals = typedWithdrawals.filter(w => w.status === 'received').length
      const totalProfit = typedWithdrawals
        .filter(w => w.status === 'received')
        .reduce((sum, w) => sum + (w.withdrawal_amount - w.works.deposit_amount), 0)

      setStats({
        totalWithdrawals,
        pendingWithdrawals,
        approvedWithdrawals,
        totalProfit
      })

    } catch (error) {
      console.error('Error loading withdrawals:', error)
      addToast({ type: 'error', title: 'Ошибка загрузки данных' })
    } finally {
      setLoading(false)
    }
  }

  async function toggleWithdrawalStatus(withdrawalId: string, currentStatus: string) {
    try {
      const supabase = createClient()
      
      // Junior может переключать только между new и waiting
      if (!['new', 'waiting'].includes(currentStatus)) {
        addToast({ type: 'error', title: 'Нельзя изменить статус этого вывода' })
        return
      }

      const newStatus = currentStatus === 'new' ? 'waiting' : 'new'

      const { error } = await supabase
        .from('work_withdrawals')
        .update({ status: newStatus })
        .eq('id', withdrawalId)

      if (error) {
        addToast({ type: 'error', title: 'Ошибка изменения статуса' })
        return
      }

      addToast({ 
        type: 'success', 
        title: `Статус изменен на ${newStatus === 'new' ? 'Новый' : 'Ожидает'}` 
      })
      loadWithdrawals() // Перезагружаем данные

    } catch (error) {
      console.error('Error toggling withdrawal status:', error)
      addToast({ type: 'error', title: 'Ошибка изменения статуса' })
    }
  }

  const columns: Column[] = [
    {
      key: 'created_at',
      label: 'Дата создания',
      sortable: true,
      render: (value) => new Date(value).toLocaleString('ru-RU')
    },
    {
      key: 'works.casinos.name',
      label: 'Казино',
      render: (_, row) => row.works.casinos.name
    },
    {
      key: 'works.cards.card_number_mask',
      label: 'Карта',
      render: (_, row) => row.works.cards.card_number_mask
    },
    {
      key: 'works.deposit_amount',
      label: 'Депозит',
      align: 'right',
      render: (_, row) => `$${row.works.deposit_amount.toFixed(2)}`
    },
    {
      key: 'withdrawal_amount',
      label: 'Вывод',
      align: 'right',
      sortable: true,
      render: (value) => `$${value.toFixed(2)}`
    },
    {
      key: 'profit',
      label: 'Профит',
      align: 'right',
      render: (_, row) => {
        const profit = row.withdrawal_amount - row.works.deposit_amount
        return (
          <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
            ${profit.toFixed(2)}
          </span>
        )
      }
    },
    {
      key: 'status',
      label: 'Статус',
      filterable: true,
      render: (value) => <StatusBadge status={value} type="withdrawal" />
    },
    {
      key: 'checked_at',
      label: 'Проверено',
      render: (value) => value ? new Date(value).toLocaleString('ru-RU') : '—'
    }
  ]

  const actions: ActionConfig[] = [
    {
      label: 'Переключить статус',
      action: (row) => toggleWithdrawalStatus(row.id, row.status),
      condition: (row) => ['new', 'waiting'].includes(row.status),
      variant: 'secondary'
    },
    {
      label: 'Детали работы',
      action: (row) => router.push(`/junior/work/${row.works.id}`),
      variant: 'primary'
    }
  ]

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Мои выводы</h1>
        <button
          onClick={() => router.push('/junior/dashboard')}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Назад к дашборду
        </button>
      </div>

      {/* KPI карточки */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Всего выводов"
          value={stats.totalWithdrawals}
          color="blue"
          icon={<span className="text-2xl">📊</span>}
        />
        <KPICard
          title="В ожидании"
          value={stats.pendingWithdrawals}
          color="yellow"
          icon={<span className="text-2xl">⏳</span>}
        />
        <KPICard
          title="Одобрено"
          value={stats.approvedWithdrawals}
          color="green"
          icon={<span className="text-2xl">✅</span>}
        />
        <KPICard
          title="Общий профит"
          value={`$${stats.totalProfit.toFixed(2)}`}
          color="green"
          icon={<span className="text-2xl">💰</span>}
        />
      </div>

      {/* Таблица выводов */}
      <div className="bg-white rounded-lg shadow">
        <DataTable
          columns={columns}
          data={withdrawals}
          actions={actions}
          sorting={{ key: 'created_at', direction: 'desc' }}
          pagination={{ pageSize: 20, showTotal: true }}
          filters={[
            {
              type: 'search',
              key: 'search',
              placeholder: 'Поиск по казино, карте...'
            },
            {
              type: 'select',
              key: 'status',
              placeholder: 'Все статусы',
              options: [
                { value: 'new', label: 'Новый' },
                { value: 'waiting', label: 'Ожидает' },
                { value: 'received', label: 'Получен' },
                { value: 'problem', label: 'Проблема' },
                { value: 'block', label: 'Блокирован' }
              ]
            }
          ]}
          export={true}
          loading={loading}
        />
      </div>

      {/* Подсказки */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">💡 Подсказки:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Вы можете переключать статус между "Новый" и "Ожидает" для неproверенных выводов</li>
          <li>• Статус "Ожидает" означает, что вывод готов к проверке менеджером</li>
          <li>• После проверки менеджером статус изменится на "Получен", "Проблема" или "Блокирован"</li>
          <li>• Кликните "Детали работы" чтобы увидеть полную информацию о депозите</li>
        </ul>
      </div>
    </div>
  )
}
