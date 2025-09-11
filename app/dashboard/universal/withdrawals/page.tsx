'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column, ActionButton } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import Modal from '@/components/ui/Modal'
import { convertToUSD } from '@/lib/currency'
import {
    ClockIcon,
    CheckCircleIcon,
    XMarkIcon,
    ExclamationTriangleIcon,
    ChatBubbleLeftIcon,
    ClipboardDocumentListIcon,
    EyeIcon,
    UserIcon,
    CurrencyDollarIcon
} from '@heroicons/react/24/outline'

interface Withdrawal {
    id: string
    source_type: 'regular' | 'paypal'
    user_id: string
    user_name: string
    user_email: string
    user_telegram: string
    user_role: string
    amount: number
    deposit_amount: number
    currency?: string
    status: string
    manager_status?: string
    teamlead_status?: string
    casino_name: string
    casino_company: string
    casino_login: string
    card_mask?: string
    card_type?: string
    bank_name?: string
    paypal_name?: string
    paypal_email?: string
    manager_comment?: string
    teamlead_comment?: string
    hr_comment?: string
    cfo_comment?: string
    created_at: string
    updated_at: string
    checked_at?: string
}

interface UniversalWithdrawalsPageProps {
    userRole: 'manager' | 'teamlead' | 'hr' | 'admin' | 'cfo'
}

