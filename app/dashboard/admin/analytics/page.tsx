'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import KPICard from '@/components/ui/KPICard'
import {
    ChartBarIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    ClockIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    UserGroupIcon,
    FolderIcon,
    CalendarDaysIcon
} from '@heroicons/react/24/outline'

interface ProjectProgress {
    id: string
    title: string
    project_type: string
    project_status: string
    progress_percentage: number
    total_tasks: number
    completed_tasks: number
    overdue_tasks: number
    team_members: number
    start_date?: string
    target_date?: string
    is_delayed: boolean
}

interface DepartmentStats {
    department: string
    total_tasks: number
    completed_tasks: number
    in_progress_tasks: number
    overdue_tasks: number
    completion_rate: number
    avg_completion_time: number
}

interface MonthlyTrend {
    month: string
    completed_tasks: number
    created_tasks: number
    completion_rate: number
}

export default function AdminAnalyticsPage() {
    const { addToast } = useToast()
    const [projects, setProjects] = useState<ProjectProgress[]>([])
    const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([])
    const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([])
    const [loading, setLoading] = useState(true)
    const [timeRange, setTimeRange] = useState('3months')

    useEffect(() => {
        loadAnalytics()
    }, [timeRange])

    async function loadAnalytics() {
        try {
            setLoading(true)

            // Загружаем прогресс проектов
            const projectsResponse = await fetch(`/api/projects/reports?time_range=${timeRange}`)
            if (projectsResponse.ok) {
                const projectsData = await projectsResponse.json()
                setProjects(projectsData.projects || [])
            }

            // Загружаем статистику по департаментам
            const deptsResponse = await fetch(`/api/analytics/departments?time_range=${timeRange}`)
            if (deptsResponse.ok) {
                const deptsData = await deptsResponse.json()
                setDepartmentStats(deptsData.departments || [])
            }

            // Загружаем месячные тренды
            const trendsResponse = await fetch(`/api/analytics/trends?time_range=${timeRange}`)
            if (trendsResponse.ok) {
                const trendsData = await trendsResponse.json()
                setMonthlyTrends(trendsData.trends || [])
            }

        } catch (error: any) {
            console.error('Ошибка загрузки аналитики:', error)
            addToast({
                type: 'error',
                title: 'Ошибка загрузки данных',
                description: error.message
            })
        } finally {
            setLoading(false)
        }
    }

    // Общая статистика
    const totalProjects = projects.length
    const activeProjects = projects.filter(p => p.project_status === 'active').length
    const completedProjects = projects.filter(p => p.project_status === 'completed').length
    const delayedProjects = projects.filter(p => p.is_delayed).length

    const totalTasks = projects.reduce((sum, p) => sum + p.total_tasks, 0)
    const completedTasks = projects.reduce((sum, p) => sum + p.completed_tasks, 0)
    const overallProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

    const avgProjectProgress = projects.length > 0
        ? projects.reduce((sum, p) => sum + p.progress_percentage, 0) / projects.length
        : 0

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg text-gray-600">Загрузка аналитики...</div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">C-Level Аналитика</h1>
                    <p className="text-gray-600">CEO/CFO: агрегированные отчеты и графики прогресса</p>
                </div>
                <div>
                    <label className="form-label">Период</label>
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="form-input"
                    >
                        <option value="1month">Последний месяц</option>
                        <option value="3months">3 месяца</option>
                        <option value="6months">6 месяцев</option>
                        <option value="1year">Год</option>
                    </select>
                </div>
            </div>

            {/* C-Level информация */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <ChartBarIcon className="h-6 w-6 text-purple-500" />
                    </div>
                    <div className="ml-4">
                        <h3 className="text-lg font-medium text-purple-900">
                            C-Level Dashboard
                        </h3>
                        <div className="mt-2 text-sm text-purple-700">
                            <p>• <strong>Стратегический обзор</strong>: прогресс по всем проектам и департаментам</p>
                            <p>• <strong>Агрегированная аналитика</strong>: % выполнения, задержки, тренды</p>
                            <p>• <strong>Принятие решений</strong>: на основе данных о производительности</p>
                            <p>• <strong>OKR мониторинг</strong>: отслеживание стратегических целей</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Общая статистика */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <KPICard
                    title="Всего проектов"
                    value={totalProjects}
                    icon={<FolderIcon className="h-6 w-6" />}
                    color="primary"
                />
                <KPICard
                    title="Активные"
                    value={activeProjects}
                    icon={<ChartBarIcon className="h-6 w-6" />}
                    color="success"
                />
                <KPICard
                    title="Завершенные"
                    value={completedProjects}
                    icon={<CheckCircleIcon className="h-6 w-6" />}
                    color="success"
                />
                <KPICard
                    title="С задержками"
                    value={delayedProjects}
                    icon={<ExclamationTriangleIcon className="h-6 w-6" />}
                    color="danger"
                />
                <KPICard
                    title="Общий прогресс"
                    value={`${overallProgress.toFixed(1)}%`}
                    icon={<ArrowUpIcon className="h-6 w-6" />}
                    color="primary"
                />
                <KPICard
                    title="Средний прогресс"
                    value={`${avgProjectProgress.toFixed(1)}%`}
                    icon={<ChartBarIcon className="h-6 w-6" />}
                    color="primary"
                />
            </div>

            {/* Прогресс проектов */}
            <div className="card">
                <div className="card-header">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <FolderIcon className="h-5 w-5 mr-2" />
                        Прогресс по проектам
                    </h3>
                </div>
                <div className="p-6">
                    <div className="space-y-4">
                        {projects.map((project) => (
                            <div key={project.id} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h4 className="font-medium text-gray-900">{project.title}</h4>
                                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                                            <span className="capitalize">{project.project_type}</span>
                                            <span>{project.team_members} участников</span>
                                            <span>{project.completed_tasks}/{project.total_tasks} задач</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-lg font-bold ${project.progress_percentage >= 80 ? 'text-green-600' :
                                                project.progress_percentage >= 50 ? 'text-blue-600' :
                                                    project.progress_percentage >= 25 ? 'text-orange-600' : 'text-red-600'
                                            }`}>
                                            {project.progress_percentage.toFixed(1)}%
                                        </div>
                                        <div className={`text-xs ${project.is_delayed ? 'text-red-600' : 'text-gray-500'}`}>
                                            {project.is_delayed ? '⚠️ Задержка' : '✅ В срок'}
                                        </div>
                                    </div>
                                </div>

                                {/* Прогресс-бар */}
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className={`h-3 rounded-full transition-all duration-500 ${project.progress_percentage >= 80 ? 'bg-green-500' :
                                                project.progress_percentage >= 50 ? 'bg-blue-500' :
                                                    project.progress_percentage >= 25 ? 'bg-orange-500' : 'bg-red-500'
                                            }`}
                                        style={{ width: `${project.progress_percentage}%` }}
                                    ></div>
                                </div>

                                {/* Дополнительная информация */}
                                <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
                                    <div className="flex items-center space-x-4">
                                        {project.start_date && (
                                            <span className="flex items-center">
                                                <CalendarDaysIcon className="h-4 w-4 mr-1" />
                                                Начат: {new Date(project.start_date).toLocaleDateString('ru-RU')}
                                            </span>
                                        )}
                                        {project.target_date && (
                                            <span className="flex items-center">
                                                <ClockIcon className="h-4 w-4 mr-1" />
                                                Цель: {new Date(project.target_date).toLocaleDateString('ru-RU')}
                                            </span>
                                        )}
                                    </div>
                                    {project.overdue_tasks > 0 && (
                                        <span className="text-red-600 font-medium">
                                            {project.overdue_tasks} просроченных
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}

                        {projects.length === 0 && (
                            <div className="text-center text-gray-500 py-8">
                                <FolderIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p>Проекты не найдены</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Статистика по департаментам */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                    <div className="card-header">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            <UserGroupIcon className="h-5 w-5 mr-2" />
                            Производительность департаментов
                        </h3>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                            {departmentStats.map((dept) => (
                                <div key={dept.department} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <div className="font-medium text-gray-900 capitalize">{dept.department}</div>
                                        <div className="text-sm text-gray-600">
                                            {dept.completed_tasks}/{dept.total_tasks} задач • {dept.completion_rate.toFixed(1)}%
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-lg font-bold ${dept.completion_rate >= 80 ? 'text-green-600' :
                                                dept.completion_rate >= 60 ? 'text-blue-600' :
                                                    dept.completion_rate >= 40 ? 'text-orange-600' : 'text-red-600'
                                            }`}>
                                            {dept.completion_rate.toFixed(1)}%
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {dept.avg_completion_time.toFixed(1)}ч среднее
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {departmentStats.length === 0 && (
                                <div className="text-center text-gray-500 py-4">
                                    Нет данных по департаментам
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Месячные тренды */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            <ArrowUpIcon className="h-5 w-5 mr-2" />
                            Месячные тренды
                        </h3>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                            {monthlyTrends.map((trend, index) => {
                                const isGrowth = index === 0 || trend.completion_rate >= (monthlyTrends[index - 1]?.completion_rate || 0)

                                return (
                                    <div key={trend.month} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div>
                                            <div className="font-medium text-gray-900">{trend.month}</div>
                                            <div className="text-sm text-gray-600">
                                                {trend.completed_tasks} выполнено • {trend.created_tasks} создано
                                            </div>
                                        </div>
                                        <div className="text-right flex items-center space-x-2">
                                            <div className={`text-lg font-bold ${trend.completion_rate >= 80 ? 'text-green-600' :
                                                    trend.completion_rate >= 60 ? 'text-blue-600' :
                                                        trend.completion_rate >= 40 ? 'text-orange-600' : 'text-red-600'
                                                }`}>
                                                {trend.completion_rate.toFixed(1)}%
                                            </div>
                                            {isGrowth ? (
                                                <ArrowUpIcon className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <ArrowDownIcon className="h-4 w-4 text-red-500" />
                                            )}
                                        </div>
                                    </div>
                                )
                            })}

                            {monthlyTrends.length === 0 && (
                                <div className="text-center text-gray-500 py-4">
                                    Нет данных по трендам
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Критические проекты */}
            {delayedProjects > 0 && (
                <div className="card border-red-200">
                    <div className="card-header bg-red-50">
                        <h3 className="text-lg font-semibold text-red-900 flex items-center">
                            <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                            Проекты с задержками ({delayedProjects})
                        </h3>
                    </div>
                    <div className="p-6">
                        <div className="space-y-3">
                            {projects
                                .filter(p => p.is_delayed)
                                .map((project) => (
                                    <div key={project.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <div>
                                            <div className="font-medium text-red-900">{project.title}</div>
                                            <div className="text-sm text-red-700">
                                                {project.overdue_tasks} просроченных задач • {project.progress_percentage.toFixed(1)}% прогресс
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-red-600 font-bold">⚠️ ЗАДЕРЖКА</div>
                                            {project.target_date && (
                                                <div className="text-xs text-red-600">
                                                    Цель: {new Date(project.target_date).toLocaleDateString('ru-RU')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Coordinator список проектов */}
            <div className="card">
                <div className="card-header">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <FolderIcon className="h-5 w-5 mr-2" />
                        Coordinator: Список всех проектов
                    </h3>
                </div>
                <div className="p-6">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Проект
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Статус
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Прогресс
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Задачи
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Команда
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Дедлайн
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {projects.map((project) => (
                                    <tr key={project.id} className={project.is_delayed ? 'bg-red-50' : ''}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="font-medium text-gray-900">{project.title}</div>
                                                <div className="text-sm text-gray-500 capitalize">{project.project_type}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${project.project_status === 'completed'
                                                    ? 'bg-green-100 text-green-800'
                                                    : project.project_status === 'active'
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : project.project_status === 'planning'
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {project.project_status === 'completed' ? 'Завершен' :
                                                    project.project_status === 'active' ? 'Активный' :
                                                        project.project_status === 'planning' ? 'Планирование' : 'Приостановлен'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-3">
                                                    <div
                                                        className={`h-2 rounded-full ${project.progress_percentage >= 80 ? 'bg-green-500' :
                                                                project.progress_percentage >= 50 ? 'bg-blue-500' :
                                                                    project.progress_percentage >= 25 ? 'bg-orange-500' : 'bg-red-500'
                                                            }`}
                                                        style={{ width: `${project.progress_percentage}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-sm font-medium text-gray-900">
                                                    {project.progress_percentage.toFixed(1)}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {project.completed_tasks}/{project.total_tasks}
                                            </div>
                                            {project.overdue_tasks > 0 && (
                                                <div className="text-xs text-red-600">
                                                    {project.overdue_tasks} просроченных
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {project.team_members}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {project.target_date ? (
                                                <div className={project.is_delayed ? 'text-red-600' : ''}>
                                                    {new Date(project.target_date).toLocaleDateString('ru-RU')}
                                                </div>
                                            ) : (
                                                'Не указан'
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {projects.length === 0 && (
                            <div className="text-center text-gray-500 py-8">
                                <FolderIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p>Проекты не найдены</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
