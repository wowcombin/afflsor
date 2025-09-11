'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column, ActionButton } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import Modal from '@/components/ui/Modal'
import StatusBadge from '@/components/ui/StatusBadge'
import {
    BanknotesIcon,
    CreditCardIcon,
    UserIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ChatBubbleLeftRightIcon,
    NoSymbolIcon,
    ClockIcon
} from '@heroicons/react/24/outline'

interface Withdrawal {
    id: string
    amount: number
    currency: string
    status: string
    created_at: string
    checked_at?: string
    manager_comment?: string
    hr_comment?: string
    cfo_comment?: string
    user: {
        id: string
        email: string
        first_name?: string
        last_name?: string
        role: string
    }
    card?: {
        card_number: string
        bank: {
            name: string
            country: string
        }
    }
    casino?: {
        name: string
        url: string
    }
    work?: {
        deposit_amount: number
        profit: number
    }
    type: 'card' | 'paypal'
    paypal_account?: {
        name: string
        email: string
    }
}

export default function CFOWithdrawalsPage() {
    const { addToast } = useToast()
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('all')
    const [typeFilter, setTypeFilter] = useState('all')

    // Модал комментария
    const [showCommentModal, setShowCommentModal] = useState(false)
    const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null)
    const [commenting, setCommenting] = useState(false)
    const [commentForm, setCommentForm] = useState({
        comment: '',
        action: 'comment' // comment, block
    })

    useEffect(() => {
        loadWithdrawals()
    }, [])

    async function loadWithdrawals() {
        try {
            setLoading(true)

            // Загружаем обычные выводы
            const cardWithdrawalsResponse = await fetch('/api/withdrawals')
            let cardWithdrawals = []
            if (cardWithdrawalsResponse.ok) {
                const cardData = await cardWithdrawalsResponse.json()
                cardWithdrawals = (cardData.withdrawals || []).map((w: any) => ({
                    ...w,
                    type: 'card'
                }))
            }

            // Загружаем PayPal выводы (если API существует)
            const paypalWithdrawalsResponse = await fetch('/api/paypal/withdrawals')
            let paypalWithdrawals = []
            if (paypalWithdrawalsResponse.ok) {
                const paypalData = await paypalWithdrawalsResponse.json()
                paypalWithdrawals = (paypalData.withdrawals || []).map((w: any) => ({
                    ...w,
                    type: 'paypal'
                }))
            }

            // Объединяем все выводы
            const allWithdrawals = [...cardWithdrawals, ...paypalWithdrawals]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

            setWithdrawals(allWithdrawals)

        } catch (error: any) {
            console.error('Ошибка загрузки выводов:', error)
            addToast({
                type: 'error',
                title: 'Ошибка загрузки данных',
                description: error.message
            })
        } finally {
            setLoading(false)
        }
    }

    function handleComment(withdrawal: Withdrawal) {
        setSelectedWithdrawal(withdrawal)
        setCommentForm({
            comment: withdrawal.cfo_comment || '',
            action: 'comment'
        })
        setShowCommentModal(true)
    }

    function handleBlock(withdrawal: Withdrawal) {
        setSelectedWithdrawal(withdrawal)
        setCommentForm({
            comment: withdrawal.cfo_comment || '',
            action: 'block'
        })
        setShowCommentModal(true)
    }

    async function handleSubmitComment() {
        if (!selectedWithdrawal) return

        if (!commentForm.comment.trim()) {
            addToast({
                type: 'error',
                title: 'Введите комментарий',
                description: 'Комментарий обязателен'
            })
            return
        }

        try {
            setCommenting(true)

            const endpoint = selectedWithdrawal.type === 'paypal'
                ? `/api/paypal/withdrawals/${selectedWithdrawal.id}/cfo-comment`
                : `/api/withdrawals/${selectedWithdrawal.id}/cfo-comment`

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    comment: commentForm.comment.trim(),
                    action: commentForm.action
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка сохранения комментария')
            }

            addToast({
                type: 'success',
                title: commentForm.action === 'block' ? 'Вывод заблокирован' : 'Комментарий добавлен',
                description: data.message
            })

            setShowCommentModal(false)
            setSelectedWithdrawal(null)
            setCommentForm({ comment: '', action: 'comment' })
            await loadWithdrawals()

        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Ошибка',
                description: error.message
            })
        } finally {
            setCommenting(false)
        }
    }

    // Фильтрация выводов
    const filteredWithdrawals = withdrawals.filter(withdrawal => {
        if (statusFilter !== 'all' && withdrawal.status !== statusFilter) return false
        if (typeFilter !== 'all' && withdrawal.type !== typeFilter) return false
        return true
    })

    const columns: Column<Withdrawal>[] = [
        {
            key: 'user',
            label: 'Сотрудник',
            render: (withdrawal) => (
                <div>
                    <div className="font-medium text-gray-900">
                        {`${withdrawal.user.first_name || ''} ${withdrawal.user.last_name || ''}`.trim() || withdrawal.user.email}
                    </div>
                    <div className="text-sm text-gray-500">{withdrawal.user.email}</div>
                    <div className="text-xs text-blue-600 capitalize">{withdrawal.user.role}</div>
                </div>
            )
        },
        {
            key: 'type',
            label: 'Тип',
            render: (withdrawal) => (
                <div className="flex items-center space-x-1">
                    {withdrawal.type === 'card' ? (
                        <CreditCardIcon className="h-4 w-4 text-blue-500" />
                    ) : (
                        <BanknotesIcon className="h-4 w-4 text-green-500" />
                    )}
                    <span className="text-sm font-medium">
                        {withdrawal.type === 'card' ? 'Карта' : 'PayPal'}
                    </span>
                </div>
            )
        },
        {
            key: 'source',
            label: 'Источник',
            render: (withdrawal) => (
                <div>
                    {withdrawal.type === 'card' && withdrawal.card ? (
                        <>
                            <div className="font-medium text-gray-900">****{withdrawal.card.card_number.slice(-4)}</div>
                            <div className="text-sm text-gray-500">{withdrawal.card.bank.name}</div>
                        </>
                    ) : withdrawal.type === 'paypal' && withdrawal.paypal_account ? (
                        <>
                            <div className="font-medium text-gray-900">{withdrawal.paypal_account.name}</div>
                            <div className="text-sm text-gray-500">{withdrawal.paypal_account.email}</div>
                        </>
                    ) : (
                        <span className="text-gray-500">Не указан</span>
                    )}
                </div>
            )
        },
        {
            key: 'casino',
            label: 'Казино',
            render: (withdrawal) => (
                <div>
                    {withdrawal.casino ? (
                        <>
                            <div className="font-medium text-gray-900">{withdrawal.casino.name}</div>
                            <div className="text-sm text-blue-600">{withdrawal.casino.url}</div>
                        </>
                    ) : (
                        <span className="text-gray-500">Не указано</span>
                    )}
                </div>
            )
        },
        {
            key: 'amount',
            label: 'Сумма',
            render: (withdrawal) => (
                <div className="text-right">
                    <div className="font-bold text-green-600">
                        {withdrawal.amount.toFixed(2)} {withdrawal.currency}
                    </div>
                    {withdrawal.work && (
                        <div className="text-xs text-gray-500">
                            Профит: {withdrawal.work.profit.toFixed(2)}
                        </div>
                    )}
                </div>
            )
        },
        {
            key: 'status',
            label: 'Статус',
            render: (withdrawal) => (
                <StatusBadge status={withdrawal.status} />
            )
        },
        {
            key: 'created_at',
            label: 'Создан',
            render: (withdrawal) => (
                <span className="text-sm text-gray-500">
                    {new Date(withdrawal.created_at).toLocaleDateString('ru-RU')}
                </span>
            )
        },
        {
            key: 'comments',
            label: 'Комментарии',
            render: (withdrawal) => (
                <div className="text-sm space-y-1">
                    {withdrawal.manager_comment && (
                        <div className="text-blue-600">Manager: {withdrawal.manager_comment}</div>
                    )}
                    {withdrawal.hr_comment && (
                        <div className="text-purple-600">HR: {withdrawal.hr_comment}</div>
                    )}
                    {withdrawal.cfo_comment && (
                        <div className="text-orange-600">CFO: {withdrawal.cfo_comment}</div>
                    )}
                    {!withdrawal.manager_comment && !withdrawal.hr_comment && !withdrawal.cfo_comment && (
                        <span className="text-gray-500">Нет комментариев</span>
                    )}
                </div>
            )
        }
    ]

    const actions: ActionButton<Withdrawal>[] = [
        {
            label: 'Комментарий',
            action: handleComment,
            variant: 'primary',
            icon: ChatBubbleLeftRightIcon
        },
        {
            label: 'Заблокировать',
            action: handleBlock,
            variant: 'danger',
            icon: NoSymbolIcon,
            condition: (withdrawal) => !['blocked', 'rejected'].includes(withdrawal.status)
        }
    ]

    // Статистика
    const totalAmount = filteredWithdrawals.reduce((sum, w) => sum + w.amount, 0)
    const pendingWithdrawals = filteredWithdrawals.filter(w => w.status === 'pending')
    const approvedWithdrawals = filteredWithdrawals.filter(w => w.status === 'approved')
    const blockedWithdrawals = filteredWithdrawals.filter(w => ['blocked', 'rejected'].includes(w.status))
    const cardWithdrawals = filteredWithdrawals.filter(w => w.type === 'card')
    const paypalWithdrawals = filteredWithdrawals.filter(w => w.type === 'paypal')

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Контроль выводов</h1>
                    <p className="text-gray-600">CFO мониторинг и контроль всех выводов</p>
                </div>
            </div>

            {/* Информация о CFO правах */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <BanknotesIcon className="h-5 w-5 text-orange-400" />
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-orange-800">
                            CFO контроль выводов
                        </h3>
                        <div className="mt-2 text-sm text-orange-700">
                            <p>• Мониторинг всех выводов (карты + PayPal) в системе</p>
                            <p>• Добавление комментариев к подозрительным операциям</p>
                            <p>• Блокировка выводов при выявлении нарушений</p>
                            <p>• Финансовый контроль и анализ трендов</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Фильтры */}
            <div className="flex space-x-4">
                <div>
                    <label className="form-label">Статус</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="form-input"
                    >
                        <option value="all">Все статусы</option>
                        <option value="pending">Ожидают</option>
                        <option value="approved">Одобрены</option>
                        <option value="rejected">Отклонены</option>
                        <option value="blocked">Заблокированы</option>
                        <option value="completed">Завершены</option>
                    </select>
                </div>
                <div>
                    <label className="form-label">Тип</label>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="form-input"
                    >
                        <option value="all">Все типы</option>
                        <option value="card">Карты</option>
                        <option value="paypal">PayPal</option>
                    </select>
                </div>
            </div>

            {/* Статистика */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <KPICard
                    title="Всего выводов"
                    value={filteredWithdrawals.length}
                    icon={<BanknotesIcon className="h-6 w-6" />}
                    color="primary"
                />
                <KPICard
                    title="Ожидают"
                    value={pendingWithdrawals.length}
                    icon={<ClockIcon className="h-6 w-6" />}
                    color="warning"
                />
                <KPICard
                    title="Одобрены"
                    value={approvedWithdrawals.length}
                    icon={<CheckCircleIcon className="h-6 w-6" />}
                    color="success"
                />
                <KPICard
                    title="Заблокированы"
                    value={blockedWithdrawals.length}
                    icon={<ExclamationTriangleIcon className="h-6 w-6" />}
                    color="danger"
                />
                <KPICard
                    title="Карты"
                    value={cardWithdrawals.length}
                    icon={<CreditCardIcon className="h-6 w-6" />}
                    color="primary"
                />
                <KPICard
                    title="PayPal"
                    value={paypalWithdrawals.length}
                    icon={<BanknotesIcon className="h-6 w-6" />}
                    color="success"
                />
            </div>

            {/* Финансовая статистика */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card">
                    <div className="card-header">
                        <h3 className="text-lg font-semibold text-gray-900">Общая сумма</h3>
                    </div>
                    <div className="p-6 text-center">
                        <div className="text-3xl font-bold text-green-600">
                            ${totalAmount.toFixed(2)}
                        </div>
                        <p className="text-sm text-gray-500 mt-2">Все выводы</p>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="text-lg font-semibold text-gray-900">По типам</h3>
                    </div>
                    <div className="p-6">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Карты:</span>
                                <span className="font-bold text-blue-600">
                                    ${cardWithdrawals.reduce((sum, w) => sum + w.amount, 0).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">PayPal:</span>
                                <span className="font-bold text-green-600">
                                    ${paypalWithdrawals.reduce((sum, w) => sum + w.amount, 0).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="text-lg font-semibold text-gray-900">Контроль</h3>
                    </div>
                    <div className="p-6">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Требуют внимания:</span>
                                <span className="font-bold text-orange-600">{pendingWithdrawals.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Заблокированы:</span>
                                <span className="font-bold text-red-600">{blockedWithdrawals.length}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Таблица выводов */}
            <div className="card">
                <div className="card-header">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Все выводы ({filteredWithdrawals.length})
                    </h3>
                </div>

                <DataTable
                    data={filteredWithdrawals}
                    columns={columns}
                    actions={actions}
                    loading={loading}
                    pagination={{ pageSize: 25 }}
                    filtering={true}
                    exportable={true}
                    emptyMessage="Выводы не найдены"
                />
            </div>

            {/* Modal комментария/блокировки */}
            <Modal
                isOpen={showCommentModal}
                onClose={() => {
                    setShowCommentModal(false)
                    setSelectedWithdrawal(null)
                    setCommentForm({ comment: '', action: 'comment' })
                }}
                title={commentForm.action === 'block' ? 'Заблокировать вывод' : 'Добавить комментарий'}
                size="lg"
            >
                {selectedWithdrawal && (
                    <div className="space-y-4">
                        {/* Информация о выводе */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-medium text-gray-900 mb-2">Информация о выводе</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-600">Сотрудник:</span>
                                    <div className="font-medium">
                                        {`${selectedWithdrawal.user.first_name || ''} ${selectedWithdrawal.user.last_name || ''}`.trim() || selectedWithdrawal.user.email}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-gray-600">Тип:</span>
                                    <div className="font-medium">{selectedWithdrawal.type === 'card' ? 'Карта' : 'PayPal'}</div>
                                </div>
                                <div>
                                    <span className="text-gray-600">Сумма:</span>
                                    <div className="font-medium text-green-600">
                                        {selectedWithdrawal.amount.toFixed(2)} {selectedWithdrawal.currency}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-gray-600">Статус:</span>
                                    <div><StatusBadge status={selectedWithdrawal.status} /></div>
                                </div>
                            </div>
                        </div>

                        {/* Действие */}
                        <div>
                            <label className="form-label">Действие</label>
                            <select
                                value={commentForm.action}
                                onChange={(e) => setCommentForm({ ...commentForm, action: e.target.value })}
                                className="form-input"
                            >
                                <option value="comment">Добавить комментарий</option>
                                <option value="block">Заблокировать вывод</option>
                            </select>
                        </div>

                        {/* Комментарий */}
                        <div>
                            <label className="form-label">
                                {commentForm.action === 'block' ? 'Причина блокировки *' : 'Комментарий *'}
                            </label>
                            <textarea
                                value={commentForm.comment}
                                onChange={(e) => setCommentForm({ ...commentForm, comment: e.target.value })}
                                className="form-input"
                                rows={4}
                                placeholder={
                                    commentForm.action === 'block'
                                        ? 'Укажите причину блокировки...'
                                        : 'Ваш комментарий к выводу...'
                                }
                                required
                            />
                        </div>

                        {/* Существующие комментарии */}
                        {(selectedWithdrawal.manager_comment || selectedWithdrawal.hr_comment || selectedWithdrawal.cfo_comment) && (
                            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                                <h4 className="font-medium text-blue-800 mb-2">Существующие комментарии</h4>
                                <div className="space-y-2 text-sm">
                                    {selectedWithdrawal.manager_comment && (
                                        <div className="text-blue-700">
                                            <strong>Manager:</strong> {selectedWithdrawal.manager_comment}
                                        </div>
                                    )}
                                    {selectedWithdrawal.hr_comment && (
                                        <div className="text-purple-700">
                                            <strong>HR:</strong> {selectedWithdrawal.hr_comment}
                                        </div>
                                    )}
                                    {selectedWithdrawal.cfo_comment && (
                                        <div className="text-orange-700">
                                            <strong>CFO:</strong> {selectedWithdrawal.cfo_comment}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end space-x-3 pt-4">
                            <button
                                onClick={() => {
                                    setShowCommentModal(false)
                                    setSelectedWithdrawal(null)
                                    setCommentForm({ comment: '', action: 'comment' })
                                }}
                                className="btn-secondary"
                                disabled={commenting}
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleSubmitComment}
                                className={`${commentForm.action === 'block' ? 'btn-danger' : 'btn-primary'}`}
                                disabled={commenting || !commentForm.comment.trim()}
                            >
                                {commenting ? 'Сохранение...' :
                                    commentForm.action === 'block' ? 'Заблокировать' : 'Сохранить комментарий'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}
