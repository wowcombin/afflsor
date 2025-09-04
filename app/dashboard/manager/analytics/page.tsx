'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import { 
  ChartBarIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface AnalyticsData {
  totalJuniors: number
  activeJuniors: number
  totalWithdrawals: number
  pendingWithdrawals: number
  approvedWithdrawals: number
  rejectedWithdrawals: number
  totalProfit: number
  todayProfit: number
  weekProfit: number
  monthProfit: number
  avgProcessingTime: number
  overdueWithdrawals: number
  topPerformers: Array<{
    id: string
    name: string
    telegram: string
    profit: number
    withdrawals: number
    successRate: number
  }>
  casinoStats: Array<{
    name: string
    totalDeposits: number
    totalWithdrawals: number
    profit: number
    successRate: number
  }>
  dailyStats: Array<{
    date: string
    deposits: number
    withdrawals: number
    profit: number
  }>
}

type DateRange = '7d' | '30d' | '90d'

export default function ManagerAnalyticsPage() {
  const { addToast } = useToast()
  
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>('30d')

  useEffect(() => {
    loadAnalytics()
  }, [dateRange])

  async function loadAnalytics() {
    try {
      setLoading(true)
      
      // Пока используем моковые данные
      // В будущем здесь будет реальный API запрос
      const mockData: AnalyticsData = {
        totalJuniors: 12,
        activeJuniors: 8,
        totalWithdrawals: 156,
        pendingWithdrawals: 23,
        approvedWithdrawals: 118,
        rejectedWithdrawals: 15,
        totalProfit: 15420.50,
        todayProfit: 1250.30,
        weekProfit: 8750.20,
        monthProfit: 15420.50,
        avgProcessingTime: 2.5,
        overdueWithdrawals: 5,
        topPerformers: [
          {
            id: '1',
            name: 'Алексей Петров',
            telegram: '@alex_trader',
            profit: 3250.80,
            withdrawals: 28,
            successRate: 92.5
          },
          {
            id: '2',
            name: 'Мария Сидорова',
            telegram: '@maria_crypto',
            profit: 2890.40,
            withdrawals: 24,
            successRate: 87.5
          },
          {
            id: '3',
            name: 'Дмитрий Козлов',
            telegram: '@dmitry_win',
            profit: 2650.20,
            withdrawals: 22,
            successRate: 90.9
          }
        ],
        casinoStats: [
          {
            name: 'Virgin Games',
            totalDeposits: 12500.00,
            totalWithdrawals: 18750.00,
            profit: 6250.00,
            successRate: 85.2
          },
          {
            name: 'Betfair Casino',
            totalDeposits: 8900.00,
            totalWithdrawals: 12340.00,
            profit: 3440.00,
            successRate: 78.9
          },
          {
            name: 'William Hill',
            totalDeposits: 7650.00,
            totalWithdrawals: 10890.00,
            profit: 3240.00,
            successRate: 82.1
          }
        ],
        dailyStats: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          deposits: Math.floor(Math.random() * 2000) + 500,
          withdrawals: Math.floor(Math.random() * 3000) + 800,
          profit: Math.floor(Math.random() * 1000) + 200
        })).reverse()
      }

      // Симулируем задержку API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setAnalytics(mockData)
    } catch (error) {
      console.error('Ошибка загрузки аналитики:', error)
      addToast({
        type: 'error',
        title: 'Ошибка загрузки',
        description: 'Не удалось загрузить данные аналитики'
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка аналитики...</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Данные недоступны</h3>
        <p className="text-gray-600">Не удалось загрузить данные аналитики</p>
        <button onClick={loadAnalytics} className="btn-primary mt-4">
          Попробовать снова
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Аналитика команды</h1>
          <p className="text-gray-600">Детальная статистика работы Junior сотрудников</p>
        </div>
        
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as DateRange)}
          className="form-select"
        >
          <option value="7d">Последние 7 дней</option>
          <option value="30d">Последние 30 дней</option>
          <option value="90d">Последние 90 дней</option>
        </select>
      </div>

      {/* Основные метрики */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UsersIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Активные Junior</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.activeJuniors}/{analytics.totalJuniors}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Общий профит</p>
              <p className="text-2xl font-bold text-gray-900">
                ${analytics.totalProfit.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Среднее время обработки</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.avgProcessingTime}ч
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Просрочено</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.overdueWithdrawals}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Статистика выводов */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Ожидают</p>
              <p className="text-3xl font-bold text-yellow-600">{analytics.pendingWithdrawals}</p>
            </div>
            <ClockIcon className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Одобрено</p>
              <p className="text-3xl font-bold text-green-600">{analytics.approvedWithdrawals}</p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Отклонено</p>
              <p className="text-3xl font-bold text-red-600">{analytics.rejectedWithdrawals}</p>
            </div>
            <XCircleIcon className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Профит по периодам */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center">
            <ArrowTrendingUpIcon className="h-5 w-5 mr-2" />
            Профит по периодам
          </h3>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Сегодня</p>
              <p className="text-2xl font-bold text-green-600">
                ${analytics.todayProfit.toFixed(2)}
              </p>
              <div className="flex items-center justify-center mt-1">
                <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+12.5%</span>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">За неделю</p>
              <p className="text-2xl font-bold text-blue-600">
                ${analytics.weekProfit.toFixed(2)}
              </p>
              <div className="flex items-center justify-center mt-1">
                <ArrowTrendingUpIcon className="h-4 w-4 text-blue-500 mr-1" />
                <span className="text-sm text-blue-600">+8.3%</span>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">За месяц</p>
              <p className="text-2xl font-bold text-purple-600">
                ${analytics.monthProfit.toFixed(2)}
              </p>
              <div className="flex items-center justify-center mt-1">
                <ArrowTrendingUpIcon className="h-4 w-4 text-purple-500 mr-1" />
                <span className="text-sm text-purple-600">+15.7%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Топ исполнители */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Топ исполнители
          </h3>
        </div>
        <div className="card-content">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Junior
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Профит
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Выводы
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Успешность
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.topPerformers.map((performer, index) => (
                  <tr key={performer.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-600">
                              #{index + 1}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {performer.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {performer.telegram}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-600">
                        ${performer.profit.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {performer.withdrawals}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">
                          {performer.successRate}%
                        </div>
                        <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${performer.successRate}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Статистика по казино */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center">
            <CurrencyDollarIcon className="h-5 w-5 mr-2" />
            Статистика по казино
          </h3>
        </div>
        <div className="card-content">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Казино
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Депозиты
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Выводы
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Профит
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Успешность
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.casinoStats.map((casino, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {casino.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ${casino.totalDeposits.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ${casino.totalWithdrawals.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-600">
                        ${casino.profit.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">
                          {casino.successRate}%
                        </div>
                        <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${casino.successRate}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Информация */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">📊 О данных аналитики:</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <div>• Данные обновляются в реальном времени</div>
          <div>• Профит рассчитывается в USD по курсу Google -5%</div>
          <div>• Успешность = (Одобренные выводы / Общее количество) × 100%</div>
          <div>• Просрочено = выводы ожидающие более 4 часов</div>
          <div>• Статистика включает только завершенные операции</div>
        </div>
      </div>
    </div>
  )
}
