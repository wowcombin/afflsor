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
  newWithdrawals: number
  pendingWithdrawals: number
  approvedWithdrawals: number
  rejectedWithdrawals: number
  totalProfit: number
  todayProfit: number
  weekProfit: number
  monthProfit: number
  avgProcessingTime: number
  overdueWithdrawals: number
  statusStats: {
    new: { today: number, week: number, month: number }
    waiting: { today: number, week: number, month: number }
    received: { today: number, week: number, month: number }
    block: { today: number, week: number, month: number }
  }
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
      
      // Загружаем реальные данные из API
      const response = await fetch(`/api/manager/analytics?dateRange=${dateRange}`)
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить данные аналитики')
      }

      const analyticsData = await response.json()
      setAnalytics(analyticsData)
    } catch (error) {
      console.error('Ошибка загрузки аналитики:', error)
      addToast({
        type: 'error',
        title: 'Ошибка загрузки',
        description: error instanceof Error ? error.message : 'Не удалось загрузить данные аналитики'
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Ожидают</p>
              <p className="text-3xl font-bold text-yellow-600">{analytics.pendingWithdrawals}</p>
            </div>
            <ClockIcon className="h-8 w-8 text-yellow-600" />
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Ожидаемый профит:</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Сегодня:</span>
              <span className="font-medium">${analytics.statusStats.waiting.today}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">За неделю:</span>
              <span className="font-medium">${analytics.statusStats.waiting.week}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">За месяц:</span>
              <span className="font-medium">${analytics.statusStats.waiting.month}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Новые</p>
              <p className="text-3xl font-bold text-blue-600">{analytics.newWithdrawals}</p>
            </div>
            <ExclamationTriangleIcon className="h-8 w-8 text-blue-600" />
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Ожидаемый профит:</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Сегодня:</span>
              <span className="font-medium">${analytics.statusStats.new.today}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">За неделю:</span>
              <span className="font-medium">${analytics.statusStats.new.week}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">За месяц:</span>
              <span className="font-medium">${analytics.statusStats.new.month}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Одобрено</p>
              <p className="text-3xl font-bold text-green-600">{analytics.approvedWithdrawals}</p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Профит:</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Сегодня:</span>
              <span className="font-medium text-green-600">${analytics.statusStats.received.today}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">За неделю:</span>
              <span className="font-medium text-green-600">${analytics.statusStats.received.week}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">За месяц:</span>
              <span className="font-medium text-green-600">${analytics.statusStats.received.month}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Заблокировано</p>
              <p className="text-3xl font-bold text-red-600">{analytics.rejectedWithdrawals}</p>
            </div>
            <XCircleIcon className="h-8 w-8 text-red-600" />
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Потеряно средств:</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Сегодня:</span>
              <span className="font-medium text-red-600">${analytics.statusStats.block.today}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">За неделю:</span>
              <span className="font-medium text-red-600">${analytics.statusStats.block.week}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">За месяц:</span>
              <span className="font-medium text-red-600">${analytics.statusStats.block.month}</span>
            </div>
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
                <span className="text-sm text-green-600">
                  {analytics.todayProfit > 0 ? '+' : ''}
                  {((analytics.todayProfit / Math.max(analytics.weekProfit - analytics.todayProfit, 1)) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">За неделю</p>
              <p className="text-2xl font-bold text-blue-600">
                ${analytics.weekProfit.toFixed(2)}
              </p>
              <div className="flex items-center justify-center mt-1">
                <ArrowTrendingUpIcon className="h-4 w-4 text-blue-500 mr-1" />
                <span className="text-sm text-blue-600">
                  {analytics.weekProfit > 0 ? '+' : ''}
                  {((analytics.weekProfit / Math.max(analytics.monthProfit - analytics.weekProfit, 1)) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">За месяц</p>
              <p className="text-2xl font-bold text-purple-600">
                ${analytics.monthProfit.toFixed(2)}
              </p>
              <div className="flex items-center justify-center mt-1">
                <ArrowTrendingUpIcon className="h-4 w-4 text-purple-500 mr-1" />
                <span className="text-sm text-purple-600">
                  {analytics.monthProfit > 0 ? '+' : ''}
                  {((analytics.monthProfit / Math.max(analytics.totalProfit - analytics.monthProfit, 1)) * 100).toFixed(1)}%
                </span>
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
