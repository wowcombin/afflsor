'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column, ActionButton } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import Modal from '@/components/ui/Modal'
import {
    ClipboardDocumentListIcon,
    PlusIcon,
    CheckCircleIcon,
    UserIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    ArrowDownIcon,
    PencilIcon,
    ChatBubbleLeftIcon
} from '@heroicons/react/24/outline'

interface Task {
    id: string
    title: string
    description?: string
    task_status: string
    priority: string
    due_date?: string
    estimated_hours?: number
    actual_hours: number
    created_at: string
    is_overdue: boolean
    project?: {
        id: string
        title: string
        project_type: string
    }
    assignee?: {
        id: string
        email: string
        first_name?: string
        last_name?: string
        role: string
    }
    created_by_user: {
        email: string
        first_name?: string
        last_name?: string
        role: string
    }
    template_id?: string
}

export default function TeamLeadTasksPage() {
    const { addToast } = useToast()
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('all')
    const [viewMode, setViewMode] = useState<'my-team' | 'all'>('my-team')

    // Модал создания задачи
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [juniors, setJuniors] = useState([])
    const [creating, setCreating] = useState(false)
    const [taskForm, setTaskForm] = useState({
        title: '',
        description: '',
        assignee_id: '',
        priority: 'medium',
        due_date: '',
        estimated_hours: ''
    })

    // Модал делегирования задачи
    const [showDelegateModal, setShowDelegateModal] = useState(false)
    const [selectedTask, setSelectedTask] = useState<Task | null>(null)
    const [delegating, setDelegating] = useState(false)
    const [delegateForm, setDelegateForm] = useState({
        assignee_id: '',
        due_date: '',
        notes: ''
    })

    useEffect(() => {
        loadTasks()
    }, [statusFilter, viewMode])

    async function loadTasks() {
        try {
            setLoading(true)

            // Загружаем задачи для Team Lead (свои + команды)
            let url = '/api/teamlead/tasks'
            const params = new URLSearchParams()
            if (statusFilter !== 'all') params.append('status', statusFilter)
            if (viewMode === 'my-team') params.append('team_only', 'true')
            if (params.toString()) url += '?' + params.toString()

            const response = await fetch(url)

            if (!response.ok) {
                throw new Error('Ошибка загрузки задач')
            }

            const data = await response.json()
            setTasks(data.tasks || [])

        } catch (error: any) {
            console.error('Ошибка загрузки задач Team Lead:', error)
            addToast({
                type: 'error',
                title: 'Ошибка загрузки данных',
                description: error.message
            })
        } finally {
            setLoading(false)
        }
    }

    async function loadJuniors() {
        try {
            const response = await fetch('/api/teamlead/team')
            if (response.ok) {
                const data = await response.json()
                setJuniors(data.juniors || [])
            }
        } catch (error: any) {
            console.error('Ошибка загрузки Junior\'ов:', error)
        }
    }

    async function handleCreateTask() {
        if (!taskForm.title) {
            addToast({
                type: 'error',
                title: 'Заполните название',
                description: 'Название задачи обязательно'
            })
            return
        }

        try {
            setCreating(true)

            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...taskForm,
                    estimated_hours: taskForm.estimated_hours ? parseFloat(taskForm.estimated_hours) : null,
                    tags: ['teamlead_created']
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка создания задачи')
            }

            addToast({
                type: 'success',
                title: 'Задача создана',
                description: data.message
            })

            setShowCreateModal(false)
            resetTaskForm()
            await loadTasks()

        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Ошибка создания',
                description: error.message
            })
        } finally {
            setCreating(false)
        }
    }

    async function handleDelegateTask() {
        if (!selectedTask || !delegateForm.assignee_id) {
            addToast({
                type: 'error',
                title: 'Выберите исполнителя',
                description: 'Необходимо выбрать Junior для делегирования'
            })
            return
        }

        try {
            setDelegating(true)

            const response = await fetch(`/api/tasks/${selectedTask.id}/delegate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assignee_id: delegateForm.assignee_id,
                    due_date: delegateForm.due_date || null,
                    notes: delegateForm.notes || null
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка делегирования задачи')
            }

            addToast({
                type: 'success',
                title: 'Задача делегирована',
                description: `Задача передана Junior'у`
            })

            setShowDelegateModal(false)
            setSelectedTask(null)
            resetDelegateForm()
            await loadTasks()

        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Ошибка делегирования',
                description: error.message
            })
        } finally {
            setDelegating(false)
        }
    }

    async function updateTaskStatus(taskId: string, newStatus: string) {
        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_status: newStatus })
            })

            if (!response.ok) {
                throw new Error('Ошибка обновления статуса')
            }

            addToast({
                type: 'success',
                title: 'Статус обновлен',
                description: `Задача переведена в статус: ${getStatusName(newStatus)}`
            })

            await loadTasks()

        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Ошибка обновления',
                description: error.message
            })
        }
    }

    function resetTaskForm() {
        setTaskForm({
            title: '',
            description: '',
            assignee_id: '',
            priority: 'medium',
            due_date: '',
            estimated_hours: ''
        })
    }

    function resetDelegateForm() {
        setDelegateForm({
            assignee_id: '',
            due_date: '',
            notes: ''
        })
    }

    function openDelegateModal(task: Task) {
        setSelectedTask(task)
        setDelegateForm({
            assignee_id: '',
            due_date: task.due_date || '',
            notes: ''
        })
        setShowDelegateModal(true)
        loadJuniors()
    }

    function getStatusName(status: string): string {
        const statusMap: { [key: string]: string } = {
            'backlog': 'Отложена',
            'todo': 'К выполнению',
            'in_progress': 'В работе',
            'review': 'На проверке',
            'done': 'Выполнена'
        }
        return statusMap[status] || status
    }

    const columns: Column<Task>[] = [
        {
            key: 'title',
            label: 'Задача',
            render: (task) => (
                <div>
                    <div className="font-medium text-gray-900">{task.title}</div>
                    {task.project && (
                        <div className="text-sm text-blue-600">{task.project.title}</div>
                    )}
                    <div className="text-xs text-gray-500">
                        {task.template_id && '📋 Из шаблона'}
                    </div>
                </div>
            )
        },
        {
            key: 'assignee',
            label: 'Исполнитель',
            render: (task) => (
                <div>
                    {task.assignee ? (
                        <>
                            <div className="font-medium text-gray-900">
                                {`${task.assignee.first_name || ''} ${task.assignee.last_name || ''}`.trim() || task.assignee.email}
                            </div>
                            <div className="text-sm text-gray-500">{task.assignee.email}</div>
                            <div className="text-xs text-blue-600 capitalize">{task.assignee.role}</div>
                        </>
                    ) : (
                        <span className="text-orange-600">Не назначена</span>
                    )}
                </div>
            )
        },
        {
            key: 'task_status',
            label: 'Статус',
            render: (task) => (
                <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${task.task_status === 'done'
                            ? 'bg-green-100 text-green-800'
                            : task.task_status === 'in_progress'
                                ? 'bg-blue-100 text-blue-800'
                                : task.task_status === 'review'
                                    ? 'bg-purple-100 text-purple-800'
                                    : task.task_status === 'todo'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-gray-100 text-gray-800'
                        }`}>
                        {getStatusName(task.task_status)}
                    </span>
                    {task.task_status === 'review' && (
                        <div className="mt-1">
                            <button
                                onClick={() => updateTaskStatus(task.id, 'done')}
                                className="text-xs text-green-600 hover:text-green-800"
                            >
                                ✅ Принять
                            </button>
                            <span className="mx-1 text-gray-300">|</span>
                            <button
                                onClick={() => updateTaskStatus(task.id, 'in_progress')}
                                className="text-xs text-orange-600 hover:text-orange-800"
                            >
                                🔄 Доработать
                            </button>
                        </div>
                    )}
                </div>
            )
        },
        {
            key: 'priority',
            label: 'Приоритет',
            render: (task) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${task.priority === 'urgent'
                        ? 'bg-red-100 text-red-800'
                        : task.priority === 'high'
                            ? 'bg-orange-100 text-orange-800'
                            : task.priority === 'medium'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                    }`}>
                    {task.priority === 'urgent' ? 'Срочно' :
                        task.priority === 'high' ? 'Высокий' :
                            task.priority === 'medium' ? 'Средний' : 'Низкий'}
                </span>
            )
        },
        {
            key: 'due_date',
            label: 'Дедлайн',
            render: (task) => {
                if (!task.due_date) {
                    return <span className="text-gray-500">Не указан</span>
                }

                return (
                    <div className={`text-sm ${task.is_overdue ? 'text-red-600' : 'text-gray-600'}`}>
                        <div>{new Date(task.due_date).toLocaleDateString('ru-RU')}</div>
                        {task.is_overdue && (
                            <div className="text-xs text-red-600">⚠️ Просрочена</div>
                        )}
                    </div>
                )
            }
        }
    ]

    const actions: ActionButton<Task>[] = [
        {
            label: 'Делегировать',
            action: openDelegateModal,
            variant: 'primary',
            icon: ArrowDownIcon,
            condition: (task) => !task.assignee || (task.assignee.role !== 'junior' && task.task_status !== 'done')
        }
    ]

    // Статистика
    const myTasks = tasks.filter(t => !t.assignee || t.created_by_user.role === 'teamlead')
    const teamTasks = tasks.filter(t => t.assignee?.role === 'junior')
    const pendingReview = tasks.filter(t => t.task_status === 'review')
    const overdueTasks = tasks.filter(t => t.is_overdue)
    const completedTasks = tasks.filter(t => t.task_status === 'done')

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Управление задачами</h1>
                    <p className="text-gray-600">Team Lead: центр ежедневного управления командой</p>
                </div>
                <button
                    onClick={() => {
                        setShowCreateModal(true)
                        loadJuniors()
                    }}
                    className="btn-primary"
                >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Создать задачу
                </button>
            </div>

            {/* Информация о роли Team Lead */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <ClipboardDocumentListIcon className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">
                            Team Lead центр управления
                        </h3>
                        <div className="mt-2 text-sm text-blue-700">
                            <p>• Видите задачи своей команды и создаете новые</p>
                            <p>• Делегируете задачи Junior'ам с дедлайнами</p>
                            <p>• Собираете статус выполнения и закрываете задачи</p>
                            <p>• Принимаете работы на ревью или отправляете на доработку</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Переключатель вида и фильтры */}
            <div className="flex space-x-4">
                <div>
                    <label className="form-label">Вид</label>
                    <select
                        value={viewMode}
                        onChange={(e) => setViewMode(e.target.value as 'my-team' | 'all')}
                        className="form-input"
                    >
                        <option value="my-team">Моя команда</option>
                        <option value="all">Все задачи</option>
                    </select>
                </div>
                <div>
                    <label className="form-label">Статус</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="form-input"
                    >
                        <option value="all">Все статусы</option>
                        <option value="backlog">Отложены</option>
                        <option value="todo">К выполнению</option>
                        <option value="in_progress">В работе</option>
                        <option value="review">На проверке</option>
                        <option value="done">Выполнены</option>
                    </select>
                </div>
            </div>

            {/* Статистика */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <KPICard
                    title="Всего задач"
                    value={tasks.length}
                    icon={<ClipboardDocumentListIcon className="h-6 w-6" />}
                    color="primary"
                />
                <KPICard
                    title="Мои задачи"
                    value={myTasks.length}
                    icon={<UserIcon className="h-6 w-6" />}
                    color="primary"
                />
                <KPICard
                    title="Команда"
                    value={teamTasks.length}
                    icon={<UserIcon className="h-6 w-6" />}
                    color="success"
                />
                <KPICard
                    title="На проверке"
                    value={pendingReview.length}
                    icon={<ChatBubbleLeftIcon className="h-6 w-6" />}
                    color="warning"
                />
                <KPICard
                    title="Просрочены"
                    value={overdueTasks.length}
                    icon={<ExclamationTriangleIcon className="h-6 w-6" />}
                    color="danger"
                />
                <KPICard
                    title="Выполнены"
                    value={completedTasks.length}
                    icon={<CheckCircleIcon className="h-6 w-6" />}
                    color="success"
                />
            </div>

            {/* Таблица задач */}
            <div className="card">
                <div className="card-header">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {viewMode === 'my-team' ? 'Задачи моей команды' : 'Все задачи'} ({tasks.length})
                    </h3>
                </div>

                <DataTable
                    data={tasks}
                    columns={columns}
                    actions={actions}
                    loading={loading}
                    pagination={{ pageSize: 25 }}
                    filtering={true}
                    exportable={true}
                    emptyMessage="Задачи не найдены"
                />
            </div>

            {/* Modal создания задачи */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Создать задачу для команды"
                size="lg"
            >
                <div className="space-y-4">
                    <div>
                        <label className="form-label">Название задачи *</label>
                        <input
                            type="text"
                            value={taskForm.title}
                            onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                            className="form-input"
                            placeholder="Название задачи..."
                            required
                        />
                    </div>

                    <div>
                        <label className="form-label">Описание</label>
                        <textarea
                            value={taskForm.description}
                            onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                            className="form-input"
                            rows={3}
                            placeholder="Подробное описание задачи..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">Назначить Junior'у</label>
                            <select
                                value={taskForm.assignee_id}
                                onChange={(e) => setTaskForm({ ...taskForm, assignee_id: e.target.value })}
                                className="form-input"
                            >
                                <option value="">Оставить себе</option>
                                {juniors.map((junior: any) => (
                                    <option key={junior.id} value={junior.id}>
                                        {`${junior.first_name || ''} ${junior.last_name || ''}`.trim() || junior.email}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Приоритет</label>
                            <select
                                value={taskForm.priority}
                                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                                className="form-input"
                            >
                                <option value="low">Низкий</option>
                                <option value="medium">Средний</option>
                                <option value="high">Высокий</option>
                                <option value="urgent">Срочный</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">Дедлайн</label>
                            <input
                                type="date"
                                value={taskForm.due_date}
                                onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                                className="form-input"
                            />
                        </div>
                        <div>
                            <label className="form-label">Оценка времени (часы)</label>
                            <input
                                type="number"
                                step="0.5"
                                min="0"
                                value={taskForm.estimated_hours}
                                onChange={(e) => setTaskForm({ ...taskForm, estimated_hours: e.target.value })}
                                className="form-input"
                                placeholder="4.0"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            onClick={() => setShowCreateModal(false)}
                            className="btn-secondary"
                            disabled={creating}
                        >
                            Отмена
                        </button>
                        <button
                            onClick={handleCreateTask}
                            className="btn-primary"
                            disabled={creating || !taskForm.title}
                        >
                            {creating ? 'Создание...' : 'Создать задачу'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal делегирования задачи */}
            <Modal
                isOpen={showDelegateModal}
                onClose={() => setShowDelegateModal(false)}
                title={`Делегировать задачу: ${selectedTask?.title}`}
                size="md"
            >
                <div className="space-y-4">
                    {selectedTask && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <h4 className="font-medium text-gray-900 mb-2">Задача:</h4>
                            <p className="text-sm text-gray-600">{selectedTask.description || 'Без описания'}</p>
                        </div>
                    )}

                    <div>
                        <label className="form-label">Назначить Junior'у *</label>
                        <select
                            value={delegateForm.assignee_id}
                            onChange={(e) => setDelegateForm({ ...delegateForm, assignee_id: e.target.value })}
                            className="form-input"
                            required
                        >
                            <option value="">Выберите Junior'а</option>
                            {juniors.map((junior: any) => (
                                <option key={junior.id} value={junior.id}>
                                    {`${junior.first_name || ''} ${junior.last_name || ''}`.trim() || junior.email}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="form-label">Дедлайн</label>
                        <input
                            type="date"
                            value={delegateForm.due_date}
                            onChange={(e) => setDelegateForm({ ...delegateForm, due_date: e.target.value })}
                            className="form-input"
                        />
                    </div>

                    <div>
                        <label className="form-label">Дополнительные указания</label>
                        <textarea
                            value={delegateForm.notes}
                            onChange={(e) => setDelegateForm({ ...delegateForm, notes: e.target.value })}
                            className="form-input"
                            rows={3}
                            placeholder="Дополнительные указания для Junior'а..."
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            onClick={() => setShowDelegateModal(false)}
                            className="btn-secondary"
                            disabled={delegating}
                        >
                            Отмена
                        </button>
                        <button
                            onClick={handleDelegateTask}
                            className="btn-primary"
                            disabled={delegating || !delegateForm.assignee_id}
                        >
                            {delegating ? 'Делегирование...' : 'Делегировать'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
