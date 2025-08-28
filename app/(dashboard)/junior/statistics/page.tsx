'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import KPICard from '@/components/ui/KPICard'
import SimpleChart from '@/components/ui/SimpleChart'
import DataTable, { Column } from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'

interface StatisticsData {
  monthlyProfit: Array<{ month: string; profit: number }>
  casinoStats: Array<{ name: string; count: number; profit: number }>
  dailyActivity: Array<{ date: string; deposits: number; withdrawals: number }>
  statusDistribution: Array<{ status: string; count: number }>
}

export default function JuniorStatisticsPage() {
  const router = useRouter()
  const [stats, setStats] = useState<StatisticsData>({
    monthlyProfit: [],
    casinoStats: [],
    dailyActivity: [],
    statusDistribution: []
  })
  const [summary, setSummary] = useState({
    totalProfit: 0,
    totalDeposits: 0,
    avgDepositAmount: 0,
    successRate: 0,
    bestCasino: '',
    totalWorks: 0
  })
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month')

  useEffect(() => {
    loadStatistics()
  }, [timeRange])

  async function loadStatistics() {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      // Определяем период
      const now = new Date()
      const startDate = new Date()
      
      switch (timeRange) {
        case 'week':
          startDate.setDate(now.getDate() - 7)
          break
        case 'month':
          startDate.setMonth(now.getMonth() - 1)
          break
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3)
          break
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1)
          break
      }

      // Получаем все работы с выводами
      const { data: worksData } = await supabase
        .from('works')
        .select(`
          *,
          casinos(name),
          work_withdrawals(withdrawal_amount, status, created_at)
        `)
        .eq('junior_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })

      if (!worksData) return

      // Обрабатываем данные
      const totalDeposits = worksData.reduce((sum, work) => sum + work.deposit_amount, 0)
      const successfulWithdrawals = worksData.filter(work => 
        work.work_withdrawals.some(w => w.status === 'received')
      )
      const totalProfit = successfulWithdrawals.reduce((sum, work) => {
        const withdrawal = work.work_withdrawals.find(w => w.status === 'received')
        return sum + (withdrawal ? withdrawal.withdrawal_amount - work.deposit_amount : 0)
      }, 0)

      // Статистика по казино
      const casinoMap = new Map()
      worksData.forEach(work => {
        const casinoName = work.casinos?.name || 'Unknown'
        if (!casinoMap.has(casinoName)) {
          casinoMap.set(casinoName, { name: casinoName, count: 0, profit: 0 })
        }
        const casino = casinoMap.get(casinoName)
        casino.count++
        
        const withdrawal = work.work_withdrawals.find(w => w.status === 'received')
        if (withdrawal) {
          casino.profit += withdrawal.withdrawal_amount - work.deposit_amount
        }
      })

      // Месячная прибыль (последние 6 месяцев)
      const monthlyProfitMap = new Map()
      for (let i = 5; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const monthKey = date.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' })
        monthlyProfitMap.set(monthKey, 0)
      }

      successfulWithdrawals.forEach(work => {
        const withdrawal = work.work_withdrawals.find(w => w.status === 'received')
        if (withdrawal) {
          const monthKey = new Date(withdrawal.created_at).toLocaleDateString('ru-RU', { 
            month: 'short', 
            year: 'numeric' 
          })
          if (monthlyProfitMap.has(monthKey)) {
            monthlyProfitMap.set(monthKey, 
              monthlyProfitMap.get(monthKey) + (withdrawal.withdrawal_amount - work.deposit_amount)
            )
          }
        }
      })

      // Распределение статусов
      const statusMap = new Map()
      worksData.forEach(work => {
        work.work_withdrawals.forEach(withdrawal => {
          const status = withdrawal.status
          statusMap.set(status, (statusMap.get(status) || 0) + 1)
        })
      })

      // Дневная активность (последние 7 дней)
      const dailyActivityMap = new Map()
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateKey = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
        dailyActivityMap.set(dateKey, { date: dateKey, deposits: 0, withdrawals: 0 })
      }

      worksData.forEach(work => {
        const dateKey = new Date(work.created_at).toLocaleDateString('ru-RU', { 
          day: '2-digit', 
          month: '2-digit' 
        })
        if (dailyActivityMap.has(dateKey)) {
          dailyActivityMap.get(dateKey).deposits++
        }

        work.work_withdrawals.forEach(withdrawal => {
          const withdrawalDateKey = new Date(withdrawal.created_at).toLocaleDateString('ru-RU', { 
            day: '2-digit', 
            month: '2-digit' 
          })
          if (dailyActivityMap.has(withdrawalDateKey)) {
            dailyActivityMap.get(withdrawalDateKey).withdrawals++
          }
        })
      })

      const bestCasino = Array.from(casinoMap.values())
        .sort((a, b) => b.profit - a.profit)[0]?.name || 'N/A'

      setStats({
        monthlyProfit: Array.from(monthlyProfitMap.entries()).map(([month, profit]) => ({
          month,
          profit
        })),
        casinoStats: Array.from(casinoMap.values()).sort((a, b) => b.profit - a.profit),
        dailyActivity: Array.from(dailyActivityMap.values()),
        statusDistribution: Array.from(statusMap.entries()).map(([status, count]) => ({
          status,
          count
        }))
      })

      setSummary({
        totalProfit,
        totalDeposits,
        avgDepositAmount: worksData.length > 0 ? totalDeposits / worksData.length : 0,
        successRate: worksData.length > 0 ? (successfulWithdrawals.length / worksData.length) * 100 : 0,
        bestCasino,
        totalWorks: worksData.length
      })

    } catch (error) {
      console.error('Error loading statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  const casinoColumns: Column[] = [
    {
      key: 'name',
      label: 'Казино',
      sortable: true
    },
    {
      key: 'count',
      label: 'Работ',
      sortable: true,
      align: 'center'
    },
    {
      key: 'profit',
      label: 'Профит',
      sortable: true,
      align: 'right',
      render: (value: number) => (
        <span className={value > 0 ? 'text-green-600 font-semibold' : 'text-red-600'}>
          ${value.toFixed(2)}
        </span>
      )
    },
    {
      key: 'avgProfit',
      label: 'Средний профит',
      align: 'right',
      render: (_, row: any) => {
        const avg = row.count > 0 ? row.profit / row.count : 0
        return (
          <span className={avg > 0 ? 'text-green-600' : 'text-red-600'}>
            ${avg.toFixed(2)}
          </span>
        )
      }
    }
  ]

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
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
          <h1 className="text-3xl font-bold">Статистика и аналитика</h1>
          <p className="text-gray-600 mt-2">Детальный анализ ваших работ и результатов</p>
        </div>
        <div className="flex gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="week">Неделя</option>
            <option value="month">Месяц</option>
            <option value="quarter">Квартал</option>
            <option value="year">Год</option>
          </select>
          <button
            onClick={() => router.push('/junior/dashboard')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            ← Назад
          </button>
        </div>
      </div>

      {/* Основные метрики */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Общий профит"
          value={summary.totalProfit}
          format="currency"
          color="green"
          icon={<span className="text-2xl">💰</span>}
        />
        
        <KPICard
          title="Всего депозитов"
          value={summary.totalDeposits}
          format="currency"
          color="blue"
          icon={<span className="text-2xl">💳</span>}
        />
        
        <KPICard
          title="Средний депозит"
          value={summary.avgDepositAmount}
          format="currency"
          color="purple"
          icon={<span className="text-2xl">📊</span>}
        />
        
        <KPICard
          title="Успешность"
          value={summary.successRate}
          format="percentage"
          color={summary.successRate >= 80 ? "green" : summary.successRate >= 60 ? "yellow" : "red"}
          icon={<span className="text-2xl">📈</span>}
        />
      </div>

      {/* Графики */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SimpleChart
          title="Профит по месяцам"
          type="line"
          data={stats.monthlyProfit.map(item => ({
            label: item.month,
            value: item.profit
          }))}
          height={250}
        />
        
        <SimpleChart
          title="Активность по дням"
          type="bar"
          data={stats.dailyActivity.map(item => ({
            label: item.date,
            value: item.deposits + item.withdrawals
          }))}
          height={250}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SimpleChart
          title="Распределение статусов выводов"
          type="pie"
          data={stats.statusDistribution.map(item => ({
            label: item.status,
            value: item.count
          }))}
          height={250}
        />
        
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ключевые показатели</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Всего работ:</span>
              <span className="font-semibold">{summary.totalWorks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Лучшее казино:</span>
              <span className="font-semibold">{summary.bestCasino}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ROI:</span>
              <span className={`font-semibold ${
                summary.totalDeposits > 0 && (summary.totalProfit / summary.totalDeposits) > 0 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {summary.totalDeposits > 0 
                  ? `${((summary.totalProfit / summary.totalDeposits) * 100).toFixed(1)}%`
                  : '0%'
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Таблица статистики по казино */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Статистика по казино</h2>
        <DataTable
          columns={casinoColumns}
          data={stats.casinoStats}
          pagination={{ pageSize: 10, showTotal: true }}
          sorting={{ key: 'profit', direction: 'desc' }}
          filters={[
            { type: 'search', key: 'search', placeholder: 'Поиск казино...' }
          ]}
          export={true}
        />
      </div>
    </div>
  )
}
