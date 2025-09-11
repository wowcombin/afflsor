'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import {
    CreditCardIcon,
    UserIcon,
    CheckCircleIcon,
    BanknotesIcon,
    ChartBarIcon,
    ArrowUpIcon,
    ArrowDownIcon
} from '@heroicons/react/24/outline'

interface PayPalReport {
    period: string
    summary: {
        total_accounts: number
        active_accounts: number
        total_balance: number
        total_send_balance: number
        total_works: number
        completed_works: number
        total_deposits: number
        total_withdrawals: number
        total_profit: number
        profit_margin: number
    }
    user_stats: Array<{
        user: {
            id: string
            email: string
            first_name?: string
            last_name?: string
            role: string
        }
        works_count: number
        total_deposits: number
        total_withdrawals: number
        profit: number
        accounts_count: number
    }>
    account_reports: Array<{
        id: string
        name: string
        email: string
        status: string
        balance: number
        balance_send: number
        works_count: number
        total_deposits: number
        total_withdrawals: number
        profit: number
        efficiency: number
        user: {
            email: string
            first_name?: string
            last_name?: string
        }
    }>
}

export default function ManagerPayPalReportsPage() {
    const { addToast } = useToast()
    const [report, setReport] = useState<PayPalReport | null>(null)
    const [loading, setLoading] = useState(true)
    const [period, setPeriod] = useState('current_month')
    const [activeTab, setActiveTab] = useState<'summary' | 'users' | 'accounts'>('summary')

    useEffect(() => {
        loadPayPalReport()
    }, [period])

    async function loadPayPalReport() {
        try {
            setLoading(true)
            const response = await fetch(`/api/paypal/reports?period=${period}`)

            if (!response.ok) {
                throw new Error('Ошибка загрузки PayPal отчета')
            }

            const data = await response.json()
            setReport(data)

        } catch (error: any) {
            console.error('Ошибка загрузки PayPal отчета:', error)
            addToast({
                type: 'error',
                title: 'Ошибка загрузки данных',
                description: error.message
            })
        } finally {
            setLoading(false)
        }
    }

    const userColumns: Column<any>[] = [
        {
            key: 'user',
            label: 'Сотрудник',
            render: (stat) => (
                <div>
                    <div className="font-medium text-gray-900">
                        {`${stat.user.first_name || ''} ${stat.user.last_name || ''}`.trim() || stat.user.email}
                    </div>
                    <div className="text-sm text-gray-500">{stat.user.email}</div>
                    <div className="text-xs text-blue-600 capitalize">{stat.user.role}</div>
                </div>
            )
        },
        {
            key: 'accounts_count',
            label: 'Аккаунтов',
            render: (stat) => (
                <span className="text-sm font-medium text-gray-900">{stat.accounts_count}</span>
            )
        },
        {
            key: 'works_count',
            label: 'Работ',
            render: (stat) => (
                <span className="text-sm font-medium text-gray-900">{stat.works_count}</span>
            )
        },
        {
            key: 'total_deposits',
            label: 'Депозиты',
            render: (stat) => (
                <span className="text-sm font-medium text-orange-600">
                    ${stat.total_deposits.toFixed(2)}
                </span>
            )
        },
        {
            key: 'total_withdrawals',
            label: 'Выводы',
            render: (stat) => (
                <span className="text-sm font-medium text-green-600">
                    ${stat.total_withdrawals.toFixed(2)}
                </span>
            )
        },
        {
            key: 'profit',
            label: 'Прибыль',
            render: (stat) => (
                <div className="text-right">
                    <span className={`text-sm font-bold ${stat.profit >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                        ${stat.profit.toFixed(2)}
                    </span>
                </div>
            )
        }
    ]

    const accountColumns: Column<any>[] = [
        {
            key: 'name',
            label: 'PayPal аккаунт',
            render: (account) => (
                <div>
                    <div className="font-medium text-gray-900">{account.name}</div>
                    <div className="text-sm text-gray-500">{account.email}</div>
                </div>
            )
        },
        {
            key: 'user',
            label: 'Владелец',
            render: (account) => (
                <div>
                    <div className="font-medium text-gray-900">
                        {`${account.user.first_name || ''} ${account.user.last_name || ''}`.trim() || account.user.email}
                    </div>
                    <div className="text-sm text-gray-500">{account.user.email}</div>
                </div>
            )
        },
        {
            key: 'balance',
            label: 'Баланс',
            render: (account) => (
                <div className="text-right">
                    <div className="font-bold text-green-600">
                        ${account.balance?.toFixed(2) || '0.00'}
                    </div>
                    {account.balance_send > 0 && (
                        <div className="text-sm text-blue-600">
                            Отправка: ${account.balance_send.toFixed(2)}
                        </div>
                    )}
                </div>
            )
        },
        {
            key: 'works_count',
            label: 'Работ',
            render: (account) => (
                <span className="text-sm font-medium text-gray-900">{account.works_count}</span>
            )
        },
        {
            key: 'efficiency',
            label: 'Эффективность',
            render: (account) => (
                <div className="text-right">
                    <span className={`text-sm font-bold ${account.efficiency >= 100 ? 'text-green-600' :
                            account.efficiency >= 50 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                        {account.efficiency.toFixed(1)}%
                    </span>
                </div>
            )
        },
        {
            key: 'profit',
            label: 'Прибыль',
            render: (account) => (
                <div className="text-right">
                    <span className={`text-sm font-bold ${account.profit >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                        ${account.profit.toFixed(2)}
                    </span>
                </div>
            )
        }
    ]

    if (!report) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
                    <p className="mt-4 text-gray-600">Загрузка отчета...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">PayPal отчеты</h1>
                    <p className="text-gray-600">Отчеты по PayPal аккаунтам как по отдельному банку</p>
                </div>
                <div>
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="form-input"
                    >
                        <option value="current_month">Текущий месяц</option>
                        <option value="last_month">Прошлый месяц</option>
                        <option value="custom">Произвольный период</option>
                    </select>
                </div>
            </div>

            {/* Общая статистика */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <KPICard
                    title="PayPal аккаунтов"
                    value={report.summary.total_accounts}
                    icon={<CreditCardIcon className="h-6 w-6" />}
                    color="primary"
                />
                <KPICard
                    title="Активных"
                    value={report.summary.active_accounts}
                    icon={<CheckCircleIcon className="h-6 w-6" />}
                    color="success"
                />
                <KPICard
                    title="Всего работ"
                    value={report.summary.total_works}
                    icon={<ChartBarIcon className="h-6 w-6" />}
                    color="warning"
                />
                <KPICard
                    title="Депозиты"
                    value={`$${report.summary.total_deposits.toFixed(2)}`}
                    icon={<ArrowDownIcon className="h-6 w-6" />}
                    color="danger"
                />
                <KPICard
                    title="Выводы"
                    value={`$${report.summary.total_withdrawals.toFixed(2)}`}
                    icon={<ArrowUpIcon className="h-6 w-6" />}
                    color="success"
                />
                <KPICard
                    title="Прибыль"
                    value={`$${report.summary.total_profit.toFixed(2)}`}
                    icon={<BanknotesIcon className="h-6 w-6" />}
                    color={report.summary.total_profit >= 0 ? "success" : "danger"}
                />
            </div>

            {/* Дополнительная статистика */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card">
                    <div className="card-header">
                        <h3 className="text-lg font-semibold text-gray-900">Маржинальность</h3>
                    </div>
                    <div className="p-6 text-center">
                        <div className={`text-3xl font-bold ${report.summary.profit_margin >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {report.summary.profit_margin.toFixed(1)}%
                        </div>
                        <p className="text-sm text-gray-500 mt-2">Прибыль от депозитов</p>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="text-lg font-semibold text-gray-900">Общие балансы</h3>
                    </div>
                    <div className="p-6">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Основной баланс:</span>
                                <span className="font-bold text-green-600">${report.summary.total_balance.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Баланс отправки:</span>
                                <span className="font-bold text-blue-600">${report.summary.total_send_balance.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="text-lg font-semibold text-gray-900">Эффективность</h3>
                    </div>
                    <div className="p-6 text-center">
                        <div className="text-3xl font-bold text-blue-600">
                            {report.summary.completed_works}/{report.summary.total_works}
                        </div>
                        <p className="text-sm text-gray-500 mt-2">Завершенных работ</p>
                    </div>
                </div>
            </div>

            {/* Вкладки */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('summary')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'summary'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Общая статистика
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'users'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        По сотрудникам ({report.user_stats.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('accounts')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'accounts'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        По аккаунтам ({report.account_reports.length})
                    </button>
                </nav>
            </div>

            {/* Содержимое вкладок */}
            {activeTab === 'summary' && (
                <div className="card">
                    <div className="card-header">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Сводка по PayPal как банку
                        </h3>
                    </div>
                    <div className="p-6">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="font-medium text-blue-800 mb-2">PayPal как отдельный банк</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
                                <div>
                                    <p>• Всего аккаунтов: {report.summary.total_accounts}</p>
                                    <p>• Активных аккаунтов: {report.summary.active_accounts}</p>
                                    <p>• Работ создано: {report.summary.total_works}</p>
                                    <p>• Работ завершено: {report.summary.completed_works}</p>
                                </div>
                                <div>
                                    <p>• Общий баланс: ${report.summary.total_balance.toFixed(2)}</p>
                                    <p>• Депозиты: ${report.summary.total_deposits.toFixed(2)}</p>
                                    <p>• Выводы: ${report.summary.total_withdrawals.toFixed(2)}</p>
                                    <p>• Прибыль: ${report.summary.total_profit.toFixed(2)} ({report.summary.profit_margin.toFixed(1)}%)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
                <div className="card">
                    <div className="card-header">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Статистика по сотрудникам
                        </h3>
                    </div>

                    <DataTable
                        data={report.user_stats}
                        columns={userColumns}
                        loading={loading}
                        pagination={{ pageSize: 20 }}
                        filtering={true}
                        exportable={true}
                        emptyMessage="Статистика по сотрудникам не найдена"
                    />
                </div>
            )}

            {activeTab === 'accounts' && (
                <div className="card">
                    <div className="card-header">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Отчет по PayPal аккаунтам
                        </h3>
                    </div>

                    <DataTable
                        data={report.account_reports}
                        columns={accountColumns}
                        loading={loading}
                        pagination={{ pageSize: 20 }}
                        filtering={true}
                        exportable={true}
                        emptyMessage="Отчеты по аккаунтам не найдены"
                    />
                </div>
            )}
        </div>
    )
}
