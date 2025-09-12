'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column, ActionButton } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import Modal from '@/components/ui/Modal'
import {
    CreditCardIcon,
    BanknotesIcon,
    PlusIcon,
    EyeIcon,
    EyeSlashIcon,
    CheckCircleIcon,
    XCircleIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon,
    ClockIcon
} from '@heroicons/react/24/outline'

interface Card {
    id: string
    card_number_mask: string
    card_bin: string
    card_type: string
    status: string
    account_balance: number
    account_currency: string
    bank_account: {
        id: string
        holder_name: string
        currency: string
        bank: {
            name: string
            country: string
        } | null
    }
    casino_assignments: Array<{
        assignment_id: string
        casino_id: string
        casino_name: string
        status: string
        has_deposit: boolean
    }>
}

interface PayPalAccount {
    id: string
    name: string
    email: string
    password: string
    phone_number: string
    authenticator_url: string
    date_created: string
    balance: number
    sender_paypal_email?: string
    balance_send?: number
    send_paypal_balance?: string
    info?: string
    status: 'active' | 'blocked' | 'suspended'
    created_at: string
    updated_at: string
}

interface PaymentMethodsStats {
    totalCards: number
    activeCards: number
    blockedCards: number
    totalCardBalance: number
    totalPayPalAccounts: number
    activePayPalAccounts: number
    payPalWithBalance: number
    totalPayPalBalance: number
}

