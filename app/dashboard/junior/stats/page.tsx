'use client'

import { useState, useEffect } from 'react'
import KPICard from '@/components/ui/KPICard'
import { convertToUSD, getCasinoCurrency } from '@/lib/currency'
import DataTable from '@/components/ui/DataTable'
import { 
  BanknotesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TrophyIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

interface MonthlyStats {
  month: string
  year: number
  totalWorks: number
  completedWorks: number
  totalDeposits: number
  totalWithdrawals: number
  profit: number
  successRate: number
}

interface CasinoStats {
  casinoName: string
  totalWorks: number
  avgProfit: number
  successRate: number
  totalProfit: number
}

export default function JuniorStatsPage() {
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])
  const [casinoStats, setCasinoStats] = useState<CasinoStats[]>([])
  const [loading, setLoading] = useState(true)
  const [exchangeRates, setExchangeRates] = useState<any>(null)

  useEffect(() => {
    loadStatsData()
  }, [])

  // Загрузка курсов валют
  async function loadExchangeRates() {
    try {
      const response = await fetch('/api/currency-rates')
      if (response.ok) {
        const data = await response.json()
        setExchangeRates(data.rates)
      }
    } catch (error) {
      console.error('Ошибка загрузки курсов валют:', error)
      setExchangeRates({
        'USD': 1.0,
        'EUR': 1.11,
        'GBP': 1.31,
        'CAD': 0.71
      })
    }
  }

  // Используем единую функцию конвертации из lib/currency.ts

  // Загрузка статистики
  async function loadStatsData() {
    try {
      setLoading(true)
      
      // Загружаем курсы валют
      await loadExchangeRates()
      
      // Загружаем работы
      const worksResponse = await fetch('/api/works')
      if (!worksResponse.ok) throw new Error('Failed to fetch works')
      
      const works = await worksResponse.json()
      
      // Группируем по месяцам
      const monthlyData: { [key: string]: MonthlyStats } = {}
      const casinoData: { [key: string]: CasinoStats } = {}
      
      works.forEach((work: any) => {
        const workDate = new Date(work.created_at)
        const monthKey = `${workDate.getFullYear()}-${workDate.getMonth()}`
        const monthName = workDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
        
        // Инициализируем месячную статистику
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthName,
            year: workDate.getFullYear(),
            totalWorks: 0,
            completedWorks: 0,
            totalDeposits: 0,
            totalWithdrawals: 0,
            profit: 0,
            successRate: 0
          }
        }
        
        // Инициализируем статистику по казино
        const casinoName = work.casinos?.name || 'Неизвестное казино'
        if (!casinoData[casinoName]) {
          casinoData[casinoName] = {
            casinoName,
            totalWorks: 0,
            avgProfit: 0,
            successRate: 0,
            totalProfit: 0
          }
        }
        
        // Рассчитываем данные
        const depositUSD = convertToUSD(work.deposit_amount, work.casinos?.currency || 'USD')
        const receivedWithdrawals = work.work_withdrawals?.filter((w: any) => w.status === 'received') || []
        const withdrawalsUSD = receivedWithdrawals.reduce((sum: number, w: any) => {
          return sum + convertToUSD(w.withdrawal_amount, work.casinos?.currency || 'USD')
        }, 0)
        const workProfit = withdrawalsUSD - depositUSD
        
        // Обновляем месячную статистику
        monthlyData[monthKey].totalWorks++
        if (work.status === 'completed') monthlyData[monthKey].completedWorks++
        monthlyData[monthKey].totalDeposits += depositUSD
        monthlyData[monthKey].totalWithdrawals += withdrawalsUSD
        monthlyData[monthKey].profit += workProfit
        
        // Обновляем статистику по казино
        casinoData[casinoName].totalWorks++
        casinoData[casinoName].totalProfit += workProfit
      })
      
      // Рассчитываем успешность для каждого месяца
      Object.values(monthlyData).forEach(month => {
        const monthWorks = works.filter((work: any) => {
          const workDate = new Date(work.created_at)
          const monthKey = `${workDate.getFullYear()}-${workDate.getMonth()}`
          return monthKey === `${month.year}-${new Date(`${month.month} 1, ${month.year}`).getMonth()}`
        })
        
        const allWithdrawals = monthWorks.flatMap((work: any) => work.work_withdrawals || [])
        const receivedWithdrawals = allWithdrawals.filter((w: any) => w.status === 'received')
        month.successRate = allWithdrawals.length > 0 ? (receivedWithdrawals.length / allWithdrawals.length) * 100 : 0
      })
      
      // Рассчитываем статистику по казино
      Object.values(casinoData).forEach(casino => {
        casino.avgProfit = casino.totalWorks > 0 ? casino.totalProfit / casino.totalWorks : 0
        
        const casinoWorks = works.filter((work: any) => work.casinos?.name === casino.casinoName)
        const allWithdrawals = casinoWorks.flatMap((work: any) => work.work_withdrawals || [])
        const receivedWithdrawals = allWithdrawals.filter((w: any) => w.status === 'received')
        casino.successRate = allWithdrawals.length > 0 ? (receivedWithdrawals.length / allWithdrawals.length) * 100 : 0
      })
      
      setMonthlyStats(Object.values(monthlyData).sort((a, b) => b.year - a.year))
      setCasinoStats(Object.values(casinoData).sort((a, b) => b.totalProfit - a.totalProfit))
      
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error)
    } finally {
      setLoading(false)
    }
  }

  // Колонки для таблицы месячной статистики
  const monthlyColumns = [
    {
      key: 'month',
      label: 'Месяц',
      render: (stat: MonthlyStats) => (
        <div className="font-medium text-gray-900 capitalize">{stat.month}</div>
      )
    },
    {
      key: 'totalWorks',
      label: 'Работ',
      render: (stat: MonthlyStats) => (
        <div className="text-center">{stat.totalWorks}</div>
      )
    },
    {
      key: 'profit',
      label: 'Профит',
      render: (stat: MonthlyStats) => (
        <div className={`text-center font-medium ${stat.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          ${stat.profit.toFixed(2)}
        </div>
      )
    },
    {
      key: 'successRate',
      label: 'Успешность',
      render: (stat: MonthlyStats) => (
        <div className="text-center">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            stat.successRate >= 80 ? 'bg-green-100 text-green-800' :
            stat.successRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {stat.successRate.toFixed(1)}%
          </span>
        </div>
      )
    },
    {
      key: 'deposits',
      label: 'Депозиты',
      render: (stat: MonthlyStats) => (
        <div className="text-center text-red-600">-${stat.totalDeposits.toFixed(2)}</div>
      )
    },
    {
      key: 'withdrawals',
      label: 'Выводы',
      render: (stat: MonthlyStats) => (
        <div className="text-center text-green-600">+${stat.totalWithdrawals.toFixed(2)}</div>
      )
    }
  ]

  // Колонки для таблицы статистики по казино
  const casinoColumns = [
    {
      key: 'casinoName',
      label: 'Казино',
      render: (stat: CasinoStats) => (
        <div className="font-medium text-gray-900">{stat.casinoName}</div>
      )
    },
    {
      key: 'totalWorks',
      label: 'Работ',
      render: (stat: CasinoStats) => (
        <div className="text-center">{stat.totalWorks}</div>
      )
    },
    {
      key: 'totalProfit',
      label: 'Общий профит',
      render: (stat: CasinoStats) => (
        <div className={`text-center font-medium ${stat.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          ${stat.totalProfit.toFixed(2)}
        </div>
      )
    },
    {
      key: 'avgProfit',
      label: 'Средний профит',
      render: (stat: CasinoStats) => (
        <div className={`text-center ${stat.avgProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          ${stat.avgProfit.toFixed(2)}
        </div>
      )
    },
    {
      key: 'successRate',
      label: 'Успешность',
      render: (stat: CasinoStats) => (
        <div className="text-center">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            stat.successRate >= 80 ? 'bg-green-100 text-green-800' :
            stat.successRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {stat.successRate.toFixed(1)}%
          </span>
        </div>
      )
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  const totalProfit = monthlyStats.reduce((sum, month) => sum + month.profit, 0)
  const totalWorks = monthlyStats.reduce((sum, month) => sum + month.totalWorks, 0)
  const avgSuccessRate = monthlyStats.length > 0 
    ? monthlyStats.reduce((sum, month) => sum + month.successRate, 0) / monthlyStats.length 
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Статистика</h1>
        <p className="text-gray-600">Детальная аналитика работы и профита</p>
      </div>

      {/* Общая статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard
          title="Общий профит"
          value={`$${totalProfit.toFixed(2)}`}
          icon={<BanknotesIcon className="h-6 w-6" />}
          color={totalProfit >= 0 ? "success" : "danger"}
        />
        
        <KPICard
          title="Всего работ"
          value={totalWorks}
          icon={<ChartBarIcon className="h-6 w-6" />}
          color="primary"
        />
        
        <KPICard
          title="Средняя успешность"
          value={`${avgSuccessRate.toFixed(1)}%`}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="primary"
        />
        
        <KPICard
          title="Лучшее казино"
          value={casinoStats[0]?.casinoName || 'Нет данных'}
          icon={<TrophyIcon className="h-6 w-6" />}
          color="warning"
        />
      </div>

      {/* Статистика по месяцам */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Статистика по месяцам</h3>
        </div>
        <div className="card-content">
          <DataTable
            columns={monthlyColumns}
            data={monthlyStats}
            emptyMessage="Нет данных за выбранный период"
          />
        </div>
      </div>

      {/* Статистика по казино */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Статистика по казино</h3>
        </div>
        <div className="card-content">
          <DataTable
            columns={casinoColumns}
            data={casinoStats}
            emptyMessage="Нет данных по казино"
          />
        </div>
      </div>
    </div>
  )
}
