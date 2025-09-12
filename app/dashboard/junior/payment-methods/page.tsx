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
    currency: string
    sender_paypal_email?: string
    balance_send?: number
    send_paypal_balance?: string
    info?: string
    status: 'active' | 'blocked' | 'suspended'
    created_at: string
    updated_at: string
}

interface PayPalOperation {
    id: string
    paypal_account_id: string
    operation_type: 'send_money' | 'receive_money' | 'withdraw_to_card' | 'deposit_from_card' | 'casino_deposit' | 'casino_withdrawal'
    amount: number
    currency: string
    recipient_paypal_email?: string
    recipient_card_number?: string
    casino_name?: string
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
    description?: string
    transaction_id?: string
    fee_amount: number
    created_at: string
    updated_at: string
    completed_at?: string
    paypal_accounts: PayPalAccount
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
    const [showEditPayPalModal, setShowEditPayPalModal] = useState(false)
    const [editingPayPal, setEditingPayPal] = useState<PayPalAccount | null>(null)
    const [creating, setCreating] = useState(false)
    const [updating, setUpdating] = useState(false)
    
    // Операции PayPal
    const [paypalOperations, setPaypalOperations] = useState<PayPalOperation[]>([])
    const [showOperationsModal, setShowOperationsModal] = useState(false)
    const [selectedPayPalAccount, setSelectedPayPalAccount] = useState<PayPalAccount | null>(null)
    const [showCreateOperationModal, setShowCreateOperationModal] = useState(false)
    const [newOperationForm, setNewOperationForm] = useState({
        operation_type: 'send_money' as PayPalOperation['operation_type'],
        amount: 0,
        currency: 'USD',
        recipient_paypal_email: '',
        recipient_card_number: '',
        casino_name: '',
        description: ''
    })

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

