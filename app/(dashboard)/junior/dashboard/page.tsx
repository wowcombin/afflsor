'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import KPICard from '@/components/ui/KPICard'
import DataTable, { Column } from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import Alert from '@/components/ui/Alert'
import { useToast } from '@/components/ui/Toast'

interface Work {
  id: string
  deposit_amount: number
  casino_username: string
  work_date: string
  status: string
  casinos: { name: string }
  cards: { card_number_mask: string }
  work_withdrawals: Array<{
    id: string
    withdrawal_amount: number
    status: string
    created_at: string
  }>
}

export default function JuniorDashboard() {
  const router = useRouter()
  const { addToast } = useToast()
  const [stats, setStats] = useState({
    monthProfit: 0,
    profitChange: 0,
    rankPosition: 0,
    totalJuniors: 0,
    daysToSalary: 0,
    nextSalaryDate: '',
    successRate: 0,
    successRateChange: 0,
    activeWorks: 0,
    availableCards: 0,
    totalDeposits: 0,
    pendingWithdrawals: 0
  })
  const [recentWorks, setRecentWorks] = useState<Work[]>([])
  const [assignedCards, setAssignedCards] = useState<any[]>([])
  const [profitChart, setProfitChart] = useState<any[]>([])
  const [topPerformers, setTopPerformers] = useState<any[]>([])
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadDashboardData()
    // Обновляем данные каждые 2 минуты
    const interval = setInterval(loadDashboardData, 120000)
    return () => clearInterval(interval)
  }, [])
  
  async function loadDashboardData() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return
      
      // Профит за месяц
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      
      const { data: withdrawals } = await supabase
        .from('work_withdrawals')
        .select('withdrawal_amount, works!inner(deposit_amount, junior_id)')
        .eq('works.junior_id', user.id)
        .eq('status', 'received')
        .gte('created_at', startOfMonth.toISOString())
      
      const monthProfit = withdrawals?.reduce((sum, w: any) => 
        sum + (w.withdrawal_amount - w.works.deposit_amount), 0) || 0
      
      // Доступные карты
      const { count: availableCards } = await supabase
        .from('available_cards_for_junior')
        .select('*', { count: 'exact' })
        .eq('junior_id', user.id)
        .eq('is_available', true)
      
      // Активные работы
      const { data: activeWorksData, count: activeWorksCount } = await supabase
        .from('works')
        .select('*', { count: 'exact' })
        .eq('junior_id', user.id)
        .eq('status', 'active')
      
      // Ожидающие выводы
      const { count: pendingWithdrawalsCount } = await supabase
        .from('work_withdrawals')
        .select('*, works!inner(junior_id)', { count: 'exact' })
        .eq('works.junior_id', user.id)
        .in('status', ['new', 'waiting'])
      
      // Общие депозиты за месяц
      const { data: monthDeposits } = await supabase
        .from('works')
        .select('deposit_amount')
        .eq('junior_id', user.id)
        .gte('created_at', startOfMonth.toISOString())
      
      const totalDeposits = monthDeposits?.reduce((sum, w) => sum + w.deposit_amount, 0) || 0
      
      // Успешность (процент успешных выводов)
      const { data: allWithdrawals } = await supabase
        .from('work_withdrawals')
        .select('status, works!inner(junior_id)')
        .eq('works.junior_id', user.id)
        .gte('created_at', startOfMonth.toISOString())
      
      const successRate = allWithdrawals && allWithdrawals.length > 0 
        ? (allWithdrawals.filter(w => w.status === 'received').length / allWithdrawals.length) * 100
        : 0
      
      // Последние работы
      const { data: recentWorksData } = await supabase
        .from('works')
        .select(`
          *,
          casinos(name),
          cards(card_number_mask),
          work_withdrawals(id, withdrawal_amount, status, created_at)
        `)
        .eq('junior_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      
      setStats({
        monthProfit,
        successRate: Math.round(successRate),
        activeWorks: activeWorksCount || 0,
        availableCards: availableCards || 0,
        totalDeposits,
        pendingWithdrawals: pendingWithdrawalsCount || 0
      })
      
      setRecentWorks(recentWorksData || [])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      addToast({
        type: 'error',
        title: 'Ошибка загрузки',
        description: 'Не удалось загрузить данные dashboard'
      })
    } finally {
      setLoading(false)
    }
  }

  // Конфигурация колонок для таблицы работ
  const workColumns: Column[] = [
    {
      key: 'work_date',
      label: 'Дата',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString('ru-RU')
    },
    {
      key: 'casino_name',
      label: 'Казино',
      sortable: true,
      render: (_, row: Work) => row.casinos?.name || 'N/A'
    },
    {
      key: 'card_mask',
      label: 'Карта',
      render: (_, row: Work) => (
        <span className="font-mono text-sm">{row.cards?.card_number_mask || 'N/A'}</span>
      )
    },
    {
      key: 'deposit_amount',
      label: 'Депозит',
      sortable: true,
      align: 'right',
      format: 'currency'
    },
    {
      key: 'withdrawal_status',
      label: 'Статус вывода',
      render: (_, row: Work) => {
        const withdrawal = row.work_withdrawals?.[0]
        if (!withdrawal) {
          return <StatusBadge status="pending" type="withdrawal" size="sm" />
        }
        return <StatusBadge status={withdrawal.status} type="withdrawal" size="sm" />
      }
    },
    {
      key: 'withdrawal_amount',
      label: 'Вывод',
      align: 'right',
      render: (_, row: Work) => {
        const withdrawal = row.work_withdrawals?.[0]
        return withdrawal ? `$${withdrawal.withdrawal_amount.toFixed(2)}` : '-'
      }
    },
    {
      key: 'profit',
      label: 'Профит',
      align: 'right',
      render: (_, row: Work) => {
        const withdrawal = row.work_withdrawals?.[0]
        if (!withdrawal) return '-'
        const profit = withdrawal.withdrawal_amount - row.deposit_amount
        return (
          <span className={profit > 0 ? 'text-green-600 font-semibold' : 'text-red-600'}>
            ${profit.toFixed(2)}
          </span>
        )
      }
    }
  ]

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Junior Dashboard</h1>
          <p className="text-gray-600 mt-2">Обзор ваших работ и статистики</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/junior/work/new')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Новый депозит
          </button>
          <button
            onClick={loadDashboardData}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            🔄 Обновить
          </button>
        </div>
      </div>

      {/* Предупреждения */}
      {stats.availableCards === 0 && (
        <div className="mb-6">
          <Alert variant="warning" title="Нет доступных карт">
            У вас нет карт с балансом ≥ $10. Обратитесь к менеджеру для пополнения балансов.
          </Alert>
        </div>
      )}

      {stats.pendingWithdrawals > 5 && (
        <div className="mb-6">
          <Alert variant="info" title="Много ожидающих выводов">
            У вас {stats.pendingWithdrawals} выводов ожидают проверки. Это может повлиять на скорость обработки новых депозитов.
          </Alert>
        </div>
      )}

      {/* KPI карточки */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <KPICard
          title="Профит за месяц"
          value={stats.monthProfit}
          format="currency"
          color="green"
          icon={<span className="text-2xl">💰</span>}
          trend={stats.monthProfit > 0 ? { value: 15.2, direction: 'up', label: 'vs прошлый месяц' } : undefined}
        />
        
        <KPICard
          title="Успешность выводов"
          value={stats.successRate}
          format="percentage"
          color={stats.successRate >= 80 ? "green" : stats.successRate >= 60 ? "yellow" : "red"}
          icon={<span className="text-2xl">📈</span>}
        />
        
        <KPICard
          title="Активных работ"
          value={stats.activeWorks}
          color="blue"
          icon={<span className="text-2xl">⚡</span>}
          footer={
            <button 
              onClick={() => router.push('/junior/work/new')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Создать новую работу →
            </button>
          }
        />
        
        <KPICard
          title="Доступно карт"
          value={stats.availableCards}
          color={stats.availableCards > 0 ? "green" : "red"}
          icon={<span className="text-2xl">💳</span>}
          footer={
            stats.availableCards === 0 ? (
              <span className="text-red-600 text-sm">Нет карт с балансом ≥ $10</span>
            ) : (
              <span className="text-green-600 text-sm">Готовы к использованию</span>
            )
          }
        />
        
        <KPICard
          title="Депозиты за месяц"
          value={stats.totalDeposits}
          format="currency"
          color="purple"
          icon={<span className="text-2xl">📊</span>}
        />
        
        <KPICard
          title="Ожидают проверки"
          value={stats.pendingWithdrawals}
          color={stats.pendingWithdrawals > 3 ? "yellow" : "gray"}
          icon={<span className="text-2xl">⏳</span>}
          footer={
            stats.pendingWithdrawals > 0 && (
              <span className="text-yellow-600 text-sm">В очереди у менеджера</span>
            )
          }
        />
      </div>

      {/* Таблица последних работ */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Последние работы</h2>
          <button
            onClick={() => router.push('/junior/works')}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Показать все →
          </button>
        </div>
        
        {recentWorks.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-md text-center text-gray-500">
            <span className="text-4xl mb-4 block">📝</span>
            <p className="text-lg">У вас пока нет работ</p>
            <button
              onClick={() => router.push('/junior/work/new')}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Создать первую работу
            </button>
          </div>
        ) : (
          <DataTable
            columns={workColumns}
            data={recentWorks}
            pagination={{ pageSize: 5, showTotal: false }}
            filters={[
              { type: 'search', key: 'search', placeholder: 'Поиск по казино...' }
            ]}
            sorting={{ key: 'work_date', direction: 'desc' }}
          />
        )}
      </div>

      {/* Быстрые действия */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button 
          onClick={() => router.push('/junior/work/new')}
          className="bg-blue-50 hover:bg-blue-100 p-6 rounded-lg text-blue-800 font-medium text-center transition-colors"
          disabled={stats.availableCards === 0}
        >
          <div className="text-2xl mb-2">💳</div>
          <div>Создать депозит</div>
          {stats.availableCards === 0 && (
            <div className="text-xs text-red-500 mt-1">Нет доступных карт</div>
          )}
        </button>
        
        <button 
          onClick={() => router.push('/junior/withdrawals')}
          className="bg-green-50 hover:bg-green-100 p-6 rounded-lg text-green-800 font-medium text-center transition-colors"
        >
          <div className="text-2xl mb-2">💸</div>
          <div>Мои выводы</div>
          {stats.pendingWithdrawals > 0 && (
            <div className="text-xs text-yellow-600 mt-1">{stats.pendingWithdrawals} ожидают</div>
          )}
        </button>
        
        <button 
          onClick={() => router.push('/junior/statistics')}
          className="bg-purple-50 hover:bg-purple-100 p-6 rounded-lg text-purple-800 font-medium text-center transition-colors"
        >
          <div className="text-2xl mb-2">📊</div>
          <div>Статистика</div>
          <div className="text-xs text-gray-600 mt-1">Детальная аналитика</div>
        </button>
      </div>
    </div>
  )
}