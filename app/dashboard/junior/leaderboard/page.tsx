'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import KPICard from '@/components/ui/KPICard'
import {
    TrophyIcon,
    FireIcon,
    BanknotesIcon,
    ChartBarIcon,
    StarIcon,
    RocketLaunchIcon,
    BoltIcon,
    GiftIcon,
    SparklesIcon
} from '@heroicons/react/24/outline'

interface JuniorStats {
    id: string
    name: string
    email: string
    rank: number
    totalProfit: number
    totalWorks: number
    successfulWorks: number
    successRate: number
    avgProfitPerWork: number
    biggestWin: number
    biggestWinCasino: string
    salaryPercentage: number
    estimatedEarnings: number
    joinedDate: string
    isCurrentUser: boolean
}

interface CompanyStats {
    totalProfit: number
    totalWorks: number
    avgSuccessRate: number
    activeJuniors: number
}

interface Achievement {
    title: string
    description: string
}

interface LeaderboardData {
    leaderboard: JuniorStats[]
    companyStats: CompanyStats
    monthLeader: JuniorStats | null
    motivationalMessage: string
    achievements: Achievement[]
    currentUserRank: number | null
}

export default function JuniorLeaderboardPage() {
    const { addToast } = useToast()
    const [data, setData] = useState<LeaderboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [period, setPeriod] = useState<'current_month' | 'last_month' | 'all_time'>('current_month')

    useEffect(() => {
        loadLeaderboard()
    }, [period])

    async function loadLeaderboard() {
        try {
            setLoading(true)
            const response = await fetch(`/api/junior/leaderboard?period=${period}`)
            
            if (!response.ok) {
                throw new Error('Failed to load leaderboard')
            }

            const result = await response.json()
            setData(result)

        } catch (error: any) {
            console.error('Error loading leaderboard:', error)
            addToast({
                type: 'error',
                title: 'Ошибка загрузки',
                description: error.message
            })
        } finally {
            setLoading(false)
        }
    }

    function getRankIcon(rank: number) {
        switch (rank) {
            case 1: return <span className="text-2xl">👑</span>
            case 2: return <TrophyIcon className="h-6 w-6 text-gray-400" />
            case 3: return <TrophyIcon className="h-6 w-6 text-amber-600" />
            default: return <span className="text-lg font-bold text-gray-600">#{rank}</span>
        }
    }

    function getRankBadge(rank: number) {
        if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white'
        if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white'
        if (rank === 3) return 'bg-gradient-to-r from-amber-400 to-amber-600 text-white'
        if (rank <= 10) return 'bg-gradient-to-r from-blue-400 to-blue-600 text-white'
        return 'bg-gray-100 text-gray-700'
    }

    function getPeriodLabel(period: string) {
        switch (period) {
            case 'current_month': return 'Текущий месяц'
            case 'last_month': return 'Прошлый месяц'
            case 'all_time': return 'За все время'
            default: return period
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="loading-spinner"></div>
            </div>
        )
    }

    if (!data) {
        return (
            <div className="text-center py-12">
                <TrophyIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Данные недоступны</h3>
                <p className="text-gray-500">Попробуйте обновить страницу</p>
            </div>
        )
    }

    const currentUser = data.leaderboard.find(j => j.isCurrentUser)

    return (
        <div className="space-y-8">
            {/* Header с мотивационным сообщением */}
            <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                    <RocketLaunchIcon className="h-8 w-8 text-primary-600 mr-3" />
                    <h1 className="text-3xl font-bold text-gray-900">Рейтинг Junior</h1>
                    <FireIcon className="h-8 w-8 text-orange-500 ml-3" />
                </div>
                <div className="bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-lg p-6 mb-6">
                    <p className="text-xl font-medium text-primary-900 mb-2">{data.motivationalMessage}</p>
                    <p className="text-primary-700">Соревнуйся с коллегами и зарабатывай больше! 💪</p>
                </div>
            </div>

            {/* Фильтр периода */}
            <div className="flex justify-center">
                <div className="bg-white rounded-lg border border-gray-200 p-1 flex">
                    {[
                        { value: 'current_month', label: 'Текущий месяц' },
                        { value: 'last_month', label: 'Прошлый месяц' },
                        { value: 'all_time', label: 'За все время' }
                    ].map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setPeriod(option.value as any)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                period === option.value
                                    ? 'bg-primary-600 text-white'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Общая статистика компании */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <KPICard
                    title="Общий профит компании"
                    value={`$${data.companyStats.totalProfit.toLocaleString()}`}
                    icon={<BanknotesIcon className="h-6 w-6" />}
                    color="success"
                />
                <KPICard
                    title="Всего работ"
                    value={data.companyStats.totalWorks.toLocaleString()}
                    icon={<ChartBarIcon className="h-6 w-6" />}
                    color="primary"
                />
                <KPICard
                    title="Средняя успешность"
                    value={`${data.companyStats.avgSuccessRate}%`}
                    icon={<StarIcon className="h-6 w-6" />}
                    color="warning"
                />
                <KPICard
                    title="Активных Junior"
                    value={data.companyStats.activeJuniors}
                    icon={<FireIcon className="h-6 w-6" />}
                    color="danger"
                />
            </div>

            {/* Лидер месяца */}
            {data.monthLeader && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-6">
                    <div className="text-center">
                        <div className="text-6xl mb-4">👑</div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">🏆 Лидер {getPeriodLabel(period).toLowerCase()}</h2>
                        <div className="text-3xl font-bold text-yellow-600 mb-2">{data.monthLeader.name}</div>
                        <div className="text-xl text-gray-700 mb-4">
                            Профит: <span className="font-bold text-green-600">${data.monthLeader.totalProfit.toLocaleString()}</span>
                        </div>
                        {data.monthLeader.biggestWin > 0 && (
                            <div className="text-lg text-gray-600">
                                💎 Самый большой выигрыш: <span className="font-bold">${data.monthLeader.biggestWin.toLocaleString()}</span>
                                <br />
                                <span className="text-sm">в казино {data.monthLeader.biggestWinCasino}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Достижения текущего пользователя */}
            {data.achievements.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                    <div className="flex items-center mb-4">
                        <SparklesIcon className="h-6 w-6 text-purple-600 mr-2" />
                        <h3 className="text-lg font-semibold text-purple-900">Ваши достижения</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {data.achievements.map((achievement, index) => (
                            <div key={index} className="bg-white rounded-lg p-4 border border-purple-100">
                                <div className="font-medium text-purple-900">{achievement.title}</div>
                                <div className="text-sm text-purple-700">{achievement.description}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Ваша позиция */}
            {currentUser && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-blue-900 mb-2">Ваша позиция в рейтинге</h3>
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center">
                                    {getRankIcon(currentUser.rank)}
                                    <span className="ml-2 text-2xl font-bold text-blue-900">#{currentUser.rank}</span>
                                </div>
                                <div className="text-blue-700">
                                    <div>Профит: <span className="font-bold">${currentUser.totalProfit.toLocaleString()}</span></div>
                                    <div>Успешность: <span className="font-bold">{currentUser.successRate}%</span></div>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-blue-600 mb-1">Ожидаемая зарплата</div>
                            <div className="text-2xl font-bold text-green-600">${currentUser.estimatedEarnings.toLocaleString()}</div>
                            <div className="text-xs text-blue-500">({currentUser.salaryPercentage}% от профита)</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Таблица лидеров */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                        🏆 Рейтинг за {getPeriodLabel(period).toLowerCase()}
                    </h3>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Место
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Junior
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Профит
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Работы
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Успешность
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Средний профит
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Зарплата
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {data.leaderboard.map((junior) => (
                                <tr 
                                    key={junior.id} 
                                    className={`${junior.isCurrentUser ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'}`}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRankBadge(junior.rank)}`}>
                                            {junior.rank <= 3 ? getRankIcon(junior.rank) : `#${junior.rank}`}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {junior.name}
                                                    {junior.isCurrentUser && (
                                                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                                            Это вы
                                                        </span>
                                                    )}
                                                </div>
                                                {junior.biggestWin > 0 && (
                                                    <div className="text-xs text-gray-500">
                                                        💎 Лучший: ${junior.biggestWin.toLocaleString()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="text-sm font-bold text-green-600">
                                            ${junior.totalProfit.toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="text-sm text-gray-900">
                                            {junior.successfulWorks}/{junior.totalWorks}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className={`text-sm font-medium ${
                                            junior.successRate >= 80 ? 'text-green-600' :
                                            junior.successRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                                        }`}>
                                            {junior.successRate}%
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="text-sm text-gray-900">
                                            ${junior.avgProfitPerWork.toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="text-sm font-bold text-blue-600">
                                            ${junior.estimatedEarnings.toLocaleString()}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {junior.salaryPercentage}%
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Мотивационные советы */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-start">
                    <BoltIcon className="h-6 w-6 text-green-500 mt-1 mr-3" />
                    <div>
                        <h3 className="text-lg font-semibold text-green-900 mb-3">💡 Как подняться в рейтинге?</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-800">
                            <div>
                                <div className="font-medium mb-1">🎯 Повышай успешность:</div>
                                <div>• Тщательно изучай мануалы казино</div>
                                <div>• Следуй инструкциям TeamLead'а</div>
                                <div>• Не торопись с выводами</div>
                            </div>
                            <div>
                                <div className="font-medium mb-1">💰 Увеличивай профит:</div>
                                <div>• Работай с проверенными казино</div>
                                <div>• Оптимизируй размеры депозитов</div>
                                <div>• Изучай стратегии коллег</div>
                            </div>
                            <div>
                                <div className="font-medium mb-1">🚀 Будь активным:</div>
                                <div>• Выполняй больше работ</div>
                                <div>• Участвуй в обсуждениях</div>
                                <div>• Делись опытом с командой</div>
                            </div>
                            <div>
                                <div className="font-medium mb-1">🏆 Стремись к лидерству:</div>
                                <div>• Ставь месячные цели</div>
                                <div>• Анализируй свои результаты</div>
                                <div>• Учись у лидеров рейтинга</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
