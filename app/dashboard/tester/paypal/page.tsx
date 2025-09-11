'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column, ActionButton } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import Modal from '@/components/ui/Modal'
import StatusBadge from '@/components/ui/StatusBadge'
import {
    CreditCardIcon,
    ComputerDesktopIcon,
    CheckCircleIcon,
    PlusIcon,
    XMarkIcon,
    ClockIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface PayPalCasinoAssignment {
    id: string
    assigned_at: string
    is_active: boolean
    test_result: 'pending' | 'success' | 'failed'
    notes?: string
    deposit_test_amount?: number
    deposit_test_success?: boolean
    withdrawal_test_amount?: number
    withdrawal_test_success?: boolean
    test_completed_at?: string
    casino: {
        id: string
        name: string
        url: string
        paypal_compatible: boolean
        paypal_notes?: string
    }
    paypal_account: {
        id: string
        name: string
        email: string
        status: string
        user: {
            email: string
            first_name?: string
            last_name?: string
        }
    }
}

export default function TesterPayPalPage() {
    const { addToast } = useToast()
    const [assignments, setAssignments] = useState<PayPalCasinoAssignment[]>([])
    const [loading, setLoading] = useState(true)

    // Модал создания отметки
    const [showAssignModal, setShowAssignModal] = useState(false)
    const [casinos, setCasinos] = useState([])
    const [paypalAccounts, setPaypalAccounts] = useState([])
    const [assigning, setAssigning] = useState(false)
    const [assignForm, setAssignForm] = useState({
        casino_id: '',
        paypal_account_id: '',
        notes: ''
    })

    // Модал обновления результата
    const [showTestModal, setShowTestModal] = useState(false)
    const [selectedAssignment, setSelectedAssignment] = useState<PayPalCasinoAssignment | null>(null)
    const [updating, setUpdating] = useState(false)
    const [testForm, setTestForm] = useState({
        test_result: 'pending',
        deposit_test_amount: '',
        deposit_test_success: false,
        withdrawal_test_amount: '',
        withdrawal_test_success: false,
        notes: ''
    })

    useEffect(() => {
        loadAssignments()
    }, [])

    async function loadAssignments() {
        try {
            setLoading(true)
            const response = await fetch('/api/tester/paypal-casino-assignments')

            if (!response.ok) {
                throw new Error('Ошибка загрузки PayPal отметок')
            }

            const data = await response.json()
            setAssignments(data.assignments || [])

        } catch (error: any) {
            console.error('Ошибка загрузки PayPal отметок:', error)
            addToast({
                type: 'error',
                title: 'Ошибка загрузки данных',
                description: error.message
            })
        } finally {
            setLoading(false)
        }
    }

    async function loadAssignModalData() {
        try {
            // Загружаем казино
            const casinosResponse = await fetch('/api/casinos')
            if (casinosResponse.ok) {
                const { casinos } = await casinosResponse.json()
                setCasinos(casinos)
            }

            // Загружаем PayPal аккаунты
            const paypalResponse = await fetch('/api/paypal/accounts')
            if (paypalResponse.ok) {
                const { accounts } = await paypalResponse.json()
                setPaypalAccounts(accounts.filter((acc: any) => acc.status === 'active'))
            }

        } catch (error: any) {
            console.error('Ошибка загрузки данных для отметки:', error)
        }
    }

    async function handleCreateAssignment() {
        if (!assignForm.casino_id || !assignForm.paypal_account_id) {
            addToast({
                type: 'error',
                title: 'Заполните все поля',
                description: 'Выберите казино и PayPal аккаунт'
            })
            return
        }

        try {
            setAssigning(true)
            const response = await fetch('/api/tester/paypal-casino-assignments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(assignForm)
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка создания отметки')
            }

            addToast({
                type: 'success',
                title: 'Отметка создана',
                description: data.message
            })

            setShowAssignModal(false)
            setAssignForm({ casino_id: '', paypal_account_id: '', notes: '' })
            await loadAssignments()

        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Ошибка создания отметки',
                description: error.message
            })
        } finally {
            setAssigning(false)
        }
    }

    function handleUpdateTest(assignment: PayPalCasinoAssignment) {
        setSelectedAssignment(assignment)
        setTestForm({
            test_result: assignment.test_result,
            deposit_test_amount: assignment.deposit_test_amount?.toString() || '',
            deposit_test_success: assignment.deposit_test_success || false,
            withdrawal_test_amount: assignment.withdrawal_test_amount?.toString() || '',
            withdrawal_test_success: assignment.withdrawal_test_success || false,
            notes: assignment.notes || ''
        })
        setShowTestModal(true)
    }

    async function handleSubmitTest() {
        if (!selectedAssignment) return

        try {
            setUpdating(true)
            const response = await fetch('/api/tester/paypal-casino-assignments', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assignment_id: selectedAssignment.id,
                    test_result: testForm.test_result,
                    deposit_test_amount: testForm.deposit_test_amount ? parseFloat(testForm.deposit_test_amount) : null,
                    deposit_test_success: testForm.deposit_test_success,
                    withdrawal_test_amount: testForm.withdrawal_test_amount ? parseFloat(testForm.withdrawal_test_amount) : null,
                    withdrawal_test_success: testForm.withdrawal_test_success,
                    notes: testForm.notes
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка обновления результата')
            }

            addToast({
                type: 'success',
                title: 'Результат обновлен',
                description: data.message
            })

            setShowTestModal(false)
            setSelectedAssignment(null)
            await loadAssignments()

        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Ошибка обновления',
                description: error.message
            })
        } finally {
            setUpdating(false)
        }
    }

    const columns: Column<PayPalCasinoAssignment>[] = [
        {
            key: 'casino',
            label: 'Казино',
            render: (assignment) => (
                <div>
                    <div className="font-medium text-gray-900">{assignment.casino.name}</div>
                    <div className="text-sm text-blue-600">{assignment.casino.url}</div>
                    <div className="text-xs text-gray-500">
                        PayPal: {assignment.casino.paypal_compatible ? '✅ Поддерживается' : '❌ Не поддерживается'}
                    </div>
                </div>
            )
        },
        {
            key: 'paypal_account',
            label: 'PayPal аккаунт',
            render: (assignment) => (
                <div>
                    <div className="font-medium text-gray-900">{assignment.paypal_account.name}</div>
                    <div className="text-sm text-gray-500">{assignment.paypal_account.email}</div>
                    <div className="text-xs text-blue-600">
                        {`${assignment.paypal_account.user.first_name || ''} ${assignment.paypal_account.user.last_name || ''}`.trim() || assignment.paypal_account.user.email}
                    </div>
                </div>
            )
        },
        {
            key: 'test_result',
            label: 'Результат теста',
            render: (assignment) => (
                <div>
                    <StatusBadge status={assignment.test_result} />
                    {assignment.test_completed_at && (
                        <div className="text-xs text-gray-500 mt-1">
                            {new Date(assignment.test_completed_at).toLocaleDateString('ru-RU')}
                        </div>
                    )}
                </div>
            )
        },
        {
            key: 'test_details',
            label: 'Детали тестов',
            render: (assignment) => (
                <div className="text-sm">
                    {assignment.deposit_test_amount && (
                        <div className="flex items-center space-x-1">
                            <span>Депозит: ${assignment.deposit_test_amount}</span>
                            {assignment.deposit_test_success ? (
                                <span className="text-green-600">✅</span>
                            ) : (
                                <span className="text-red-600">❌</span>
                            )}
                        </div>
                    )}
                    {assignment.withdrawal_test_amount && (
                        <div className="flex items-center space-x-1">
                            <span>Вывод: ${assignment.withdrawal_test_amount}</span>
                            {assignment.withdrawal_test_success ? (
                                <span className="text-green-600">✅</span>
                            ) : (
                                <span className="text-red-600">❌</span>
                            )}
                        </div>
                    )}
                    {!assignment.deposit_test_amount && !assignment.withdrawal_test_amount && (
                        <span className="text-gray-500">Тесты не проведены</span>
                    )}
                </div>
            )
        },
        {
            key: 'assigned_at',
            label: 'Назначено',
            render: (assignment) => (
                <span className="text-sm text-gray-500">
                    {new Date(assignment.assigned_at).toLocaleDateString('ru-RU')}
                </span>
            )
        },
        {
            key: 'notes',
            label: 'Заметки',
            render: (assignment) => (
                <span className="text-sm text-gray-600">
                    {assignment.notes || 'Нет заметок'}
                </span>
            )
        }
    ]

    const actions: ActionButton<PayPalCasinoAssignment>[] = [
        {
            label: 'Обновить тест',
            action: handleUpdateTest,
            variant: 'primary'
        }
    ]

    // Статистика
    const pendingTests = assignments.filter(a => a.test_result === 'pending')
    const successfulTests = assignments.filter(a => a.test_result === 'success')
    const failedTests = assignments.filter(a => a.test_result === 'failed')

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">PayPal отметки для казино</h1>
                    <p className="text-gray-600">Тестирование совместимости PayPal аккаунтов с казино</p>
                </div>
                <button
                    onClick={() => {
                        setShowAssignModal(true)
                        loadAssignModalData()
                    }}
                    className="btn-primary"
                >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Назначить для теста
                </button>
            </div>

            {/* Информация о PayPal тестировании */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <CreditCardIcon className="h-5 w-5 text-purple-400" />
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-purple-800">
                            PayPal тестирование (аналог BIN отметок)
                        </h3>
                        <div className="mt-2 text-sm text-purple-700">
                            <p>• Назначайте PayPal аккаунты для тестирования с казино</p>
                            <p>• Проводите тесты депозитов и выводов</p>
                            <p>• Отмечайте совместимость казино с PayPal</p>
                            <p>• Результаты помогают Junior'ам выбирать подходящие аккаунты</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Статистика */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KPICard
                    title="Всего отметок"
                    value={assignments.length}
                    icon={<CreditCardIcon className="h-6 w-6" />}
                    color="primary"
                />
                <KPICard
                    title="Ожидают теста"
                    value={pendingTests.length}
                    icon={<ClockIcon className="h-6 w-6" />}
                    color="warning"
                />
                <KPICard
                    title="Успешных тестов"
                    value={successfulTests.length}
                    icon={<CheckCircleIcon className="h-6 w-6" />}
                    color="success"
                />
                <KPICard
                    title="Неудачных тестов"
                    value={failedTests.length}
                    icon={<ExclamationTriangleIcon className="h-6 w-6" />}
                    color="danger"
                />
            </div>

            {/* Таблица отметок */}
            <div className="card">
                <div className="card-header">
                    <h3 className="text-lg font-semibold text-gray-900">PayPal отметки казино</h3>
                </div>

                <DataTable
                    data={assignments}
                    columns={columns}
                    actions={actions}
                    loading={loading}
                    pagination={{ pageSize: 20 }}
                    filtering={true}
                    exportable={true}
                    emptyMessage="PayPal отметки не найдены"
                />
            </div>

            {/* Modal создания отметки */}
            <Modal
                isOpen={showAssignModal}
                onClose={() => setShowAssignModal(false)}
                title="Назначить PayPal для тестирования"
                size="lg"
            >
                <div className="space-y-4">
                    {/* Выбор казино */}
                    <div>
                        <label className="form-label">Казино *</label>
                        <select
                            value={assignForm.casino_id}
                            onChange={(e) => setAssignForm({ ...assignForm, casino_id: e.target.value })}
                            className="form-input"
                            required
                        >
                            <option value="">Выберите казино</option>
                            {casinos.map((casino: any) => (
                                <option key={casino.id} value={casino.id}>
                                    {casino.name} {casino.paypal_compatible ? '(PayPal ✅)' : '(PayPal ❌)'}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Выбор PayPal аккаунта */}
                    <div>
                        <label className="form-label">PayPal аккаунт *</label>
                        <select
                            value={assignForm.paypal_account_id}
                            onChange={(e) => setAssignForm({ ...assignForm, paypal_account_id: e.target.value })}
                            className="form-input"
                            required
                        >
                            <option value="">Выберите PayPal аккаунт</option>
                            {paypalAccounts.map((account: any) => (
                                <option key={account.id} value={account.id}>
                                    {account.name} - {account.email} (${account.balance?.toFixed(2) || '0.00'})
                                </option>
                            ))}
                        </select>
                        <p className="text-sm text-gray-500 mt-1">
                            Доступно аккаунтов: {paypalAccounts.length}
                        </p>
                    </div>

                    {/* Заметки */}
                    <div>
                        <label className="form-label">Заметки</label>
                        <textarea
                            value={assignForm.notes}
                            onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                            className="form-input"
                            rows={3}
                            placeholder="Цель тестирования, особенности..."
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            onClick={() => setShowAssignModal(false)}
                            className="btn-secondary"
                            disabled={assigning}
                        >
                            Отмена
                        </button>
                        <button
                            onClick={handleCreateAssignment}
                            className="btn-primary"
                            disabled={assigning || !assignForm.casino_id || !assignForm.paypal_account_id}
                        >
                            {assigning ? 'Назначение...' : 'Назначить для теста'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal обновления результата теста */}
            <Modal
                isOpen={showTestModal}
                onClose={() => {
                    setShowTestModal(false)
                    setSelectedAssignment(null)
                }}
                title="Обновить результат тестирования"
                size="lg"
            >
                {selectedAssignment && (
                    <div className="space-y-4">
                        {/* Информация о тесте */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-medium text-gray-900 mb-2">Информация о тесте</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-600">Казино:</span>
                                    <div className="font-medium">{selectedAssignment.casino.name}</div>
                                </div>
                                <div>
                                    <span className="text-gray-600">PayPal аккаунт:</span>
                                    <div className="font-medium">{selectedAssignment.paypal_account.name}</div>
                                </div>
                            </div>
                        </div>

                        {/* Результат теста */}
                        <div>
                            <label className="form-label">Результат тестирования *</label>
                            <select
                                value={testForm.test_result}
                                onChange={(e) => setTestForm({ ...testForm, test_result: e.target.value })}
                                className="form-input"
                                required
                            >
                                <option value="pending">Ожидает тестирования</option>
                                <option value="success">Успешно</option>
                                <option value="failed">Неудачно</option>
                            </select>
                        </div>

                        {/* Тест депозита */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="form-label">Сумма теста депозита</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={testForm.deposit_test_amount}
                                    onChange={(e) => setTestForm({ ...testForm, deposit_test_amount: e.target.value })}
                                    className="form-input"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="form-label">Результат депозита</label>
                                <select
                                    value={testForm.deposit_test_success.toString()}
                                    onChange={(e) => setTestForm({ ...testForm, deposit_test_success: e.target.value === 'true' })}
                                    className="form-input"
                                >
                                    <option value="false">Неудачно</option>
                                    <option value="true">Успешно</option>
                                </select>
                            </div>
                        </div>

                        {/* Тест вывода */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="form-label">Сумма теста вывода</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={testForm.withdrawal_test_amount}
                                    onChange={(e) => setTestForm({ ...testForm, withdrawal_test_amount: e.target.value })}
                                    className="form-input"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="form-label">Результат вывода</label>
                                <select
                                    value={testForm.withdrawal_test_success.toString()}
                                    onChange={(e) => setTestForm({ ...testForm, withdrawal_test_success: e.target.value === 'true' })}
                                    className="form-input"
                                >
                                    <option value="false">Неудачно</option>
                                    <option value="true">Успешно</option>
                                </select>
                            </div>
                        </div>

                        {/* Заметки */}
                        <div>
                            <label className="form-label">Заметки о тестировании</label>
                            <textarea
                                value={testForm.notes}
                                onChange={(e) => setTestForm({ ...testForm, notes: e.target.value })}
                                className="form-input"
                                rows={3}
                                placeholder="Особенности, проблемы, рекомендации..."
                            />
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                            <button
                                onClick={() => {
                                    setShowTestModal(false)
                                    setSelectedAssignment(null)
                                }}
                                className="btn-secondary"
                                disabled={updating}
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleSubmitTest}
                                className="btn-primary"
                                disabled={updating}
                            >
                                {updating ? 'Сохранение...' : 'Сохранить результат'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}
