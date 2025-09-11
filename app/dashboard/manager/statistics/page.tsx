'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import { 
  ChartBarIcon,
  ComputerDesktopIcon,
  BuildingLibraryIcon,
  UsersIcon,
  TrophyIcon,
  CalendarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface StatisticsData {
  teams: any[]
  casinos: any[]
  banks: any[]
  monthly_history: any
  summary: {
    total_profit: number
    total_works: number
    avg_success_rate: number
  }
}

export default function ManagerStatisticsPage() {
  const { addToast } = useToast()
  const [statistics, setStatistics] = useState<StatisticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('today')
  const [activeTab, setActiveTab] = useState<'overview' | 'teams' | 'casinos' | 'banks' | 'history'>('overview')

  useEffect(() => {
    loadStatistics()
  }, [period])

  async function loadStatistics() {
    try {
      setLoading(true)

      // Загружаем статистику команд
      const teamsResponse = await fetch(`/api/statistics/teams?period=${period}`)
      let teams = []
      if (teamsResponse.ok) {
        const teamsData = await teamsResponse.json()
        teams = teamsData.teams || []
      }

      // Загружаем статистику казино
      const casinosResponse = await fetch(`/api/statistics/casinos?period=${period}`)
      let casinos = []
      if (casinosResponse.ok) {
        const casinosData = await casinosResponse.json()
        casinos = casinosData.casinos?.data || []
      }

      // Загружаем статистику банков
      const banksResponse = await fetch(`/api/statistics/banks?period=${period}`)
      let banks = []
      if (banksResponse.ok) {
        const banksData = await banksResponse.json()
        banks = banksData.banks || []
      }

      // Загружаем месячную историю
      const historyResponse = await fetch('/api/statistics/monthly-history?months=6')
      let monthlyHistory = null
      if (historyResponse.ok) {
        monthlyHistory = await historyResponse.json()
      }

      // Рассчитываем общую статистику
      const summary = {
        total_profit: 
          teams.reduce((sum: number, team: any) => sum + (team.period_stats?.total_profit || 0), 0) +
          casinos.reduce((sum: number, casino: any) => sum + (casino.period_stats?.total_profit || 0), 0),
        total_works:
          teams.reduce((sum: number, team: any) => sum + (team.period_stats?.total_works_completed || 0), 0) +
          casinos.reduce((sum: number, casino: any) => sum + (casino.period_stats?.total_works_completed || 0), 0),
        avg_success_rate: 
          (teams.length + casinos.length > 0) ? 
          ((teams.reduce((sum: number, team: any) => sum + (team.period_stats?.avg_success_rate || 0), 0) +
            casinos.reduce((sum: number, casino: any) => sum + (casino.period_stats?.avg_success_rate || 0), 0)) /
           (teams.length + casinos.length)) : 0
      }

      setStatistics({
        teams,
        casinos,
        banks,
        monthly_history: monthlyHistory,
        summary
      })

    } catch (error: any) {
      console.error('Ошибка загрузки статистики:', error)
      addToast({
        type: 'error',
        title: 'Ошибка загрузки данных',
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  function getTrendIcon(trend: string) {
    switch (trend) {
      case 'growing':
      case 'improving':
        return <ArrowUpIcon className="h-4 w-4 text-green-600" />
      case 'declining':
        return <ArrowDownIcon className="h-4 w-4 text-red-600" />
      default:
        return <MinusIcon className="h-4 w-4 text-gray-600" />
    }
  }

  const teamColumns: Column<any>[] = [
    {
      key: 'team_lead',
      label: 'Team Lead',
      render: (team) => (
        <div>
          <div className="font-medium text-gray-900">
            {`${team.team_lead?.first_name || ''} ${team.team_lead?.last_name || ''}`.trim() || team.team_lead?.email}
          </div>
          <div className="text-sm text-gray-500">{team.team_lead?.email}</div>
        </div>
      )
    },
    {
      key: 'profit_rank',
      label: 'Рейтинг',
      render: (team) => (
        <div className="flex items-center">
          {team.period_stats?.profit_rank <= 3 && (
            <TrophyIcon className="h-4 w-4 text-yellow-500 mr-1" />
          )}
          <span className="font-bold text-lg">#{team.period_stats?.profit_rank || '-'}</span>
        </div>
      )
    },
    {
      key: 'total_profit',
      label: 'Прибыль',
      render: (team) => (
        <div className="text-right">
          <div className="font-bold text-green-600">
            ${team.period_stats?.total_profit?.toFixed(2) || '0.00'}
          </div>
          <div className="text-xs text-gray-500">
            Карты: ${team.period_stats?.total_card_profit?.toFixed(2) || '0.00'}
          </div>
          <div className="text-xs text-gray-500">
            PayPal: ${team.period_stats?.total_paypal_profit?.toFixed(2) || '0.00'}
          </div>
        </div>
      )
    },
    {
      key: 'success_rate',
      label: 'Эффективность',
      render: (team) => (
        <div className="text-center">
          <div className="font-bold text-blue-600">
            {team.period_stats?.avg_success_rate?.toFixed(1) || '0.0'}%
          </div>
          <div className="text-xs text-gray-500">
            Работ: {team.period_stats?.total_works_completed || 0}
          </div>
        </div>
      )
    }
  ]

  const casinoColumns: Column<any>[] = [
    {
      key: 'casino',
      label: 'Казино',
      render: (casino) => (
        <div>
          <div className="font-medium text-gray-900">{casino.casino?.name}</div>
          <div className="text-sm text-blue-600">{casino.casino?.url}</div>
          <div className="text-xs text-gray-500">
            {casino.casino?.paypal_compatible ? 'PayPal ✅' : 'Только карты'}
          </div>
        </div>
      )
    },
    {
      key: 'profit_rank',
      label: 'Рейтинг',
      render: (casino) => (
        <div className="flex items-center">
          {casino.period_stats?.profit_rank <= 3 && (
            <TrophyIcon className="h-4 w-4 text-yellow-500 mr-1" />
          )}
          <span className="font-bold text-lg">#{casino.period_stats?.profit_rank || '-'}</span>
        </div>
      )
    },
    {
      key: 'total_profit',
      label: 'Прибыль',
      render: (casino) => (
        <div className="text-right">
          <div className="font-bold text-green-600">
            ${casino.period_stats?.total_profit?.toFixed(2) || '0.00'}
          </div>
          <div className="text-xs text-gray-500">
            Работ: {casino.period_stats?.total_works_completed || 0}
          </div>
        </div>
      )
    },
    {
      key: 'success_rate',
      label: 'Успешность',
      render: (casino) => (
        <div className="text-center">
          <div className="font-bold text-blue-600">
            {casino.period_stats?.avg_success_rate?.toFixed(1) || '0.0'}%
          </div>
        </div>
      )
    }
  ]

  if (!statistics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
          <p className="mt-4 text-gray-600">Загрузка статистики...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Общая статистика</h1>
          <p className="text-gray-600">Полная аналитика команд, казино, банков и Junior'ов</p>
        </div>
        <div>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="form-input"
          >
            <option value="today">Сегодня</option>
            <option value="3days">3 дня</option>
            <option value="week">Неделя</option>
            <option value="2weeks">2 недели</option>
            <option value="month">Месяц</option>
          </select>
        </div>
      </div>

      {/* Общая статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Общая прибыль"
          value={`$${statistics.summary.total_profit.toFixed(2)}`}
          icon={<ChartBarIcon className="h-6 w-6" />}
          color="success"
        />
        <KPICard
          title="Работ завершено"
          value={statistics.summary.total_works}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Средняя эффективность"
          value={`${statistics.summary.avg_success_rate.toFixed(1)}%`}
          icon={<TrophyIcon className="h-6 w-6" />}
          color="warning"
        />
        <KPICard
          title="Активных команд"
          value={statistics.teams.length}
          icon={<UsersIcon className="h-6 w-6" />}
          color="primary"
        />
      </div>

      {/* Вкладки */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Обзор', count: null },
            { id: 'teams', label: 'Команды', count: statistics.teams.length },
            { id: 'casinos', label: 'Казино', count: statistics.casinos.length },
            { id: 'banks', label: 'Банки', count: statistics.banks.length },
            { id: 'history', label: 'История', count: null }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} {tab.count !== null && `(${tab.count})`}
            </button>
          ))}
        </nav>
      </div>

      {/* Содержимое вкладок */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Топ команды */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">🏆 Топ команды</h3>
            </div>
            <div className="p-6">
              {statistics.teams.slice(0, 5).map((team, index) => (
                <div key={team.team_lead?.id} className="flex justify-between items-center py-2">
                  <div className="flex items-center">
                    <span className="font-bold text-lg mr-2">#{index + 1}</span>
                    <div>
                      <div className="font-medium text-gray-900">
                        {`${team.team_lead?.first_name || ''} ${team.team_lead?.last_name || ''}`.trim() || team.team_lead?.email}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      ${team.period_stats?.total_profit?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Топ казино */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">🎰 Топ казино</h3>
            </div>
            <div className="p-6">
              {statistics.casinos.slice(0, 5).map((casino, index) => (
                <div key={casino.casino?.id} className="flex justify-between items-center py-2">
                  <div className="flex items-center">
                    <span className="font-bold text-lg mr-2">#{index + 1}</span>
                    <div>
                      <div className="font-medium text-gray-900">{casino.casino?.name}</div>
                      <div className="text-xs text-gray-500">
                        {casino.casino?.paypal_compatible ? 'PayPal ✅' : 'Карты'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      ${casino.period_stats?.total_profit?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Топ банки */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">🏦 Топ банки</h3>
            </div>
            <div className="p-6">
              {statistics.banks.slice(0, 5).map((bank, index) => (
                <div key={bank.bank?.id} className="flex justify-between items-center py-2">
                  <div className="flex items-center">
                    <span className="font-bold text-lg mr-2">#{index + 1}</span>
                    <div>
                      <div className="font-medium text-gray-900">{bank.bank?.name}</div>
                      <div className="text-xs text-gray-500">{bank.bank?.country}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      ${bank.period_stats?.total_profit?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* PayPal как отдельный "банк" */}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center py-2">
                  <div className="flex items-center">
                    <span className="font-bold text-lg mr-2 text-blue-600">💳</span>
                    <div>
                      <div className="font-medium text-blue-900">PayPal (BEP20)</div>
                      <div className="text-xs text-blue-600">Виртуальный банк</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-blue-600">
                      ${statistics.monthly_history?.paypal_summary?.total_profit?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'teams' && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">
              Статистика команд Team Lead'ов
            </h3>
          </div>
          
          <DataTable
            data={statistics.teams}
            columns={teamColumns}
            loading={loading}
            pagination={{ pageSize: 20 }}
            filtering={true}
            exportable={true}
            emptyMessage="Статистика команд не найдена"
          />
        </div>
      )}

      {activeTab === 'casinos' && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">
              Статистика успешности казино
            </h3>
          </div>
          
          <DataTable
            data={statistics.casinos}
            columns={casinoColumns}
            loading={loading}
            pagination={{ pageSize: 20 }}
            filtering={true}
            exportable={true}
            emptyMessage="Статистика казино не найдена"
          />
        </div>
      )}

      {activeTab === 'banks' && (
        <div className="space-y-6">
          {/* Сравнение банков и PayPal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900">🏦 Обычные банки</h3>
              </div>
              <div className="p-6">
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-blue-600">
                    ${statistics.banks.reduce((sum, bank) => sum + (bank.period_stats?.total_profit || 0), 0).toFixed(2)}
                  </div>
                  <p className="text-sm text-gray-500">Общая прибыль</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Банков:</span>
                    <span className="font-medium">{statistics.banks.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Работ:</span>
                    <span className="font-medium">
                      {statistics.banks.reduce((sum, bank) => sum + (bank.period_stats?.total_works_completed || 0), 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900">💳 PayPal (BEP20)</h3>
              </div>
              <div className="p-6">
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-green-600">
                    ${statistics.monthly_history?.paypal_summary?.total_profit?.toFixed(2) || '0.00'}
                  </div>
                  <p className="text-sm text-gray-500">Общая прибыль</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Аккаунтов:</span>
                    <span className="font-medium">{statistics.monthly_history?.paypal_summary?.total_accounts || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Работ:</span>
                    <span className="font-medium">{statistics.monthly_history?.paypal_summary?.completed_works || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && statistics.monthly_history && (
        <div className="space-y-6">
          {/* Хронология по месяцам */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">📅 Месячная хронология</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {statistics.monthly_history.chronology?.map((month: any) => (
                  <div key={month.month} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-gray-900">{month.month_name}</h4>
                      <span className="text-sm text-gray-500">{month.month}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h5 className="font-medium text-blue-800 mb-2">Команды</h5>
                        <div className="space-y-1 text-sm">
                          <div>Команд: {month.teams.count}</div>
                          <div>Прибыль: ${month.teams.total_profit.toFixed(2)}</div>
                          {month.teams.best_team && (
                            <div className="text-blue-600">
                              Лучшая: {month.teams.best_team.team_lead?.email}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-green-800 mb-2">Казино</h5>
                        <div className="space-y-1 text-sm">
                          <div>Казино: {month.casinos.count}</div>
                          <div>Прибыль: ${month.casinos.total_profit.toFixed(2)}</div>
                          {month.casinos.best_casino && (
                            <div className="text-green-600">
                              Лучшее: {month.casinos.best_casino.casino?.name}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-orange-800 mb-2">Зарплаты</h5>
                        <div className="space-y-1 text-sm">
                          <div>Сотрудников: {month.salaries.employees_count}</div>
                          <div>Фонд: ${month.salaries.total_payroll.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
