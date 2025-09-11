'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import StatusBadge from '@/components/ui/StatusBadge'
import {
    CreditCardIcon,
    UserIcon,
    CheckCircleIcon,
    BanknotesIcon,
    EyeIcon,
    EyeSlashIcon
} from '@heroicons/react/24/outline'

interface PayPalAccount {
    id: string
    name: string
    email: string
    phone_number?: string
    authenticator_url?: string
    date_created: string
    balance: number
    sender_paypal_email?: string
    balance_send: number
    send_paypal_balance?: string
    info?: string
    status: 'active' | 'blocked' | 'suspended'
    created_at: string
    user: {
        id: string
        email: string
        first_name?: string
        last_name?: string
        role: string
    }
}

export default function TeamLeadPayPalPage() {
    const { addToast } = useToast()
    const [accounts, setAccounts] = useState<PayPalAccount[]>([])
    const [loading, setLoading] = useState(true)
    const [revealedPasswords, setRevealedPasswords] = useState<Set<string>>(new Set())

    useEffect(() => {
        loadPayPalAccounts()
    }, [])

    async function loadPayPalAccounts() {
        try {
            setLoading(true)
            const response = await fetch('/api/paypal/accounts')

            if (!response.ok) {
                throw new Error('Ошибка загрузки PayPal аккаунтов')
            }

            const data = await response.json()
            setAccounts(data.accounts || [])

        } catch (error: any) {
            console.error('Ошибка загрузки PayPal аккаунтов:', error)
            addToast({
                type: 'error',
                title: 'Ошибка загрузки данных',
                description: error.message
            })
        } finally {
            setLoading(false)
        }
    }

    function togglePasswordReveal(accountId: string) {
        setRevealedPasswords(prev => {
            const newSet = new Set(prev)
            if (newSet.has(accountId)) {
                newSet.delete(accountId)
            } else {
                newSet.add(accountId)
            }
            return newSet
        })
    }

    const columns: Column<PayPalAccount>[] = [
        {
            key: 'name',
            label: 'Имя аккаунта',
            render: (account) => (
                <div>
                    <div className="font-medium text-gray-900">{account.name}</div>
                    <div className="text-sm text-gray-500">{account.email}</div>
                </div>
            )
        },
        {
            key: 'user',
            label: 'Junior',
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
            key: 'phone_number',
            label: 'Телефон',
            render: (account) => (
                <span className="text-sm text-gray-600">
                    {account.phone_number || 'Не указан'}
                </span>
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
            key: 'sender_paypal_email',
            label: 'Отправитель',
            render: (account) => (
                <span className="text-sm text-gray-600">
                    {account.sender_paypal_email || 'Не указан'}
                </span>
            )
        },
        {
            key: 'status',
            label: 'Статус',
            render: (account) => (
                <StatusBadge status={account.status} />
            )
        },
        {
            key: 'date_created',
            label: 'Создан',
            render: (account) => (
                <span className="text-sm text-gray-500">
                    {new Date(account.date_created).toLocaleDateString('ru-RU')}
                </span>
            )
        },
        {
            key: 'authenticator_url',
            label: 'Аутентификатор',
            render: (account) => {
                const isRevealed = revealedPasswords.has(account.id)
                return (
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">
                            {account.authenticator_url ? (
                                isRevealed ? (
                                    <a
                                        href={account.authenticator_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800"
                                    >
                                        Открыть ссылку
                                    </a>
                                ) : (
                                    '***скрыто***'
                                )
                            ) : (
                                'Не указан'
                            )}
                        </span>
                        {account.authenticator_url && (
                            <button
                                onClick={() => togglePasswordReveal(account.id)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                {isRevealed ? (
                                    <EyeSlashIcon className="h-4 w-4" />
                                ) : (
                                    <EyeIcon className="h-4 w-4" />
                                )}
                            </button>
                        )}
                    </div>
                )
            }
        }
    ]

    // Статистика
    const activeAccounts = accounts.filter(acc => acc.status === 'active')
    const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)
    const uniqueJuniors = new Set(accounts.map(acc => acc.user.id)).size

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">PayPal аккаунты команды</h1>
                    <p className="text-gray-600">PayPal аккаунты ваших Junior'ов</p>
                </div>
            </div>

            {/* Информация о PayPal */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <CreditCardIcon className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">
                            PayPal аккаунты команды
                        </h3>
                        <div className="mt-2 text-sm text-blue-700">
                            <p>• Здесь отображаются PayPal аккаунты ваших Junior'ов</p>
                            <p>• Все PayPal аккаунты используются для работы с казино BEP20</p>
                            <p>• Вы можете видеть балансы и статусы аккаунтов</p>
                            <p>• Конфиденциальные данные скрыты по умолчанию</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Статистика */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KPICard
                    title="Всего аккаунтов"
                    value={accounts.length}
                    icon={<CreditCardIcon className="h-6 w-6" />}
                    color="primary"
                />
                <KPICard
                    title="Активных"
                    value={activeAccounts.length}
                    icon={<CheckCircleIcon className="h-6 w-6" />}
                    color="success"
                />
                <KPICard
                    title="Junior'ов"
                    value={uniqueJuniors}
                    icon={<UserIcon className="h-6 w-6" />}
                    color="warning"
                />
                <KPICard
                    title="Общий баланс"
                    value={`$${totalBalance.toFixed(2)}`}
                    icon={<BanknotesIcon className="h-6 w-6" />}
                    color="success"
                />
            </div>

            {/* Таблица аккаунтов */}
            <div className="card">
                <div className="card-header">
                    <h3 className="text-lg font-semibold text-gray-900">PayPal аккаунты</h3>
                </div>

                <DataTable
                    data={accounts}
                    columns={columns}
                    loading={loading}
                    pagination={{ pageSize: 20 }}
                    filtering={true}
                    exportable={true}
                    emptyMessage="PayPal аккаунты не найдены"
                />
            </div>
        </div>
    )
}
