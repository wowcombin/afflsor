'use client'

import { useState, useEffect } from 'react'
import { 
  ChartBarIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  DocumentChartBarIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'

interface EmployeeStats {
  id: string
  name: string
  email: string
  role: string
  totalProfit: number
  totalWithdrawals: number
  successRate: number
  activeWorks: number
  completedWorks: number
  avgDailyProfit: number
  lastActivity: string
}

interface TeamStats {
  teamLeadName: string
  teamLeadId: string
  totalMembers: number
  totalProfit: number
  avgSuccessRate: number
  topPerformer: string
}

interface ReportData {
  totalEmployees: number
  activeEmployees: number
  totalProfit: number
  avgSuccessRate: number
  topPerformers: EmployeeStats[]
  teamStats: TeamStats[]
  monthlyTrends: Array<{
    month: string
    profit: number
    employees: number
  }>
}

export default function HRReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('current_month')
  const [selectedRole, setSelectedRole] = useState('all')

  useEffect(() => {
    loadReportData()
  }, [selectedPeriod, selectedRole])

  const loadReportData = async () => {
    try {
      setLoading(true)
      
      // Здесь будет API запрос для получения данных отчета
      // Пока используем моковые данные
      const mockData: ReportData = {
        totalEmployees: 25,
        activeEmployees: 22,
        totalProfit: 45670.50,
        avgSuccessRate: 78.5,
        topPerformers: [
          {
            id: '1',
            name: 'Иван Петров',
            email: 'ivan@example.com',
            role: 'junior',
            totalProfit: 5670.50,
            totalWithdrawals: 12,
            successRate: 92.3,
            activeWorks: 3,
            completedWorks: 45,
            avgDailyProfit: 189.02,
            lastActivity: '2024-01-15T10:30:00Z'
          },
          {
            id: '2',
            name: 'Мария Сидорова',
            email: 'maria@example.com',
            role: 'junior',
            totalProfit: 4890.25,
            totalWithdrawals: 10,
            successRate: 87.1,
            activeWorks: 2,
            completedWorks: 38,
            avgDailyProfit: 162.34,
            lastActivity: '2024-01-15T09:15:00Z'
          },
          {
            id: '3',
            name: 'Алексей Козлов',
            email: 'alex@example.com',
            role: 'junior',
            totalProfit: 4234.75,
            totalWithdrawals: 8,
            successRate: 81.5,
            activeWorks: 4,
            completedWorks: 32,
            avgDailyProfit: 140.49,
            lastActivity: '2024-01-15T11:45:00Z'
          }
        ],
        teamStats: [
          {
            teamLeadName: 'Анна Волкова',
            teamLeadId: 'tl1',
            totalMembers: 5,
            totalProfit: 15670.25,
            avgSuccessRate: 85.2,
            topPerformer: 'Иван Петров'
          },
          {
            teamLeadName: 'Дмитрий Орлов',
            teamLeadId: 'tl2',
            totalMembers: 4,
            totalProfit: 12340.50,
            avgSuccessRate: 79.8,
            topPerformer: 'Мария Сидорова'
          }
        ],
        monthlyTrends: [
          { month: 'Ноя 2023', profit: 38450.25, employees: 20 },
          { month: 'Дек 2023', profit: 42130.75, employees: 23 },
          { month: 'Янв 2024', profit: 45670.50, employees: 25 }
        ]
      }

      setReportData(mockData)
    } catch (error) {
      console.error('Error loading report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportReport = () => {
    // Здесь будет логика экспорта отчета
    console.log('Exporting report...')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка отчетов...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и фильтры */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <DocumentChartBarIcon className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Отчеты по эффективности</h1>
            <p className="text-gray-600">Аналитика производительности сотрудников и команд</p>
          </div>
        </div>
        <button
          onClick={exportReport}
          className="btn-secondary flex items-center space-x-2"
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          <span>Экспорт</span>
        </button>
      </div>

      {/* Фильтры */}
      <div className="card">
        <div className="card-content">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="form-label">Период</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="form-select"
              >
                <option value="current_month">Текущий месяц</option>
                <option value="last_month">Прошлый месяц</option>
                <option value="last_3_months">Последние 3 месяца</option>
                <option value="current_year">Текущий год</option>
              </select>
            </div>
            <div>
              <label className="form-label">Роль</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="form-select"
              >
                <option value="all">Все роли</option>
                <option value="junior">Junior</option>
                <option value="teamlead">Team Lead</option>
                <option value="tester">Manual QA</option>
                <option value="qa_assistant">QA Assistant</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Общая статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Всего сотрудников</p>
                <p className="text-2xl font-bold text-gray-900">{reportData?.totalEmployees}</p>
              </div>
              <UsersIcon className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-2 flex items-center">
              <span className="text-sm text-green-600">
                {reportData?.activeEmployees} активных
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Общий профит</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(reportData?.totalProfit || 0)}
                </p>
              </div>
              <CurrencyDollarIcon className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-2 flex items-center">
              <ArrowTrendingUpIcon className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-sm text-green-600">+12.5% к прошлому месяцу</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Средний успех</p>
                <p className="text-2xl font-bold text-gray-900">
                  {reportData?.avgSuccessRate.toFixed(1)}%
                </p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-purple-500" />
            </div>
            <div className="mt-2 flex items-center">
              <ArrowTrendingUpIcon className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-sm text-green-600">+3.2% к прошлому месяцу</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Активные работы</p>
                <p className="text-2xl font-bold text-gray-900">
                  {reportData?.topPerformers.reduce((sum, emp) => sum + emp.activeWorks, 0)}
                </p>
              </div>
              <CalendarIcon className="w-8 h-8 text-orange-500" />
            </div>
            <div className="mt-2 flex items-center">
              <span className="text-sm text-gray-600">В процессе выполнения</span>
            </div>
          </div>
        </div>
      </div>

      {/* Топ исполнители */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Топ исполнители</h3>
        </div>
        <div className="card-content">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Сотрудник
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Роль
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Профит
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Успешность
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Работы
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Последняя активность
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData?.topPerformers.map((employee, index) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {index + 1}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {employee.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {employee.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {employee.role === 'junior' ? 'Junior' : 
                         employee.role === 'teamlead' ? 'Team Lead' :
                         employee.role === 'tester' ? 'Manual QA' :
                         employee.role === 'qa_assistant' ? 'QA Assistant' :
                         employee.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-medium">{formatCurrency(employee.totalProfit)}</div>
                      <div className="text-xs text-gray-500">
                        {formatCurrency(employee.avgDailyProfit)}/день
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">
                          {employee.successRate.toFixed(1)}%
                        </div>
                        {employee.successRate >= 80 ? (
                          <ArrowTrendingUpIcon className="w-4 h-4 text-green-500 ml-1" />
                        ) : (
                          <ArrowTrendingDownIcon className="w-4 h-4 text-red-500 ml-1" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{employee.activeWorks} активных</div>
                      <div className="text-xs text-gray-500">
                        {employee.completedWorks} завершено
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(employee.lastActivity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Статистика по командам */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Статистика по командам Team Lead</h3>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reportData?.teamStats.map((team) => (
              <div key={team.teamLeadId} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">{team.teamLeadName}</h4>
                  <span className="text-sm text-gray-500">{team.totalMembers} участников</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Общий профит:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(team.totalProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Средняя успешность:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {team.avgSuccessRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Лучший исполнитель:</span>
                    <span className="text-sm font-medium text-blue-600">
                      {team.topPerformer}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Тренды по месяцам */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Динамика по месяцам</h3>
        </div>
        <div className="card-content">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Месяц
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Профит
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Сотрудники
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Средний профит на сотрудника
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData?.monthlyTrends.map((trend, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {trend.month}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(trend.profit)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {trend.employees}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(trend.profit / trend.employees)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
