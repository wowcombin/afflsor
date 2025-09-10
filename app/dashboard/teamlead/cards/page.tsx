'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column, ActionButton } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import StatusBadge from '@/components/ui/StatusBadge'
import Modal from '@/components/ui/Modal'
import {
    CreditCardIcon,
    EyeIcon,
    EyeSlashIcon,
    BanknotesIcon,
    CheckCircleIcon,
    XCircleIcon,
    ExclamationTriangleIcon,
    UserIcon
} from '@heroicons/react/24/outline'

interface Card {
    id: string
    card_number: string
    cardholder_name: string
    expiry_date: string
    cvv: string
    bank_name: string
    balance: number
    currency: string
    status: 'active' | 'blocked' | 'expired'
    assigned_to?: {
        email: string
        first_name?: string
        last_name?: string
        role: string
    }
    casino_assignment?: {
        casino_name: string
        assigned_at: string
    }
    created_at: string
}

interface CardStats {
    totalCards: number
    activeCards: number
    blockedCards: number
    assignedCards: number
    totalBalance: number
}

export default function TeamLeadCardsPage() {
    const { addToast } = useToast()
    const [cards, setCards] = useState<Card[]>([])
    const [stats, setStats] = useState<CardStats>({
        totalCards: 0,
        activeCards: 0,
        blockedCards: 0,
        assignedCards: 0,
        totalBalance: 0
    })
    const [loading, setLoading] = useState(true)
    const [showCardModal, setShowCardModal] = useState(false)
    const [selectedCard, setSelectedCard] = useState<Card | null>(null)
    const [showCardDetails, setShowCardDetails] = useState(false)

    useEffect(() => {
        loadCards()
    }, [])

    async function loadCards() {
        try {
            const response = await fetch('/api/teamlead/cards')

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Ошибка загрузки карт')
            }

            const { cards: cardsData } = await response.json()
            setCards(cardsData)

            // Рассчитываем статистику
            const totalCards = cardsData.length
            const activeCards = cardsData.filter((c: Card) => c.status === 'active').length
            const blockedCards = cardsData.filter((c: Card) => c.status === 'blocked').length
            const assignedCards = cardsData.filter((c: Card) => c.assigned_to).length
            const totalBalance = cardsData.reduce((sum: number, c: Card) => sum + (c.balance || 0), 0)

            setStats({
                totalCards,
                activeCards,
                blockedCards,
                assignedCards,
                totalBalance
            })

        } catch (error: any) {
            console.error('Ошибка загрузки карт:', error)
            addToast({
                type: 'error',
                title: 'Ошибка загрузки данных',
                description: error.message
            })
        } finally {
            setLoading(false)
        }
    }

    function handleViewCard(card: Card) {
        setSelectedCard(card)
        setShowCardModal(true)
    }

    function maskCardNumber(cardNumber: string) {
        if (!cardNumber) return 'Не указан'
        return cardNumber.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '$1 **** **** $4')
    }

    const columns: Column<Card>[] = [
        {
            key: 'card_info',
            label: 'Карта',
            sortable: true,
            filterable: true,
            render: (card) => (
                <div>
                    <div className="font-medium text-gray-900">
                        {maskCardNumber(card.card_number)}
                    </div>
                    <div className="text-sm text-gray-500">
                        {card.cardholder_name}
                    </div>
                    <div className="text-xs text-primary-600">
                        {card.bank_name}
                    </div>
                </div>
            )
        },
        {
            key: 'assigned_to',
            label: 'Назначена Junior',
            render: (card) => (
                card.assigned_to ? (
                    <div>
                        <div className="font-medium text-gray-900">
                            {card.assigned_to.first_name && card.assigned_to.last_name
                                ? `${card.assigned_to.first_name} ${card.assigned_to.last_name}`
                                : card.assigned_to.email
                            }
                        </div>
                        <div className="text-xs text-gray-500">{card.assigned_to.email}</div>
                    </div>
                ) : (
                    <span className="text-sm text-gray-400">Не назначена</span>
                )
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
                        {(card.balance || 0).toFixed(2)} {card.currency}
                    </div>
                </div>
            )
        },
        {
            key: 'status',
            label: 'Статус',
            sortable: true,
            render: (card) => <StatusBadge status={card.status} />
        },
        {
            key: 'casino_assignment',
            label: 'Казино',
            render: (card) => (
                card.casino_assignment ? (
                    <div>
                        <div className="text-sm font-medium text-gray-900">
                            {card.casino_assignment.casino_name}
                        </div>
                        <div className="text-xs text-gray-500">
                            {new Date(card.casino_assignment.assigned_at).toLocaleDateString('ru-RU')}
                        </div>
                    </div>
                ) : (
                    <span className="text-sm text-gray-400">Не назначена</span>
                )
            )
        },
        {
            key: 'created_at',
            label: 'Создана',
            sortable: true,
            render: (card) => (
                <span className="text-sm text-gray-500">
                    {new Date(card.created_at).toLocaleDateString('ru-RU')}
                </span>
            )
        }
    ]

    const actions: ActionButton<Card>[] = [
        {
            label: 'Просмотр',
            action: handleViewCard,
            variant: 'primary'
        }
    ]

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Карты команды</h1>
                    <p className="text-gray-600">Управление картами назначенных Junior сотрудников</p>
                </div>
            </div>

            {/* Информация о роли Team Lead */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <CreditCardIcon className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">
                            Права Team Lead по картам
                        </h3>
                        <div className="mt-2 text-sm text-blue-700">
                            <p>• Просмотр карт, назначенных вашим Junior сотрудникам</p>
                            <p>• Мониторинг балансов и статусов карт команды</p>
                            <p>• Контроль назначения карт к казино</p>
                            <p>• Назначение карт осуществляется через Manager или Admin</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <KPICard
                    title="Всего карт"
                    value={stats.totalCards}
                    icon={<CreditCardIcon className="h-6 w-6" />}
                    color="primary"
                />
                <KPICard
                    title="Активные"
                    value={stats.activeCards}
                    icon={<CheckCircleIcon className="h-6 w-6" />}
                    color="success"
                />
                <KPICard
                    title="Заблокированы"
                    value={stats.blockedCards}
                    icon={<XCircleIcon className="h-6 w-6" />}
                    color="danger"
                />
                <KPICard
                    title="Назначены"
                    value={stats.assignedCards}
                    icon={<UserIcon className="h-6 w-6" />}
                    color="warning"
                />
                <KPICard
                    title="Общий баланс"
                    value={`${stats.totalBalance.toFixed(2)}`}
                    icon={<BanknotesIcon className="h-6 w-6" />}
                    color="success"
                />
            </div>

            {/* Таблица карт */}
            <div className="card">
                <div className="card-header">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Карты команды ({cards.length})
                    </h3>
                </div>

                <DataTable
                    data={cards}
                    columns={columns}
                    actions={actions}
                    loading={loading}
                    pagination={{ pageSize: 20 }}
                    filtering={true}
                    exportable={true}
                    emptyMessage="Карты не найдены"
                />
            </div>

            {/* Modal просмотра карты */}
            <Modal
                isOpen={showCardModal}
                onClose={() => {
                    setShowCardModal(false)
                    setSelectedCard(null)
                    setShowCardDetails(false)
                }}
                title="Детали карты"
                size="lg"
            >
                {selectedCard && (
                    <div className="space-y-4">
                        {/* Основная информация */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Банк</label>
                                    <p className="text-sm text-gray-900">{selectedCard.bank_name}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Статус</label>
                                    <StatusBadge status={selectedCard.status} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Держатель карты</label>
                                    <p className="text-sm text-gray-900">{selectedCard.cardholder_name}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Баланс</label>
                                    <p className="text-sm font-bold text-green-600">
                                        {(selectedCard.balance || 0).toFixed(2)} {selectedCard.currency}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Номер карты с возможностью показать/скрыть */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-gray-700">Номер карты</label>
                                <button
                                    onClick={() => setShowCardDetails(!showCardDetails)}
                                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
                                >
                                    {showCardDetails ? (
                                        <>
                                            <EyeSlashIcon className="h-4 w-4 mr-1" />
                                            Скрыть детали
                                        </>
                                    ) : (
                                        <>
                                            <EyeIcon className="h-4 w-4 mr-1" />
                                            Показать детали
                                        </>
                                    )}
                                </button>
                            </div>
                            <div className="bg-gray-100 p-3 rounded font-mono text-sm">
                                {showCardDetails ? selectedCard.card_number : maskCardNumber(selectedCard.card_number)}
                            </div>
                        </div>

                        {/* Детали карты (если показаны) */}
                        {showCardDetails && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Срок действия</label>
                                    <p className="text-sm font-mono text-gray-900">{selectedCard.expiry_date}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">CVV</label>
                                    <p className="text-sm font-mono text-gray-900">{selectedCard.cvv}</p>
                                </div>
                            </div>
                        )}

                        {/* Назначение Junior */}
                        {selectedCard.assigned_to && (
                            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                                <h4 className="font-medium text-blue-800 mb-2">Назначена Junior:</h4>
                                <div>
                                    <p className="text-blue-700 font-medium">
                                        {selectedCard.assigned_to.first_name && selectedCard.assigned_to.last_name
                                            ? `${selectedCard.assigned_to.first_name} ${selectedCard.assigned_to.last_name}`
                                            : selectedCard.assigned_to.email
                                        }
                                    </p>
                                    <p className="text-blue-600 text-sm">{selectedCard.assigned_to.email}</p>
                                </div>
                            </div>
                        )}

                        {/* Назначение казино */}
                        {selectedCard.casino_assignment && (
                            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                                <h4 className="font-medium text-green-800 mb-2">Назначена казино:</h4>
                                <div>
                                    <p className="text-green-700 font-medium">{selectedCard.casino_assignment.casino_name}</p>
                                    <p className="text-green-600 text-sm">
                                        Назначена: {new Date(selectedCard.casino_assignment.assigned_at).toLocaleDateString('ru-RU')}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Предупреждение о конфиденциальности */}
                        {showCardDetails && (
                            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                                <div className="flex items-start">
                                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5" />
                                    <div className="ml-3">
                                        <h4 className="text-sm font-medium text-red-800">Конфиденциальная информация</h4>
                                        <p className="text-sm text-red-700 mt-1">
                                            Данные карты являются строго конфиденциальными. Не передавайте их третьим лицам.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end pt-4">
                            <button
                                onClick={() => {
                                    setShowCardModal(false)
                                    setSelectedCard(null)
                                    setShowCardDetails(false)
                                }}
                                className="btn-secondary"
                            >
                                Закрыть
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}