function UniversalWithdrawalsPage({ userRole }: UniversalWithdrawalsPageProps) {
    const router = useRouter()
    const { addToast } = useToast()

    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<any>({})

    // Фильтры
    const [statusFilter, setStatusFilter] = useState('all')
    const [sourceFilter, setSourceFilter] = useState('all')
    const [dateFilter, setDateFilter] = useState('all')

    // Модалы
    const [showActionModal, setShowActionModal] = useState(false)
    const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null)
    const [actionType, setActionType] = useState<'approve' | 'reject' | 'block' | 'comment' | 'task'>('comment')
    const [actionForm, setActionForm] = useState({
        comment: '',
        task_title: '',
        task_description: '',
        task_priority: 'medium',
        task_assignee_id: ''
    })
    const [processing, setProcessing] = useState(false)

    // Пользователи для назначения задач
    const [users, setUsers] = useState([])

    useEffect(() => {
        loadWithdrawals()
        loadUsers()
    }, [])

    async function loadWithdrawals() {
        try {
            setLoading(true)
            const response = await fetch('/api/universal/withdrawals')

            if (!response.ok) {
                throw new Error('Ошибка загрузки выводов')
            }

            const data = await response.json()
            setWithdrawals(data.withdrawals || [])
            setStats(data.stats || {})

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

    async function loadUsers() {
        try {
            const response = await fetch('/api/users')
            if (response.ok) {
                const data = await response.json()
                setUsers(data.users?.filter((u: any) => u.status === 'active') || [])
            }
        } catch (error: any) {
            console.error('Ошибка загрузки пользователей:', error)
        }
    }

    async function handleAction() {
        if (!selectedWithdrawal) return

        if (actionType === 'task' && !actionForm.task_title) {
            addToast({
                type: 'error',
                title: 'Заполните название задачи',
                description: 'Название задачи обязательно'
            })
            return
        }

        if ((actionType === 'comment' || actionType === 'block') && !actionForm.comment) {
            addToast({
                type: 'error',
                title: 'Заполните комментарий',
                description: 'Комментарий обязателен'
            })
            return
        }

        try {
            setProcessing(true)

            const requestData: any = {
                action: actionType,
                source_type: selectedWithdrawal.source_type,
                comment: actionForm.comment || undefined
            }

            if (actionType === 'task') {
                requestData.create_task = true
                requestData.task_title = actionForm.task_title
                requestData.task_description = actionForm.task_description
                requestData.task_priority = actionForm.task_priority
                requestData.task_assignee_id = actionForm.task_assignee_id || null
            }

            const response = await fetch(`/api/universal/withdrawals/${selectedWithdrawal.id}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Ошибка выполнения действия')
            }

            addToast({
                type: 'success',
                title: 'Действие выполнено',
                description: result.message
            })

            setShowActionModal(false)
            setSelectedWithdrawal(null)
            resetActionForm()
            await loadWithdrawals()

        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Ошибка',
                description: error.message
            })
        } finally {
            setProcessing(false)
        }
    }

    function resetActionForm() {
        setActionForm({
            comment: '',
            task_title: '',
            task_description: '',
            task_priority: 'medium',
            task_assignee_id: ''
        })
    }

    function openActionModal(withdrawal: Withdrawal, action: typeof actionType) {
        setSelectedWithdrawal(withdrawal)
        setActionType(action)
        setShowActionModal(true)
        resetActionForm()

        // Предустановки для создания задач
        if (action === 'task') {
            setActionForm({
                ...actionForm,
                task_title: `Разблокировка аккаунта: ${withdrawal.casino_name}`,
                task_description: `Необходимо разблокировать аккаунт для пользователя ${withdrawal.user_name}\n\nВывод: ${withdrawal.amount} ${withdrawal.currency || 'USD'}\nКазино: ${withdrawal.casino_name}\n\nТребуется:\n- Анализ причин блокировки\n- Подготовка документов\n- Оценка шансов разблокировки\n- Расчет стоимости процедуры`
            })
        }
    }

    // Получение статуса в зависимости от роли и типа вывода
    function getWithdrawalStatus(withdrawal: Withdrawal): { status: string, color: string } {
        if (withdrawal.source_type === 'paypal') {
            if (userRole === 'teamlead' && withdrawal.teamlead_status) {
                return {
                    status: withdrawal.teamlead_status === 'approved' ? 'Одобрен TL' :
                        withdrawal.teamlead_status === 'rejected' ? 'Отклонен TL' : 'Ожидает TL',
                    color: withdrawal.teamlead_status === 'approved' ? 'green' :
                        withdrawal.teamlead_status === 'rejected' ? 'red' : 'yellow'
                }
            } else if (withdrawal.manager_status) {
                return {
                    status: withdrawal.manager_status === 'approved' ? 'Одобрен' :
                        withdrawal.manager_status === 'rejected' ? 'Отклонен' : 'Ожидает',
                    color: withdrawal.manager_status === 'approved' ? 'green' :
                        withdrawal.manager_status === 'rejected' ? 'red' : 'yellow'
                }
            }
            return { status: 'Ожидает', color: 'yellow' }
        } else {
            // Regular withdrawals
            return {
                status: withdrawal.status === 'received' ? 'Получен' :
                    withdrawal.status === 'problem' ? 'Проблема' :
                        withdrawal.status === 'block' ? 'Заблокирован' :
                            withdrawal.status === 'waiting' ? 'Ожидает' : 'Новый',
                color: withdrawal.status === 'received' ? 'green' :
                    withdrawal.status === 'problem' ? 'red' :
                        withdrawal.status === 'block' ? 'red' : 'yellow'
            }
        }
    }

    const columns: Column<Withdrawal>[] = [
        {
            key: 'user',
            label: 'Пользователь',
            render: (withdrawal) => (
                <div>
                    <div className="font-medium text-gray-900">{withdrawal.user_name}</div>
                    <div className="text-sm text-gray-500">{withdrawal.user_email}</div>
                    {withdrawal.user_telegram && (
                        <div className="text-xs text-blue-600">@{withdrawal.user_telegram}</div>
                    )}
                </div>
            )
        },
        {
            key: 'amount',
            label: 'Сумма',
            render: (withdrawal) => {
                const usdAmount = convertToUSD(withdrawal.amount, withdrawal.currency || 'USD')
                const profit = usdAmount - convertToUSD(withdrawal.deposit_amount, withdrawal.currency || 'USD')

                return (
                    <div>
                        <div className="font-medium text-gray-900">
                            {withdrawal.amount.toFixed(2)} {withdrawal.currency || 'USD'}
                        </div>
                        <div className="text-sm text-gray-500">
                            ${usdAmount.toFixed(2)} USD
                        </div>
                        <div className={`text-xs ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            Профит: ${profit.toFixed(2)}
                        </div>
                    </div>
                )
            }
        },
        {
            key: 'source',
            label: 'Источник',
            render: (withdrawal) => (
                <div>
                    <div className="font-medium text-gray-900">
                        {withdrawal.source_type === 'paypal' ? 'PayPal' : 'Карта'}
                    </div>
                    <div className="text-sm text-gray-500">
                        {withdrawal.source_type === 'paypal'
                            ? withdrawal.paypal_name
                            : `${withdrawal.card_mask} (${withdrawal.card_type})`
                        }
                    </div>
                    <div className="text-xs text-gray-500">
                        {withdrawal.source_type === 'paypal'
                            ? withdrawal.paypal_email
                            : withdrawal.bank_name
                        }
                    </div>
                </div>
            )
        },
        {
            key: 'casino',
            label: 'Казино',
            render: (withdrawal) => (
                <div>
                    <div className="font-medium text-gray-900">{withdrawal.casino_name}</div>
                    <div className="text-sm text-gray-500">{withdrawal.casino_company}</div>
                    <div className="text-xs text-gray-500">{withdrawal.casino_login}</div>
                </div>
            )
        },
        {
            key: 'status',
            label: 'Статус',
            render: (withdrawal) => {
                const { status, color } = getWithdrawalStatus(withdrawal)
                return (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color === 'green' ? 'bg-green-100 text-green-800' :
                            color === 'red' ? 'bg-red-100 text-red-800' :
                                color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                        }`}>
                        {status}
                    </span>
                )
            }
        },
        {
            key: 'comments',
            label: 'Комментарии',
            render: (withdrawal) => {
                const comments = [
                    withdrawal.manager_comment && `Manager: ${withdrawal.manager_comment}`,
                    withdrawal.teamlead_comment && `Team Lead: ${withdrawal.teamlead_comment}`,
                    withdrawal.hr_comment && `HR: ${withdrawal.hr_comment}`,
                    withdrawal.cfo_comment && `CFO: ${withdrawal.cfo_comment}`
                ].filter(Boolean)

                return (
                    <div className="max-w-xs">
                        {comments.length > 0 ? (
                            <div className="space-y-1">
                                {comments.slice(0, 2).map((comment, index) => (
                                    <div key={index} className="text-xs text-gray-600 truncate">
                                        {comment}
                                    </div>
                                ))}
                                {comments.length > 2 && (
                                    <div className="text-xs text-gray-500">+{comments.length - 2} комментариев</div>
                                )}
                            </div>
                        ) : (
                            <span className="text-gray-500 text-sm">Нет комментариев</span>
                        )}
                    </div>
                )
            }
        },
        {
            key: 'date',
            label: 'Дата',
            render: (withdrawal) => (
                <div className="text-sm text-gray-600">
                    {new Date(withdrawal.created_at).toLocaleDateString('ru-RU')}
                </div>
            )
        }
    ]

    // Определяем доступные действия по ролям
    const getActions = (): ActionButton<Withdrawal>[] => {
        const baseActions: ActionButton<Withdrawal>[] = [
            {
                label: 'Просмотр',
                action: (w) => openActionModal(w, 'comment'),
                variant: 'secondary',
                icon: EyeIcon
            }
        ]

        if (userRole === 'manager' || userRole === 'teamlead') {
            baseActions.push(
                {
                    label: 'Одобрить',
                    action: (w) => openActionModal(w, 'approve'),
                    variant: 'success',
                    icon: CheckCircleIcon,
                    condition: (w) => !['received', 'approved'].includes(w.status)
                },
                {
                    label: 'Отклонить',
                    action: (w) => openActionModal(w, 'reject'),
                    variant: 'danger',
                    icon: XMarkIcon,
                    condition: (w) => !['received', 'approved', 'problem', 'rejected'].includes(w.status)
                }
            )
        }

        if (['hr', 'admin', 'cfo'].includes(userRole)) {
            baseActions.push(
                {
                    label: 'Заблокировать',
                    action: (w) => openActionModal(w, 'block'),
                    variant: 'danger',
                    icon: ExclamationTriangleIcon,
                    condition: (w) => w.status !== 'block'
                },
                {
                    label: 'Создать задачу',
                    action: (w) => openActionModal(w, 'task'),
                    variant: 'primary',
                    icon: ClipboardDocumentListIcon
                }
            )
        }

        baseActions.push({
            label: 'Комментарий',
            action: (w) => openActionModal(w, 'comment'),
            variant: 'secondary',
            icon: ChatBubbleLeftIcon
        })

        return baseActions
    }

    // Фильтрация выводов
    const filteredWithdrawals = withdrawals.filter(withdrawal => {
        if (statusFilter !== 'all') {
            const { status } = getWithdrawalStatus(withdrawal)
            if (!status.toLowerCase().includes(statusFilter.toLowerCase())) return false
        }

        if (sourceFilter !== 'all' && withdrawal.source_type !== sourceFilter) return false

        if (dateFilter !== 'all') {
            const withdrawalDate = new Date(withdrawal.created_at)
            const today = new Date()
            const diffDays = Math.ceil((today.getTime() - withdrawalDate.getTime()) / (1000 * 60 * 60 * 24))

            if (dateFilter === 'today' && diffDays > 1) return false
            if (dateFilter === 'week' && diffDays > 7) return false
            if (dateFilter === 'month' && diffDays > 30) return false
        }

        return true
    })

    // Заголовки по ролям
    const roleInfo = {
        manager: {
            title: 'Очередь выводов',
            description: 'Manager: одобрение/отклонение выводов всех Junior\'ов',
            color: 'blue'
        },
        teamlead: {
            title: 'Выводы команды',
            description: 'Team Lead: управление выводами своих Junior\'ов',
            color: 'green'
        },
        hr: {
            title: 'HR: Контроль выводов',
            description: 'HR: мониторинг, комментарии и блокировка подозрительных выводов',
            color: 'purple'
        },
        admin: {
            title: 'Admin: Все выводы',
            description: 'Admin: полный контроль всех выводов и создание задач',
            color: 'red'
        },
        cfo: {
            title: 'CFO: Финансовый контроль',
            description: 'CFO: финансовый мониторинг и контроль выводов',
            color: 'orange'
        }
    }

    const currentRoleInfo = roleInfo[userRole]

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{currentRoleInfo.title}</h1>
                    <p className="text-gray-600">{currentRoleInfo.description}</p>
                </div>
            </div>

            {/* Информация о правах */}
            <div className={`bg-${currentRoleInfo.color}-50 border border-${currentRoleInfo.color}-200 rounded-lg p-4`}>
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <CurrencyDollarIcon className={`h-5 w-5 text-${currentRoleInfo.color}-400`} />
                    </div>
                    <div className="ml-3">
                        <h3 className={`text-sm font-medium text-${currentRoleInfo.color}-800`}>
                            Права доступа {userRole.toUpperCase()}
                        </h3>
                        <div className={`mt-2 text-sm text-${currentRoleInfo.color}-700`}>
                            {userRole === 'manager' && (
                                <>
                                    <p>• Одобрение/отклонение выводов всех Junior'ов</p>
                                    <p>• Комментирование и блокировка аккаунтов</p>
                                    <p>• Создание задач по проблемным выводам</p>
                                </>
                            )}
                            {userRole === 'teamlead' && (
                                <>
                                    <p>• Одобрение/отклонение выводов своих Junior'ов</p>
                                    <p>• Комментирование выводов команды</p>
                                    <p>• Контроль только подчиненных</p>
                                </>
                            )}
                            {userRole === 'hr' && (
                                <>
                                    <p>• Просмотр всех выводов для мониторинга</p>
                                    <p>• Комментирование и блокировка подозрительных</p>
                                    <p>• Создание задач по разблокировке аккаунтов</p>
                                </>
                            )}
                            {userRole === 'cfo' && (
                                <>
                                    <p>• Финансовый контроль всех выводов</p>
                                    <p>• Блокировка подозрительных операций</p>
                                    <p>• Создание задач по финансовому анализу</p>
                                </>
                            )}
                            {userRole === 'admin' && (
                                <>
                                    <p>• Полный контроль всех выводов</p>
                                    <p>• Все возможности: одобрение, блокировка, задачи</p>
                                    <p>• Системное администрирование</p>
                                </>
                            )}
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
                        <option value="ожидает">Ожидающие</option>
                        <option value="одобрен">Одобренные</option>
                        <option value="отклонен">Отклоненные</option>
                        <option value="заблокирован">Заблокированные</option>
                    </select>
                </div>
                <div>
                    <label className="form-label">Источник</label>
                    <select
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value)}
                        className="form-input"
                    >
                        <option value="all">Все источники</option>
                        <option value="regular">Карты</option>
                        <option value="paypal">PayPal</option>
                    </select>
                </div>
                <div>
                    <label className="form-label">Период</label>
                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="form-input"
                    >
                        <option value="all">Все время</option>
                        <option value="today">Сегодня</option>
                        <option value="week">Неделя</option>
                        <option value="month">Месяц</option>
                    </select>
                </div>
            </div>

            {/* Статистика */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <KPICard
                    title="Всего выводов"
                    value={stats.total_withdrawals || 0}
                    icon={<CurrencyDollarIcon className="h-6 w-6" />}
                    color="primary"
                />
                <KPICard
                    title="Ожидают"
                    value={stats.pending_withdrawals || 0}
                    icon={<ClockIcon className="h-6 w-6" />}
                    color="warning"
                />
                <KPICard
                    title="Одобрены"
                    value={stats.approved_withdrawals || 0}
                    icon={<CheckCircleIcon className="h-6 w-6" />}
                    color="success"
                />
                <KPICard
                    title="Карты"
                    value={stats.regular_withdrawals || 0}
                    icon={<CurrencyDollarIcon className="h-6 w-6" />}
                    color="primary"
                />
                <KPICard
                    title="PayPal"
                    value={stats.paypal_withdrawals || 0}
                    icon={<UserIcon className="h-6 w-6" />}
                    color="primary"
                />
            </div>

            {/* Таблица выводов */}
            <div className="card">
                <div className="card-header">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Выводы ({filteredWithdrawals.length})
                    </h3>
                </div>

                <DataTable
                    data={filteredWithdrawals}
                    columns={columns}
                    actions={getActions()}
                    loading={loading}
                    pagination={{ pageSize: 25 }}
                    filtering={true}
                    exportable={true}
                    emptyMessage="Выводы не найдены"
                />
            </div>

            {/* Modal действий */}
            <Modal
                isOpen={showActionModal}
                onClose={() => setShowActionModal(false)}
                title={`${actionType === 'approve' ? 'Одобрить' :
                    actionType === 'reject' ? 'Отклонить' :
                        actionType === 'block' ? 'Заблокировать' :
                            actionType === 'task' ? 'Создать задачу' : 'Комментировать'} вывод`}
                size="lg"
            >
                {selectedWithdrawal && (
                    <div className="space-y-4">
                        {/* Информация о выводе */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-medium text-gray-900 mb-2">Информация о выводе:</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-600">Пользователь:</span>
                                    <div className="font-medium">{selectedWithdrawal.user_name}</div>
                                </div>
                                <div>
                                    <span className="text-gray-600">Сумма:</span>
                                    <div className="font-medium">{selectedWithdrawal.amount} {selectedWithdrawal.currency || 'USD'}</div>
                                </div>
                                <div>
                                    <span className="text-gray-600">Казино:</span>
                                    <div className="font-medium">{selectedWithdrawal.casino_name}</div>
                                </div>
                                <div>
                                    <span className="text-gray-600">Источник:</span>
                                    <div className="font-medium">{selectedWithdrawal.source_type === 'paypal' ? 'PayPal' : 'Карта'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Форма действия */}
                        {actionType === 'task' ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="form-label">Название задачи *</label>
                                    <input
                                        type="text"
                                        value={actionForm.task_title}
                                        onChange={(e) => setActionForm({ ...actionForm, task_title: e.target.value })}
                                        className="form-input"
                                        placeholder="Разблокировка аккаунта..."
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Описание задачи</label>
                                    <textarea
                                        value={actionForm.task_description}
                                        onChange={(e) => setActionForm({ ...actionForm, task_description: e.target.value })}
                                        className="form-input"
                                        rows={4}
                                        placeholder="Подробное описание необходимых действий..."
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="form-label">Приоритет</label>
                                        <select
                                            value={actionForm.task_priority}
                                            onChange={(e) => setActionForm({ ...actionForm, task_priority: e.target.value })}
                                            className="form-input"
                                        >
                                            <option value="low">Низкий</option>
                                            <option value="medium">Средний</option>
                                            <option value="high">Высокий</option>
                                            <option value="urgent">Срочный</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="form-label">Назначить</label>
                                        <select
                                            value={actionForm.task_assignee_id}
                                            onChange={(e) => setActionForm({ ...actionForm, task_assignee_id: e.target.value })}
                                            className="form-input"
                                        >
                                            <option value="">Без назначения</option>
                                            {users.map((user: any) => (
                                                <option key={user.id} value={user.id}>
                                                    {`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email} ({user.role})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label className="form-label">
                                    {actionType === 'comment' ? 'Комментарий' :
                                        actionType === 'block' ? 'Причина блокировки' : 'Комментарий к действию'}
                                </label>
                                <textarea
                                    value={actionForm.comment}
                                    onChange={(e) => setActionForm({ ...actionForm, comment: e.target.value })}
                                    className="form-input"
                                    rows={3}
                                    placeholder={
                                        actionType === 'block' ? 'Укажите причину блокировки и необходимые документы для разблокировки...' :
                                            actionType === 'approve' ? 'Комментарий к одобрению (опционально)...' :
                                                actionType === 'reject' ? 'Причина отклонения...' :
                                                    'Ваш комментарий...'
                                    }
                                />
                            </div>
                        )}

                        <div className="flex justify-end space-x-3 pt-4">
                            <button
                                onClick={() => setShowActionModal(false)}
                                className="btn-secondary"
                                disabled={processing}
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleAction}
                                className={`${actionType === 'approve' ? 'btn-success' :
                                        actionType === 'reject' ? 'btn-danger' :
                                            actionType === 'block' ? 'btn-danger' :
                                                actionType === 'task' ? 'btn-primary' : 'btn-primary'
                                    }`}
                                disabled={processing}
                            >
                                {processing ? 'Обработка...' :
                                    actionType === 'approve' ? 'Одобрить' :
                                        actionType === 'reject' ? 'Отклонить' :
                                            actionType === 'block' ? 'Заблокировать' :
                                                actionType === 'task' ? 'Создать задачу' : 'Добавить комментарий'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}

export default UniversalWithdrawalsPage
