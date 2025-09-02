'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import KPICard from '@/components/ui/KPICard'
import { 
  BanknotesIcon,
  CheckCircleIcon,
  TrophyIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

interface DashboardStats {
  monthlyProfit: number
  expectedProfit: number
  successRate: number
  teamRanking: number
  totalTeamMembers: number
  daysUntilPayment: number
  totalWorks: number
  activeWorks: number
  completedWorks: number
  totalWithdrawals: number
  receivedWithdrawals: number
}

export default function JuniorDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    monthlyProfit: 0,
    expectedProfit: 0,
    successRate: 0,
    teamRanking: 0,
    totalTeamMembers: 0,
    daysUntilPayment: 0,
    totalWorks: 0,
    activeWorks: 0,
    completedWorks: 0,
    totalWithdrawals: 0,
    receivedWithdrawals: 0
  })
  const [loading, setLoading] = useState(true)
  const [exchangeRates, setExchangeRates] = useState<any>(null)

  useEffect(() => {
    loadDashboardData()
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
      // Используем fallback курсы
      setExchangeRates({
        'USD': 1.0,
        'EUR': 1.11,
        'GBP': 1.31,
        'CAD': 0.71
      })
    }
  }

  // Функция конвертации в USD
  function convertToUSD(amount: number, currency: string): number {
    if (!exchangeRates || currency === 'USD') return amount
    const rate = exchangeRates[currency] || 1
    return amount * rate
  }

  // Загрузка данных дашборда
  async function loadDashboardData() {
    try {
      setLoading(true)
      
      // Загружаем курсы валют и работы параллельно
      const [ratesResponse, worksResponse] = await Promise.all([
        fetch('/api/currency-rates'),
        fetch('/api/works')
      ])
      
      // Обрабатываем курсы валют
      let rates: any = null
      if (ratesResponse.ok) {
        const ratesData = await ratesResponse.json()
        rates = ratesData.rates
        setExchangeRates(rates)
      } else {
        // Fallback курсы
        rates = {
          'USD': 1.0,
          'EUR': 1.11,
          'GBP': 1.31,
          'CAD': 0.71
        }
        setExchangeRates(rates)
      }
      
      if (!worksResponse.ok) throw new Error('Failed to fetch works')
      const { works } = await worksResponse.json()
      
      // Локальная функция конвертации с загруженными курсами
      const localConvertToUSD = (amount: number, currency: string): number => {
        if (!rates || currency === 'USD') return amount
        const rate = rates[currency] || 1
        console.log(`Converting ${amount} ${currency} to USD: rate=${rate}, result=${amount * rate}`)
        return amount * rate
      }
      
      // Рассчитываем статистику
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      
      // Фильтруем работы текущего месяца
      const monthlyWorks = works.filter((work: any) => {
        const workDate = new Date(work.created_at)
        return workDate.getMonth() === currentMonth && workDate.getFullYear() === currentYear
      })
      
      // Рассчитываем профит за месяц (выводы - депозиты в USD)
      let monthlyProfit = 0
      let expectedProfit = 0 // Ожидаемый профит (включая активные работы)
      
      monthlyWorks.forEach((work: any) => {
        const depositUSD = localConvertToUSD(work.deposit_amount, work.casinos?.currency || 'USD')
        const receivedWithdrawals = work.work_withdrawals?.filter((w: any) => w.status === 'received') || []
        const allWithdrawals = work.work_withdrawals || []
        
        // Фактический профит (только полученные выводы)
        const withdrawalsUSD = receivedWithdrawals.reduce((sum: number, w: any) => {
          return sum + localConvertToUSD(w.withdrawal_amount, work.casinos?.currency || 'USD')
        }, 0)
        monthlyProfit += (withdrawalsUSD - depositUSD)
        
        // Ожидаемый профит (все выводы, включая ожидающие)
        const expectedWithdrawalsUSD = allWithdrawals.reduce((sum: number, w: any) => {
          return sum + localConvertToUSD(w.withdrawal_amount, work.casinos?.currency || 'USD')
        }, 0)
        expectedProfit += (expectedWithdrawalsUSD - depositUSD)
      })
      
      // Рассчитываем успешность (% одобренных выводов)
      const allWithdrawals = works.flatMap((work: any) => work.work_withdrawals || [])
      const receivedWithdrawals = allWithdrawals.filter((w: any) => w.status === 'received')
      const successRate = allWithdrawals.length > 0 ? (receivedWithdrawals.length / allWithdrawals.length) * 100 : 0
      
      // Дни до выплаты (до конца месяца)
      const now = new Date()
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const daysUntilPayment = Math.ceil((lastDayOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      setStats({
        monthlyProfit,
        expectedProfit,
        successRate,
        teamRanking: 1, // TODO: Получить из API команды
        totalTeamMembers: 5, // TODO: Получить из API команды
        daysUntilPayment,
        totalWorks: works.length,
        activeWorks: works.filter((w: any) => w.status === 'active').length,
        completedWorks: works.filter((w: any) => w.status === 'completed').length,
        totalWithdrawals: allWithdrawals.length,
        receivedWithdrawals: receivedWithdrawals.length
      })
      
    } catch (error) {
      console.error('Ошибка загрузки данных дашборда:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Junior Dashboard</h1>
        <p className="text-gray-600">Управление депозитами и выводами средств</p>
      </div>

      {/* Основные KPI */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <KPICard
          title="Профит за месяц"
          value={`$${stats.monthlyProfit.toFixed(2)}`}
          icon={<BanknotesIcon className="h-6 w-6" />}
          color="success"
        />
        
        <KPICard
          title="Ожидаемый профит"
          value={`$${stats.expectedProfit.toFixed(2)}`}
          icon={<ChartBarIcon className="h-6 w-6" />}
          color="primary"
        />
        
        <KPICard
          title="Успешность"
          value={`${stats.successRate.toFixed(1)}%`}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="primary"
        />
        
        <KPICard
          title="Рейтинг"
          value={`${stats.teamRanking}/${stats.totalTeamMembers}`}
          icon={<TrophyIcon className="h-6 w-6" />}
          color="warning"
        />
        
        <KPICard
          title="До выплаты"
          value={`${stats.daysUntilPayment} дн.`}
          icon={<CalendarDaysIcon className="h-6 w-6" />}
          color="gray"
        />
      </div>

      {/* Статистика работ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard
          title="Всего работ"
          value={stats.totalWorks}
          icon={<CreditCardIcon className="h-6 w-6" />}
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
      </div>

      {/* Быстрые действия */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Быстрые действия</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => router.push('/dashboard/junior/work/new')}
            className="btn-primary"
          >
            Создать новую работу
          </button>
          <button 
            onClick={() => router.push('/dashboard/junior/withdrawals')}
            className="btn-secondary"
          >
            Просмотреть выводы
          </button>
          <button 
            onClick={() => router.push('/dashboard/junior/cards')}
            className="btn-secondary"
          >
            Мои карты
          </button>
        </div>
      </div>

      {/* Информация */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
        <h3 className="font-medium text-primary-900 mb-3">🚀 Новая ERP система</h3>
        <div className="text-sm text-primary-800 space-y-2">
          <div>• Система полностью переписана с нуля</div>
          <div>• Улучшенная производительность и безопасность</div>
          <div>• Новый современный интерфейс</div>
          <div>• Функционал будет добавляться поэтапно</div>
        </div>
      </div>
    </div>
  )
}