    // Форма редактирования PayPal аккаунта
    const [editPayPalForm, setEditPayPalForm] = useState({
        name: '',
        email: '',
        password: '',
        phone_number: '',
        authenticator_url: '',
        balance: 0,
        currency: 'GBP',
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
        if (!newPayPalForm.name || !newPayPalForm.email || !newPayPalForm.password || 
            !newPayPalForm.phone_number || !newPayPalForm.authenticator_url) {
            addToast({ 
                type: 'error', 
                title: 'Заполните обязательные поля',
                description: 'Имя, email, пароль, телефон и ссылка аутентификатора обязательны'
            })
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

    // Открыть редактирование PayPal аккаунта
    function openEditPayPal(account: PayPalAccount) {
        setEditingPayPal(account)
        setEditPayPalForm({
            name: account.name,
            email: account.email,
            password: account.password,
            phone_number: account.phone_number,
            authenticator_url: account.authenticator_url,
            balance: account.balance,
            currency: account.currency,
            sender_paypal_email: account.sender_paypal_email || '',
            balance_send: account.balance_send || 0,
            send_paypal_balance: account.send_paypal_balance || '',
            info: account.info || ''
        })
        setShowEditPayPalModal(true)
    }

    // Обновить PayPal аккаунт
    async function handleUpdatePayPal() {
        if (!editingPayPal) return

        if (!editPayPalForm.name || !editPayPalForm.email || !editPayPalForm.password ||
            !editPayPalForm.phone_number || !editPayPalForm.authenticator_url) {
            addToast({
                type: 'error',
                title: 'Заполните обязательные поля',
                description: 'Имя, email, пароль, телефон и ссылка аутентификатора обязательны'
            })
            return
        }

        setUpdating(true)

        try {
            const response = await fetch(`/api/junior/paypal/${editingPayPal.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editPayPalForm)
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error)
            }

            addToast({
                type: 'success',
                title: 'PayPal аккаунт обновлен',
                description: `${editPayPalForm.name} успешно обновлен`
            })

            setShowEditPayPalModal(false)
            setEditingPayPal(null)
            await loadPaymentMethods()

        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Ошибка обновления аккаунта',
                description: error.message
            })
        } finally {
            setUpdating(false)
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
            label: 'Редактировать',
            action: (paypal) => openEditPayPal(paypal),
            variant: 'secondary',
            condition: (paypal) => paypal.status === 'active'
        },
        {
            label: 'Создать работу',
            action: (paypal) => router.push(`/dashboard/junior/work/new?paypal_id=${paypal.id}`),
            variant: 'primary',
            condition: (paypal) => paypal.status === 'active'
        },
        {
            label: 'Операции',
            action: async (paypal) => {
                setSelectedPayPalAccount(paypal)
                setShowOperationsModal(true)
                
                // Загружаем операции для этого аккаунта
                try {
                    const response = await fetch(`/api/paypal/operations?paypal_account_id=${paypal.id}`)
                    if (response.ok) {
                        const data = await response.json()
                        setPaypalOperations(data.operations || [])
                    }
                } catch (error) {
                    console.error('Error loading operations:', error)
                }
            },
            variant: 'secondary',
            condition: (paypal) => paypal.status === 'active'
        },
        {
            label: 'Заблокировать',
            action: async (paypal) => {
                if (confirm(`Вы уверены, что хотите заблокировать PayPal аккаунт "${paypal.name}"?`)) {
                    try {
                        const response = await fetch(`/api/junior/paypal/${paypal.id}`, {
                            method: 'DELETE'
                        })
                        
                        if (response.ok) {
                            addToast({
                                type: 'success',
                                title: 'PayPal аккаунт заблокирован'
                            })
                            loadPaymentMethods()
                        } else {
                            const error = await response.json()
                            addToast({
                                type: 'error',
                                title: error.error || 'Ошибка при блокировке аккаунта'
                            })
                        }
                    } catch (error) {
                        console.error('Error blocking PayPal:', error)
                        addToast({
                            type: 'error',
                            title: 'Ошибка при блокировке аккаунта'
                        })
                    }
                }
            },
            variant: 'danger',
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
                            <label className="form-label">Номер телефона *</label>
                            <input
                                type="tel"
                                value={newPayPalForm.phone_number}
                                onChange={(e) => setNewPayPalForm({ ...newPayPalForm, phone_number: e.target.value })}
                                className="form-input"
                                placeholder="+1234567890"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">Ссылка аутентификатора *</label>
                            <input
                                type="url"
                                value={newPayPalForm.authenticator_url}
                                onChange={(e) => setNewPayPalForm({ ...newPayPalForm, authenticator_url: e.target.value })}
                                className="form-input"
                                placeholder="https://..."
                                required
                            />
                        </div>
                        <div>
                            <label className="form-label">Баланс и валюта</label>
                            <div className="flex gap-3">
                                <input
                                    type="number"
                                    value={newPayPalForm.balance}
                                    onChange={(e) => setNewPayPalForm({ ...newPayPalForm, balance: parseFloat(e.target.value) || 0 })}
                                    className="form-input w-full"
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                    style={{ minWidth: '200px' }}
                                />
                                <select
                                    value={newPayPalForm.currency}
                                    onChange={(e) => setNewPayPalForm({ ...newPayPalForm, currency: e.target.value })}
                                    className="form-input flex-shrink-0"
                                    style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}
                                >
                                    <option value="GBP">GBP</option>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                    <option value="CAD">CAD</option>
                                </select>
                            </div>
                        </div>
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

            {/* Модальное окно редактирования PayPal аккаунта */}
            <Modal
                isOpen={showEditPayPalModal}
                onClose={() => {
                    setShowEditPayPalModal(false)
                    setEditingPayPal(null)
                }}
                title="Редактировать PayPal аккаунт"
                size="lg"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">Имя *</label>
                            <input
                                type="text"
                                value={editPayPalForm.name}
                                onChange={(e) => setEditPayPalForm({ ...editPayPalForm, name: e.target.value })}
                                className="form-input"
                                placeholder="PHILIP JOHN KNIGHT"
                                required
                            />
                        </div>
                        <div>
                            <label className="form-label">Email *</label>
                            <input
                                type="email"
                                value={editPayPalForm.email}
                                onChange={(e) => setEditPayPalForm({ ...editPayPalForm, email: e.target.value })}
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
                                value={editPayPalForm.password}
                                onChange={(e) => setEditPayPalForm({ ...editPayPalForm, password: e.target.value })}
                                className="form-input"
                                placeholder="пароль"
                                required
                            />
                        </div>
                        <div>
                            <label className="form-label">Номер телефона *</label>
                            <input
                                type="tel"
                                value={editPayPalForm.phone_number}
                                onChange={(e) => setEditPayPalForm({ ...editPayPalForm, phone_number: e.target.value })}
                                className="form-input"
                                placeholder="+1234567890"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">Ссылка аутентификатора *</label>
                            <input
                                type="url"
                                value={editPayPalForm.authenticator_url}
                                onChange={(e) => setEditPayPalForm({ ...editPayPalForm, authenticator_url: e.target.value })}
                                className="form-input"
                                placeholder="https://..."
                                required
                            />
                        </div>
                        <div>
                            <label className="form-label">Баланс и валюта</label>
                            <div className="flex gap-3">
                                <input
                                    type="number"
                                    value={editPayPalForm.balance}
                                    onChange={(e) => setEditPayPalForm({ ...editPayPalForm, balance: parseFloat(e.target.value) || 0 })}
                                    className="form-input w-full"
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                    style={{ minWidth: '200px' }}
                                />
                                <select
                                    value={editPayPalForm.currency}
                                    onChange={(e) => setEditPayPalForm({ ...editPayPalForm, currency: e.target.value })}
                                    className="form-input flex-shrink-0"
                                    style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}
                                >
                                    <option value="GBP">GBP</option>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                    <option value="CAD">CAD</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="form-label">Дополнительная информация</label>
                        <textarea
                            value={editPayPalForm.info}
                            onChange={(e) => setEditPayPalForm({ ...editPayPalForm, info: e.target.value })}
                            className="form-input"
                            rows={3}
                            placeholder="Заметки об аккаунте..."
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            onClick={() => {
                                setShowEditPayPalModal(false)
                                setEditingPayPal(null)
                            }}
                            className="btn-secondary"
                            disabled={updating}
                        >
                            Отмена
                        </button>
                        <button
                            onClick={handleUpdatePayPal}
                            className="btn-primary"
                            disabled={updating}
                        >
                            {updating ? 'Обновление...' : 'Обновить аккаунт'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Модальное окно операций PayPal */}
            <Modal
                isOpen={showOperationsModal}
                onClose={() => {
                    setShowOperationsModal(false)
                    setSelectedPayPalAccount(null)
                }}
                title={`Операции PayPal - ${selectedPayPalAccount?.name}`}
                size="xl"
            >
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">История операций</h3>
                        <button
                            onClick={() => setShowCreateOperationModal(true)}
                            className="btn-primary"
                        >
                            <PlusIcon className="h-5 w-5 mr-2" />
                            Записать операцию
                        </button>
                    </div>

                    {/* Список операций */}
                    <div className="max-h-96 overflow-y-auto">
                        {paypalOperations.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                Операции не найдены
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {paypalOperations.map((operation) => (
                                    <div key={operation.id} className="border rounded-lg p-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-medium">
                                                    {operation.operation_type === 'send_money' && '📤 Отправка денег'}
                                                    {operation.operation_type === 'receive_money' && '📥 Получение денег'}
                                                    {operation.operation_type === 'withdraw_to_card' && '💳 Вывод на карту'}
                                                    {operation.operation_type === 'deposit_from_card' && '💳 Пополнение с карты'}
                                                    {operation.operation_type === 'casino_deposit' && '🎰 Депозит в казино'}
                                                    {operation.operation_type === 'casino_withdrawal' && '🎰 Вывод из казино'}
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    {operation.amount} {operation.currency}
                                                    {operation.fee_amount > 0 && ` (комиссия: ${operation.fee_amount})`}
                                                </div>
                                                {operation.description && (
                                                    <div className="text-sm text-gray-500 mt-1">
                                                        {operation.description}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                                    operation.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                    operation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    operation.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                                    operation.status === 'failed' ? 'bg-red-100 text-red-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {operation.status === 'completed' && 'Завершено'}
                                                    {operation.status === 'pending' && 'Ожидание'}
                                                    {operation.status === 'processing' && 'Обработка'}
                                                    {operation.status === 'failed' && 'Ошибка'}
                                                    {operation.status === 'cancelled' && 'Отменено'}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {new Date(operation.created_at).toLocaleDateString('ru-RU')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Модальное окно создания операции */}
            <Modal
                isOpen={showCreateOperationModal}
                onClose={() => setShowCreateOperationModal(false)}
                title="Записать операцию PayPal"
                size="lg"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">Тип операции *</label>
                            <select
                                value={newOperationForm.operation_type}
                                onChange={(e) => setNewOperationForm({ 
                                    ...newOperationForm, 
                                    operation_type: e.target.value as PayPalOperation['operation_type']
                                })}
                                className="form-input"
                                required
                            >
                                <option value="send_money">📤 Отправка денег</option>
                                <option value="receive_money">📥 Получение денег</option>
                                <option value="withdraw_to_card">💳 Вывод на карту</option>
                                <option value="deposit_from_card">💳 Пополнение с карты</option>
                                <option value="casino_deposit">🎰 Депозит в казино</option>
                                <option value="casino_withdrawal">🎰 Вывод из казино</option>
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Сумма и валюта *</label>
                            <div className="flex gap-3">
                                <input
                                    type="number"
                                    value={newOperationForm.amount}
                                    onChange={(e) => setNewOperationForm({ 
                                        ...newOperationForm, 
                                        amount: parseFloat(e.target.value) || 0 
                                    })}
                                    className="form-input w-full"
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                    style={{ minWidth: '200px' }}
                                    required
                                />
                                <select
                                    value={newOperationForm.currency}
                                    onChange={(e) => setNewOperationForm({ 
                                        ...newOperationForm, 
                                        currency: e.target.value 
                                    })}
                                    className="form-input flex-shrink-0"
                                    style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}
                                >
                                    <option value="GBP">GBP</option>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                    <option value="CAD">CAD</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Дополнительные поля в зависимости от типа операции */}
                    {(newOperationForm.operation_type === 'send_money' || newOperationForm.operation_type === 'receive_money') && (
                        <div>
                            <label className="form-label">Email получателя/отправителя</label>
                            <input
                                type="email"
                                value={newOperationForm.recipient_paypal_email}
                                onChange={(e) => setNewOperationForm({ 
                                    ...newOperationForm, 
                                    recipient_paypal_email: e.target.value 
                                })}
                                className="form-input"
                                placeholder="example@paypal.com"
                            />
                        </div>
                    )}

                    {(newOperationForm.operation_type === 'withdraw_to_card' || newOperationForm.operation_type === 'deposit_from_card') && (
                        <div>
                            <label className="form-label">Номер карты</label>
                            <input
                                type="text"
                                value={newOperationForm.recipient_card_number}
                                onChange={(e) => setNewOperationForm({ 
                                    ...newOperationForm, 
                                    recipient_card_number: e.target.value 
                                })}
                                className="form-input"
                                placeholder="**** **** **** 1234"
                            />
                        </div>
                    )}

                    {(newOperationForm.operation_type === 'casino_deposit' || newOperationForm.operation_type === 'casino_withdrawal') && (
                        <div>
                            <label className="form-label">Название казино</label>
                            <input
                                type="text"
                                value={newOperationForm.casino_name}
                                onChange={(e) => setNewOperationForm({ 
                                    ...newOperationForm, 
                                    casino_name: e.target.value 
                                })}
                                className="form-input"
                                placeholder="Название казино"
                            />
                        </div>
                    )}

                    <div>
                        <label className="form-label">Описание операции</label>
                        <textarea
                            value={newOperationForm.description}
                            onChange={(e) => setNewOperationForm({ 
                                ...newOperationForm, 
                                description: e.target.value 
                            })}
                            className="form-input"
                            rows={3}
                            placeholder="Дополнительная информация об операции..."
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            onClick={() => setShowCreateOperationModal(false)}
                            className="btn-secondary"
                        >
                            Отмена
                        </button>
                        <button
                            onClick={async () => {
                                if (!selectedPayPalAccount || newOperationForm.amount <= 0) {
                                    addToast({
                                        type: 'error',
                                        title: 'Ошибка',
                                        description: 'Заполните все обязательные поля'
                                    })
                                    return
                                }

                                try {
                                    const response = await fetch('/api/paypal/operations', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            paypal_account_id: selectedPayPalAccount.id,
                                            ...newOperationForm
                                        })
                                    })

                                    const data = await response.json()

                                    if (!response.ok) {
                                        throw new Error(data.error)
                                    }

                                    addToast({
                                        type: 'success',
                                        title: 'Операция записана',
                                        description: 'Информация о переводе успешно сохранена'
                                    })

                                    setShowCreateOperationModal(false)
                                    setNewOperationForm({
                                        operation_type: 'send_money',
                                        amount: 0,
                                        currency: 'USD',
                                        recipient_paypal_email: '',
                                        recipient_card_number: '',
                                        casino_name: '',
                                        description: ''
                                    })

                                    // Обновляем список операций
                                    const operationsResponse = await fetch(`/api/paypal/operations?paypal_account_id=${selectedPayPalAccount.id}`)
                                    if (operationsResponse.ok) {
                                        const operationsData = await operationsResponse.json()
                                        setPaypalOperations(operationsData.operations || [])
                                    }

                                } catch (error: any) {
                                    addToast({
                                        type: 'error',
                                        title: 'Ошибка записи операции',
                                        description: error.message
                                    })
                                }
                            }}
                            className="btn-primary"
                        >
                            Записать операцию
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
