'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import KPICard from '@/components/ui/KPICard'
import DataTable, { Column } from '@/components/ui/DataTable'
import SimpleChart from '@/components/ui/SimpleChart'
import { useToast } from '@/components/ui/Toast'
import { 
  CurrencyDollarIcon, 
  ChartBarIcon, 
  UsersIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline'

interface Stats {
  totalProfit: number
  totalExpenses: number
  netIncome: number
  monthlyProfit: number
  profitChange: number
  totalSalariesOwed: number
  topJuniors: Array<{
    id: string
    name: string
    profit: number
    works_count: number
    salary_owed: number
  }>
  monthlyData: Array<{
    month: string
    profit: number
    expenses: number
    net: number
  }>
  expensesByCategory: Array<{
    category: string
    amount: number
    percentage: number
  }>
}

export default function CFODashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('current_month')
  const router = useRouter()
  const { addToast } = useToast()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      fetchStats()
    } else {
      setLoading(false)
    }
  }, [selectedPeriod])

  const fetchStats = async () => {
    try {
      const supabase = createClient()
      
      // Определяем период
      const now = new Date()
      let startDate = new Date()
      let endDate = new Date()
      
      switch (selectedPeriod) {
        case 'current_month':
          startDate.setDate(1)
          startDate.setHours(0, 0, 0, 0)
          break
        case 'last_month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          endDate = new Date(now.getFullYear(), now.getMonth(), 0)
          break
        case 'last_3_months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
          break
        case 'current_year':
          startDate = new Date(now.getFullYear(), 0, 1)
          break
      }

      // Получить все выводы за период
      const { data: withdrawals } = await supabase
        .from('work_withdrawals')
        .select(`
          withdrawal_amount,
          created_at,
          works!inner(
            deposit_amount,
            junior_id,
            work_date,
            users!inner(first_name, last_name, salary_percentage, salary_bonus)
          )
        `)
        .eq('status', 'received')
        .gte('works.work_date', startDate.toISOString())
        .lte('works.work_date', endDate.toISOString())

      // Расчет статистики
      const juniorStats = new Map()
      let totalProfit = 0
      let totalSalariesOwed = 0

      withdrawals?.forEach(w => {
        const work = Array.isArray(w.works) ? w.works[0] : w.works
        const user = Array.isArray(work?.users) ? work.users[0] : work?.users
        
        const profit = w.withdrawal_amount - (work?.deposit_amount || 0)
        totalProfit += profit
        
        const juniorId = work?.junior_id
        const juniorName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
        const salaryPercentage = user?.salary_percentage || 0
        const salaryBonus = user?.salary_bonus || 0
        
        if (juniorStats.has(juniorId)) {
          const existing = juniorStats.get(juniorId)
          existing.profit += profit
          existing.works_count += 1
        } else {
          juniorStats.set(juniorId, {
            id: juniorId,
            name: juniorName || 'Неизвестно',
            profit: profit,
            works_count: 1,
            salary_percentage: salaryPercentage,
            salary_bonus: salaryBonus,
            salary_owed: 0
          })
        }
      })

      // Расчет зарплат
      const topJuniors = Array.from(juniorStats.values()).map(junior => {
        const salaryOwed = (junior.profit * junior.salary_percentage / 100) + junior.salary_bonus
        totalSalariesOwed += salaryOwed
        return {
          ...junior,
          salary_owed: salaryOwed
        }
      }).sort((a, b) => b.profit - a.profit).slice(0, 10)

      // Получить данные по месяцам для графика
      const monthlyData = []
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
        
        const { data: monthWithdrawals } = await supabase
          .from('work_withdrawals')
          .select(`
            withdrawal_amount,
            works!inner(deposit_amount, work_date)
          `)
          .eq('status', 'received')
          .gte('works.work_date', monthStart.toISOString())
          .lte('works.work_date', monthEnd.toISOString())

        const monthProfit = monthWithdrawals?.reduce((sum, w) => {
          const work = Array.isArray(w.works) ? w.works[0] : w.works
          return sum + (w.withdrawal_amount - (work?.deposit_amount || 0))
        }, 0) || 0

        monthlyData.push({
          month: monthStart.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' }),
          profit: monthProfit,
          expenses: monthProfit * 0.15, // Примерный расчет расходов
          net: monthProfit * 0.85
        })
      }

      // Расчет изменения прибыли
      const currentMonthProfit = monthlyData[monthlyData.length - 1]?.profit || 0
      const previousMonthProfit = monthlyData[monthlyData.length - 2]?.profit || 0
      const profitChange = previousMonthProfit > 0 
        ? ((currentMonthProfit - previousMonthProfit) / previousMonthProfit) * 100 
        : 0

      setStats({
        totalProfit,
        totalExpenses: totalProfit * 0.15, // Примерный расчет
        netIncome: totalProfit * 0.85,
        monthlyProfit: currentMonthProfit,
        profitChange,
        totalSalariesOwed,
        topJuniors,
        monthlyData,
        expensesByCategory: [
          { category: 'Зарплаты', amount: totalSalariesOwed, percentage: 70 },
          { category: 'Комиссии банков', amount: totalProfit * 0.05, percentage: 15 },
          { category: 'Операционные расходы', amount: totalProfit * 0.03, percentage: 10 },
          { category: 'Прочее', amount: totalProfit * 0.02, percentage: 5 }
        ]
      })
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error)
      addToast({ type: 'error', title: 'Ошибка загрузки финансовых данных' })
    } finally {
      setLoading(false)
    }
  }

  async function calculateSalaries() {
    setCalculating(true)
    try {
      const response = await fetch('/api/cfo/calculate-salaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: selectedPeriod })
      })

      const data = await response.json()
      
      if (!response.ok) throw new Error(data.error)

      addToast({ 
        type: 'success', 
        title: 'Зарплаты рассчитаны', 
        description: `Обработано ${data.processed} сотрудников` 
      })
      
      await fetchStats()
    } catch (error) {
      console.error('Ошибка расчета зарплат:', error)
      addToast({ type: 'error', title: 'Ошибка расчета зарплат' })
    } finally {
      setCalculating(false)
    }
  }

  const columns: Column[] = [
    {
      key: 'name',
      label: 'Сотрудник',
      sortable: true,
      render: (junior: any) => (
        <div className="flex items-center">
          <UsersIcon className="h-5 w-5 text-gray-400 mr-2" />
          <div>
            <div className="font-medium text-gray-900">{junior.name}</div>
            <div className="text-sm text-gray-500">{junior.works_count} работ</div>
          </div>
        </div>
      )
    },
    {
      key: 'profit',
      label: 'Профит',
      sortable: true,
      format: 'currency',
      render: (junior: any) => (
        <div className="text-green-600 font-semibold">
          ${junior.profit.toFixed(2)}
        </div>
      )
    },
    {
      key: 'salary_owed',
      label: 'К выплате',
      sortable: true,
      format: 'currency',
      render: (junior: any) => (
        <div className="text-blue-600 font-semibold">
          ${junior.salary_owed.toFixed(2)}
        </div>
      )
    }
  ]

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">CFO Dashboard</h1>
        <div className="flex space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="current_month">Текущий месяц</option>
            <option value="last_month">Прошлый месяц</option>
            <option value="last_3_months">Последние 3 месяца</option>
            <option value="current_year">Текущий год</option>
          </select>
          
          <button
            onClick={() => router.push('/cfo/salaries')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Управление зарплатами
          </button>
          
          <button
            onClick={calculateSalaries}
            disabled={calculating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {calculating ? 'Расчет...' : 'Рассчитать зарплаты'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            title="Общий профит"
            value={`$${stats.totalProfit.toFixed(2)}`}
            color="green"
            icon={<CurrencyDollarIcon className="h-6 w-6" />}
          />
          <KPICard
            title="Расходы"
            value={`$${stats.totalExpenses.toFixed(2)}`}
            color="red"
            icon={<ChartBarIcon className="h-6 w-6" />}
          />
          <KPICard
            title="Чистая прибыль"
            value={`$${stats.netIncome.toFixed(2)}`}
            color="blue"
            icon={<ArrowTrendingUpIcon className="h-6 w-6" />}
          />
          <KPICard
            title="К выплате зарплат"
            value={`$${stats.totalSalariesOwed.toFixed(2)}`}
            color="purple"
            icon={<UsersIcon className="h-6 w-6" />}
          />
        </div>
      )}

      {/* Charts */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Monthly Profit Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Прибыль по месяцам</h3>
            <SimpleChart
              type="line"
              data={stats.monthlyData}
              xKey="month"
              yKeys={[
                { key: 'profit', label: 'Профит', color: '#10b981' },
                { key: 'expenses', label: 'Расходы', color: '#ef4444' },
                { key: 'net', label: 'Чистая прибыль', color: '#3b82f6' }
              ]}
              height={300}
            />
          </div>

          {/* Expenses Breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Структура расходов</h3>
            <SimpleChart
              type="pie"
              data={stats.expensesByCategory}
              valueKey="amount"
              labelKey="category"
              height={300}
            />
          </div>
        </div>
      )}

      {/* Top Performers */}
      {stats && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Топ сотрудников по прибыли</h3>
          </div>
          <DataTable
            data={stats.topJuniors}
            columns={columns}
            pagination={{ pageSize: 10 }}
            sorting={{ key: 'profit', direction: 'desc' }}
          />
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Быстрые действия</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/cfo/salaries')}
            className="p-4 border-2 border-dashed border-green-300 rounded-lg text-green-600 hover:bg-green-50"
          >
            <div className="text-center">
              <div className="text-2xl mb-2">💰</div>
              <div className="font-medium">Управление зарплатами</div>
            </div>
          </button>
          
          <button
            onClick={() => router.push('/cfo/expenses')}
            className="p-4 border-2 border-dashed border-red-300 rounded-lg text-red-600 hover:bg-red-50"
          >
            <div className="text-center">
              <div className="text-2xl mb-2">📊</div>
              <div className="font-medium">Учет расходов</div>
            </div>
          </button>
          
          <button
            onClick={() => router.push('/cfo/transfers')}
            className="p-4 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50"
          >
            <div className="text-center">
              <div className="text-2xl mb-2">💸</div>
              <div className="font-medium">USDT переводы</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}