export default function PaymentMethodsPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { addToast } = useToast()

    // Данные
    const [cards, setCards] = useState<Card[]>([])
    const [paypalAccounts, setPaypalAccounts] = useState<PayPalAccount[]>([])
    const [stats, setStats] = useState<PaymentMethodsStats>({
        totalCards: 0,
        activeCards: 0,
        blockedCards: 0,
        totalCardBalance: 0,
        totalPayPalAccounts: 0,
        activePayPalAccounts: 0,
        payPalWithBalance: 0,
        totalPayPalBalance: 0
    })

    // Состояние
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'cards' | 'paypal' | 'history'>('cards')
    const [showSensitiveData, setShowSensitiveData] = useState<{ [key: string]: boolean }>({})
    const [showCreatePayPalModal, setShowCreatePayPalModal] = useState(false)
    const [creating, setCreating] = useState(false)

    // Форма нового PayPal аккаунта
    const [newPayPalForm, setNewPayPalForm] = useState({
        name: '',
        email: '',
        password: '',
        phone_number: '',
        authenticator_url: '',
        date_created: new Date().toISOString().split('T')[0],
        balance: 0,
        currency: 'GBP', // По умолчанию фунты
        sender_paypal_email: '',
        balance_send: 0,
        send_paypal_balance: '',
        info: ''
    })

    useEffect(() => {
        loadPaymentMethods()

        // Проверяем параметр tab из URL
        const tabParam = searchParams.get('tab')
        if (tabParam && ['cards', 'paypal', 'history'].includes(tabParam)) {
            setActiveTab(tabParam as 'cards' | 'paypal' | 'history')
        }
    }, [searchParams])

    async function loadPaymentMethods() {
        try {
            setLoading(true)

            // Загружаем карты и PayPal параллельно
            const [cardsResponse, paypalResponse] = await Promise.all([
                fetch('/api/cards'),
                fetch('/api/junior/paypal')
            ])

            // Обрабатываем карты
            if (cardsResponse.ok) {
                const { cards: cardsData } = await cardsResponse.json()
                setCards(cardsData)
            }

            // Обрабатываем PayPal
            if (paypalResponse.ok) {
                const { accounts: paypalData } = await paypalResponse.json()
                setPaypalAccounts(paypalData)
            }

        } catch (error: any) {
            console.error('Ошибка загрузки платежных средств:', error)
            addToast({
                type: 'error',
                title: 'Ошибка загрузки данных',
                description: error.message
            })
        } finally {
            setLoading(false)
        }
    }

    // Пересчет статистики при изменении данных
    useEffect(() => {
        const totalCards = cards.length
        const activeCards = cards.filter(c => c.status === 'active').length
        const blockedCards = cards.filter(c => c.status === 'blocked').length
        const totalCardBalance = cards.reduce((sum, c) => sum + (c.account_balance || 0), 0)

        const totalPayPalAccounts = paypalAccounts.length
        const activePayPalAccounts = paypalAccounts.filter(p => p.status === 'active').length
        const payPalWithBalance = paypalAccounts.filter(p => p.balance > 0).length
        const totalPayPalBalance = paypalAccounts.reduce((sum, p) => sum + (p.balance || 0), 0)

        setStats({
            totalCards,
            activeCards,
            blockedCards,
            totalCardBalance,
            totalPayPalAccounts,
            activePayPalAccounts,
            payPalWithBalance,
            totalPayPalBalance
        })
    }, [cards, paypalAccounts])

    async function handleCreatePayPal() {
        if (!newPayPalForm.name || !newPayPalForm.email || !newPayPalForm.password) {
            addToast({ type: 'error', title: 'Заполните обязательные поля' })
            return
        }

        setCreating(true)

        try {
            const response = await fetch('/api/junior/paypal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPayPalForm)
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error)
            }

            addToast({
                type: 'success',
                title: 'PayPal аккаунт создан',
                description: `${newPayPalForm.name} успешно добавлен`
            })

            setShowCreatePayPalModal(false)
            setNewPayPalForm({
                name: '',
                email: '',
                password: '',
                phone_number: '',
                authenticator_url: '',
                date_created: new Date().toISOString().split('T')[0],
                balance: 0,
                currency: 'GBP',
                sender_paypal_email: '',
                balance_send: 0,
                send_paypal_balance: '',
                info: ''
            })

            await loadPaymentMethods()

        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Ошибка создания аккаунта',
                description: error.message
            })
        } finally {
            setCreating(false)
        }
    }

    function toggleSensitiveData(id: string) {
        setShowSensitiveData(prev => ({
            ...prev,
            [id]: !prev[id]
        }))
    }

    function maskEmail(email: string) {
        if (!email) return 'Не указан'
        const [name, domain] = email.split('@')
        return `${name.substring(0, 3)}***@${domain}`
    }

    function maskPassword(password: string) {
        if (!password) return 'Не указан'
        return '*'.repeat(password.length)
    }

    // Сортировка PayPal аккаунтов по балансу
    const activePayPalAccounts = paypalAccounts
        .filter(p => p.status === 'active' && p.balance > 0)
        .sort((a, b) => b.balance - a.balance)

    const emptyPayPalAccounts = paypalAccounts
        .filter(p => p.status === 'active' && p.balance <= 0)
        .sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime())

    const blockedPayPalAccounts = paypalAccounts
        .filter(p => p.status !== 'active')

    // Колонки для таблицы карт
    const cardColumns: Column<Card>[] = [
        {
            key: 'card_info',
            label: 'Карта',
            render: (card) => (
                <div>
                    <div className="font-medium text-gray-900">{card.card_number_mask}</div>
                    <div className="text-sm text-gray-500">{card.bank_account.holder_name}</div>
                    <div className="flex items-center space-x-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${card.card_type === 'pink' ? 'bg-pink-100 text-pink-800' :
                            card.card_type === 'grey' ? 'bg-gray-100 text-gray-800' :
                                'bg-blue-100 text-blue-800'
                            }`}>
                            {card.card_type}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${card.status === 'active' ? 'bg-green-100 text-green-800' :
                            card.status === 'blocked' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                            }`}>
                            {card.status === 'active' ? 'Активна' :
                                card.status === 'blocked' ? 'Заблокирована' : 'Неактивна'}
                        </span>
                    </div>
                </div>
            )
        },
        {
            key: 'balance',
            label: 'Баланс',
            sortable: true,
            align: 'right',
            render: (card) => (
                <div className="text-right">
                    <div className="font-bold text-gray-900">
                        {card.account_currency} ${(card.account_balance || 0).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                        {card.bank_account.bank?.name || 'Неизвестный банк'}
                    </div>
                </div>
            )
        },
        {
            key: 'assignments',
            label: 'Назначения',
            render: (card) => (
                <div>
                    {card.casino_assignments.length > 0 ? (
                        <div className="space-y-1">
                            {card.casino_assignments.slice(0, 2).map((assignment, index) => (
                                <div key={index} className="text-xs">
                                    <span className="text-blue-600">{assignment.casino_name}</span>
                                    {assignment.has_deposit && (
                                        <span className="ml-1 text-green-600">💰</span>
                                    )}
                                </div>
                            ))}
                            {card.casino_assignments.length > 2 && (
                                <div className="text-xs text-gray-500">
                                    +{card.casino_assignments.length - 2} еще
                                </div>
                            )}
                        </div>
                    ) : (
                        <span className="text-xs text-gray-400">Не назначена</span>
                    )}
                </div>
            )
        }
    ]

    // Колонки для таблицы PayPal
    const paypalColumns: Column<PayPalAccount>[] = [
        {
            key: 'account_info',
            label: 'Аккаунт',
            render: (paypal) => (
                <div>
                    <div className="font-medium text-gray-900">{paypal.name}</div>
                    <div className="text-sm text-gray-500">
                        {showSensitiveData[paypal.id] ? paypal.email : maskEmail(paypal.email)}
                    </div>
                    <div className="text-xs text-gray-400">
                        Создан: {new Date(paypal.date_created).toLocaleDateString('ru-RU')}
                    </div>
                </div>
            )
        },
        {
            key: 'balance',
            label: 'Баланс',
            sortable: true,
            align: 'right',
            render: (paypal) => (
                <div className="text-right">
                    <div className={`font-bold ${paypal.balance > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                        ${paypal.balance.toFixed(2)}
                    </div>
                    {paypal.balance_send && paypal.balance_send > 0 && (
                        <div className="text-xs text-blue-600">
                            Отправка: ${paypal.balance_send.toFixed(2)}
                        </div>
                    )}
                    {paypal.balance <= 0 && (
                        <div className="text-xs text-orange-500">Требует пополнения</div>
                    )}
                </div>
            )
        },
        {
            key: 'credentials',
            label: 'Данные',
            render: (paypal) => (
                <div className="space-y-1">
                    <div className="text-xs">
                        <span className="font-medium">Пароль: </span>
                        {showSensitiveData[paypal.id] ? paypal.password : maskPassword(paypal.password)}
                    </div>
                    {paypal.phone_number && (
                        <div className="text-xs">
                            <span className="font-medium">Телефон: </span>
                            {paypal.phone_number}
                        </div>
                    )}
                </div>
            )
        },
        {
            key: 'actions',
            label: 'Действия',
            render: (paypal) => (
                <button
                    onClick={() => toggleSensitiveData(paypal.id)}
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
                >
                    {showSensitiveData[paypal.id] ? (
                        <>
                            <EyeSlashIcon className="h-4 w-4 mr-1" />
                            Скрыть
                        </>
                    ) : (
                        <>
                            <EyeIcon className="h-4 w-4 mr-1" />
                            Показать
                        </>
                    )}
                </button>
            )
        }
    ]

    const cardActions: ActionButton<Card>[] = [
        {
            label: 'Создать работу',
            action: (card) => router.push(`/dashboard/junior/work/new?card_id=${card.id}`),
            variant: 'primary',
            condition: (card) => card.status === 'active'
        }
    ]

    const paypalActions: ActionButton<PayPalAccount>[] = [
        {
            label: 'Создать работу',
            action: (paypal) => router.push(`/dashboard/junior/work/new?paypal_id=${paypal.id}`),
            variant: 'primary',
            condition: (paypal) => paypal.status === 'active'
        }
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Платежные средства</h1>
                    <p className="text-gray-600">Управление картами и PayPal аккаунтами для работы</p>
                </div>
                <button
                    onClick={() => setShowCreatePayPalModal(true)}
                    className="btn-primary"
                >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Добавить PayPal
                </button>
            </div>

            {/* Информация о месячных циклах */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <ClockIcon className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">
                            Система месячных циклов
                        </h3>
                        <div className="mt-2 text-sm text-blue-700">
                            <p>• 🔄 <strong>Активные средства</strong> - используются в текущем месяце</p>
                            <p>• 📊 <strong>С балансом</strong> - готовы к работе, сортированы по убыванию</p>
                            <p>• ⚠️ <strong>Пустые</strong> - требуют пополнения для новых работ</p>
                            <p>• 📚 <strong>История</strong> - заблокированные/неактивные за прошлые месяцы</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Статистика */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KPICard
                    title="Активные карты"
                    value={stats.activeCards}
                    icon={<CreditCardIcon className="h-6 w-6" />}
                    color="primary"
                />
                <KPICard
                    title="PayPal с балансом"
                    value={stats.payPalWithBalance}
                    icon={<BanknotesIcon className="h-6 w-6" />}
                    color="success"
                />
                <KPICard
                    title="Общий баланс карт"
                    value={`$${stats.totalCardBalance.toFixed(2)}`}
                    icon={<CheckCircleIcon className="h-6 w-6" />}
                    color="success"
                />
                <KPICard
                    title="Общий баланс PayPal"
                    value={`$${stats.totalPayPalBalance.toFixed(2)}`}
                    icon={<BanknotesIcon className="h-6 w-6" />}
                    color="success"
                />
            </div>

            {/* Табы */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('cards')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'cards'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <CreditCardIcon className="h-5 w-5 inline mr-2" />
                        Банковские карты ({stats.activeCards})
                    </button>
                    <button
                        onClick={() => setActiveTab('paypal')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'paypal'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <BanknotesIcon className="h-5 w-5 inline mr-2" />
                        PayPal аккаунты ({stats.activePayPalAccounts})
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'history'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <ArrowPathIcon className="h-5 w-5 inline mr-2" />
                        История ({stats.blockedCards + blockedPayPalAccounts.length})
                    </button>
                </nav>
            </div>

            {/* Контент табов */}
            {activeTab === 'cards' && (
                <div className="card">
                    <div className="card-header">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Банковские карты ({cards.filter(c => c.status === 'active').length})
                        </h3>
                    </div>

                    <DataTable
                        data={cards.filter(c => c.status === 'active')}
                        columns={cardColumns}
                        actions={cardActions}
                        loading={loading}
                        pagination={{ pageSize: 10 }}
                        filtering={true}
                        exportable={true}
                        emptyMessage="Активные карты не найдены"
                    />
                </div>
            )}

            {activeTab === 'paypal' && (
                <div className="space-y-6">
                    {/* PayPal с балансом */}
                    {activePayPalAccounts.length > 0 && (
                        <div className="card">
                            <div className="card-header">
                                <h3 className="text-lg font-semibold text-green-900">
                                    💰 PayPal с балансом ({activePayPalAccounts.length})
                                </h3>
                                <p className="text-sm text-green-600">Готовы к работе, сортированы по убыванию баланса</p>
                            </div>

                            <DataTable
                                data={activePayPalAccounts}
                                columns={paypalColumns}
                                actions={paypalActions}
                                loading={loading}
                                pagination={{ pageSize: 10 }}
                                filtering={true}
                                exportable={true}
                                emptyMessage="PayPal аккаунты с балансом не найдены"
                            />
                        </div>
                    )}

                    {/* PayPal без баланса */}
                    {emptyPayPalAccounts.length > 0 && (
                        <div className="card">
                            <div className="card-header">
                                <h3 className="text-lg font-semibold text-orange-900">
                                    ⚠️ PayPal без баланса ({emptyPayPalAccounts.length})
                                </h3>
                                <p className="text-sm text-orange-600">Требуют пополнения для использования</p>
                            </div>

                            <DataTable
                                data={emptyPayPalAccounts}
                                columns={paypalColumns}
                                actions={paypalActions}
                                loading={loading}
                                pagination={{ pageSize: 10 }}
                                filtering={true}
                                exportable={true}
                                emptyMessage="PayPal аккаунты без баланса не найдены"
                            />
                        </div>
                    )}

                    {paypalAccounts.filter(p => p.status === 'active').length === 0 && (
                        <div className="text-center py-12">
                            <BanknotesIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Нет PayPal аккаунтов</h3>
                            <p className="text-gray-500 mb-4">Добавьте PayPal аккаунт для работы с казино</p>
                            <button
                                onClick={() => setShowCreatePayPalModal(true)}
                                className="btn-primary"
                            >
                                <PlusIcon className="h-5 w-5 mr-2" />
                                Добавить первый PayPal
                            </button>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'history' && (
                <div className="space-y-6">
                    {/* Заблокированные карты */}
                    {cards.filter(c => c.status !== 'active').length > 0 && (
                        <div className="card">
                            <div className="card-header">
                                <h3 className="text-lg font-semibold text-red-900">
                                    🚫 Заблокированные карты ({cards.filter(c => c.status !== 'active').length})
                                </h3>
                            </div>

                            <DataTable
                                data={cards.filter(c => c.status !== 'active')}
                                columns={cardColumns}
                                loading={loading}
                                pagination={{ pageSize: 10 }}
                                filtering={true}
                                exportable={true}
                                emptyMessage="Заблокированные карты не найдены"
                            />
                        </div>
                    )}

                    {/* Заблокированные PayPal */}
                    {blockedPayPalAccounts.length > 0 && (
                        <div className="card">
                            <div className="card-header">
                                <h3 className="text-lg font-semibold text-red-900">
                                    🚫 Заблокированные PayPal ({blockedPayPalAccounts.length})
                                </h3>
                            </div>

                            <DataTable
                                data={blockedPayPalAccounts}
                                columns={paypalColumns}
                                loading={loading}
                                pagination={{ pageSize: 10 }}
                                filtering={true}
                                exportable={true}
                                emptyMessage="Заблокированные PayPal аккаунты не найдены"
                            />
                        </div>
                    )}

                    {cards.filter(c => c.status !== 'active').length === 0 && blockedPayPalAccounts.length === 0 && (
                        <div className="text-center py-12">
                            <CheckCircleIcon className="h-12 w-12 mx-auto mb-4 text-green-300" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Нет заблокированных средств</h3>
                            <p className="text-gray-500">Все ваши платежные средства активны</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal создания PayPal аккаунта */}
            <Modal
                isOpen={showCreatePayPalModal}
                onClose={() => setShowCreatePayPalModal(false)}
                title="Добавить PayPal аккаунт"
                size="lg"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">Имя *</label>
                            <input
                                type="text"
                                value={newPayPalForm.name}
                                onChange={(e) => setNewPayPalForm({ ...newPayPalForm, name: e.target.value })}
                                className="form-input"
                                placeholder="PHILIP JOHN KNIGHT"
                                required
                            />
                        </div>
                        <div>
                            <label className="form-label">Email *</label>
                            <input
                                type="email"
                                value={newPayPalForm.email}
                                onChange={(e) => setNewPayPalForm({ ...newPayPalForm, email: e.target.value })}
                                className="form-input"
                                placeholder="example@outlook.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">Пароль *</label>
                            <input
                                type="password"
                                value={newPayPalForm.password}
                                onChange={(e) => setNewPayPalForm({ ...newPayPalForm, password: e.target.value })}
                                className="form-input"
                                placeholder="пароль"
                                required
                            />
                        </div>
                        <div>
                            <label className="form-label">Баланс</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={newPayPalForm.balance}
                                    onChange={(e) => setNewPayPalForm({ ...newPayPalForm, balance: parseFloat(e.target.value) || 0 })}
                                    className="form-input pr-16"
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                    <span className="text-gray-500 text-sm font-medium bg-gray-100 px-2 py-1 rounded">
                                        {newPayPalForm.currency}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="form-label">Валюта</label>
                        <select
                            value={newPayPalForm.currency}
                            onChange={(e) => setNewPayPalForm({ ...newPayPalForm, currency: e.target.value })}
                            className="form-input"
                        >
                            <option value="GBP">GBP (£) - Фунты стерлингов</option>
                            <option value="USD">USD ($) - Доллары США</option>
                            <option value="EUR">EUR (€) - Евро</option>
                            <option value="CAD">CAD (C$) - Канадские доллары</option>
                        </select>
                    </div>

                    <div>
                        <label className="form-label">Дополнительная информация</label>
                        <textarea
                            value={newPayPalForm.info}
                            onChange={(e) => setNewPayPalForm({ ...newPayPalForm, info: e.target.value })}
                            className="form-input"
                            rows={3}
                            placeholder="Заметки об аккаунте..."
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            onClick={() => setShowCreatePayPalModal(false)}
                            className="btn-secondary"
                            disabled={creating}
                        >
                            Отмена
                        </button>
                        <button
                            onClick={handleCreatePayPal}
                            className="btn-primary"
                            disabled={creating}
                        >
                            {creating ? 'Создание...' : 'Создать аккаунт'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
