'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column, ActionButton } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import Modal from '@/components/ui/Modal'
import {
    ComputerDesktopIcon,
    UserIcon,
    CheckCircleIcon,
    PlusIcon,
    XMarkIcon
} from '@heroicons/react/24/outline'

interface JuniorCasinoAssignment {
    id: string
    assigned_at: string
    is_active: boolean
    notes?: string
    casino: {
        id: string
        name: string
        url: string
        status: string
    }
    junior: {
        id: string
        email: string
        first_name?: string
        last_name?: string
        status: string
    }
}

export default function TeamLeadCasinoAssignmentsPage() {
    const { addToast } = useToast()
    const [assignments, setAssignments] = useState<JuniorCasinoAssignment[]>([])
    const [loading, setLoading] = useState(true)

    // Модал назначения
    const [showAssignModal, setShowAssignModal] = useState(false)
    const [teamJuniors, setTeamJuniors] = useState([])
    const [assignedCasinos, setAssignedCasinos] = useState([])
    const [assigning, setAssigning] = useState(false)
    const [assignForm, setAssignForm] = useState({
        junior_id: '',
        casino_id: '',
        notes: ''
    })

    useEffect(() => {
        loadAssignments()
    }, [])

    async function loadAssignments() {
        try {
            setLoading(true)
            const response = await fetch('/api/teamlead/junior-casino-assignments')

            if (!response.ok) {
                throw new Error('Ошибка загрузки назначений')
            }

            const data = await response.json()
            setAssignments(data.assignments || [])

        } catch (error: any) {
            console.error('Ошибка загрузки назначений:', error)
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
            // Загружаем Junior'ов команды
            const teamResponse = await fetch('/api/teamlead/team')
            if (teamResponse.ok) {
                const { team } = await teamResponse.json()
                setTeamJuniors(team.filter((member: any) => member.role === 'junior'))
            }

            // Загружаем назначенные казино
            const casinosResponse = await fetch('/api/teamlead/assigned-casinos')
            if (casinosResponse.ok) {
                const { casinos } = await casinosResponse.json()
                setAssignedCasinos(casinos)
            }

        } catch (error: any) {
            console.error('Ошибка загрузки данных для назначения:', error)
            addToast({
                type: 'error',
                title: 'Ошибка загрузки данных',
                description: error.message
            })
        }
    }

    async function handleAssignJunior() {
        if (!assignForm.junior_id || !assignForm.casino_id) {
            addToast({
                type: 'error',
                title: 'Заполните все поля',
                description: 'Выберите Junior\'а и казино'
            })
            return
        }

        try {
            setAssigning(true)
            const response = await fetch('/api/teamlead/assign-junior-to-casino', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(assignForm)
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка назначения Junior\'а')
            }

            addToast({
                type: 'success',
                title: 'Junior назначен',
                description: data.message
            })

            setShowAssignModal(false)
            setAssignForm({ junior_id: '', casino_id: '', notes: '' })
            await loadAssignments()

        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Ошибка назначения',
                description: error.message
            })
        } finally {
            setAssigning(false)
        }
    }

    async function handleRevokeAssignment(assignmentId: string) {
        if (!confirm('Вы уверены, что хотите отозвать это назначение?')) {
            return
        }

        try {
            const response = await fetch('/api/teamlead/junior-casino-assignments', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignment_id: assignmentId })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка отзыва назначения')
            }

            addToast({
                type: 'success',
                title: 'Назначение отозвано',
                description: data.message
            })

            await loadAssignments()

        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Ошибка отзыва',
                description: error.message
            })
        }
    }

    const columns: Column<JuniorCasinoAssignment>[] = [
        {
            key: 'junior',
            label: 'Junior',
            render: (assignment) => (
                <div>
                    <div className="font-medium text-gray-900">
                        {`${assignment.junior.first_name || ''} ${assignment.junior.last_name || ''}`.trim() || assignment.junior.email}
                    </div>
                    <div className="text-sm text-gray-500">{assignment.junior.email}</div>
                </div>
            )
        },
        {
            key: 'casino',
            label: 'Казино',
            render: (assignment) => (
                <div>
                    <div className="font-medium text-gray-900">{assignment.casino.name}</div>
                    <div className="text-sm text-blue-600">{assignment.casino.url}</div>
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

    const actions: ActionButton<JuniorCasinoAssignment>[] = [
        {
            label: 'Отозвать',
            action: (assignment) => handleRevokeAssignment(assignment.id),
            variant: 'danger',
            icon: XMarkIcon
        }
    ]

    // Получаем уникальные Junior'ы и казино
    const uniqueJuniors = new Set(assignments.map(a => a.junior.id)).size
    const uniqueCasinos = new Set(assignments.map(a => a.casino.id)).size

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Назначения Junior'ов к казино</h1>
                    <p className="text-gray-600">Управление назначениями вашей команды к казино</p>
                </div>
                <button
                    onClick={() => {
                        setShowAssignModal(true)
                        loadAssignModalData()
                    }}
                    className="btn-primary"
                >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Назначить Junior'а
                </button>
            </div>

            {/* Информация о назначениях */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <ComputerDesktopIcon className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">
                            Назначения Junior'ов к казино
                        </h3>
                        <div className="mt-2 text-sm text-green-700">
                            <p>• Назначайте Junior'ов только к казино, выделенным вашей команде</p>
                            <p>• Junior может быть назначен к одному казино только один раз</p>
                            <p>• После назначения Junior сможет создавать работы в этом казино</p>
                            <p>• Вы можете отозвать назначение в любой момент</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Статистика */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KPICard
                    title="Всего назначений"
                    value={assignments.length}
                    icon={<CheckCircleIcon className="h-6 w-6" />}
                    color="primary"
                />
                <KPICard
                    title="Junior'ов в работе"
                    value={uniqueJuniors}
                    icon={<UserIcon className="h-6 w-6" />}
                    color="success"
                />
                <KPICard
                    title="Казино в работе"
                    value={uniqueCasinos}
                    icon={<ComputerDesktopIcon className="h-6 w-6" />}
                    color="warning"
                />
            </div>

            {/* Таблица назначений */}
            <div className="card">
                <div className="card-header">
                    <h3 className="text-lg font-semibold text-gray-900">Активные назначения</h3>
                </div>

                <DataTable
                    data={assignments}
                    columns={columns}
                    actions={actions}
                    loading={loading}
                    pagination={{ pageSize: 20 }}
                    filtering={true}
                    exportable={true}
                    emptyMessage="Назначения не найдены"
                />
            </div>

            {/* Modal назначения Junior'а */}
            <Modal
                isOpen={showAssignModal}
                onClose={() => setShowAssignModal(false)}
                title="Назначить Junior'а к казино"
                size="lg"
            >
                <div className="space-y-4">
                    {/* Выбор Junior'а */}
                    <div>
                        <label className="form-label">Junior из команды *</label>
                        <select
                            value={assignForm.junior_id}
                            onChange={(e) => setAssignForm({ ...assignForm, junior_id: e.target.value })}
                            className="form-input"
                            required
                        >
                            <option value="">Выберите Junior'а</option>
                            {teamJuniors.map((junior: any) => (
                                <option key={junior.id} value={junior.id}>
                                    {`${junior.first_name || ''} ${junior.last_name || ''}`.trim() || junior.email}
                                </option>
                            ))}
                        </select>
                        <p className="text-sm text-gray-500 mt-1">
                            Junior'ов в команде: {teamJuniors.length}
                        </p>
                    </div>

                    {/* Выбор казино */}
                    <div>
                        <label className="form-label">Назначенное казино *</label>
                        <select
                            value={assignForm.casino_id}
                            onChange={(e) => setAssignForm({ ...assignForm, casino_id: e.target.value })}
                            className="form-input"
                            required
                        >
                            <option value="">Выберите казино</option>
                            {assignedCasinos.map((assignment: any) => (
                                <option key={assignment.casino.id} value={assignment.casino.id}>
                                    {assignment.casino.name}
                                </option>
                            ))}
                        </select>
                        <p className="text-sm text-gray-500 mt-1">
                            Назначенных казино: {assignedCasinos.length}
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
                            placeholder="Дополнительные заметки о назначении..."
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
                            onClick={handleAssignJunior}
                            className="btn-primary"
                            disabled={assigning || !assignForm.junior_id || !assignForm.casino_id}
                        >
                            {assigning ? 'Назначение...' : 'Назначить Junior\'а'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
