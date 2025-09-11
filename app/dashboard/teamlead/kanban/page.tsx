'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import KPICard from '@/components/ui/KPICard'
import Modal from '@/components/ui/Modal'
import {
    ClipboardDocumentListIcon,
    PlusIcon,
    CheckCircleIcon,
    UserIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    ArrowRightIcon,
    ChatBubbleLeftIcon,
    PencilIcon
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
}

const COLUMNS = [
    { id: 'backlog', title: 'Backlog', color: 'gray', icon: '📋' },
    { id: 'todo', title: 'To Do', color: 'blue', icon: '📝' },
    { id: 'in_progress', title: 'In Progress', color: 'yellow', icon: '⚡' },
    { id: 'review', title: 'Review', color: 'purple', icon: '👀' },
    { id: 'done', title: 'Done', color: 'green', icon: '✅' }
]

export default function TeamLeadKanbanPage() {
    const { addToast } = useToast()
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [draggedTask, setDraggedTask] = useState<Task | null>(null)

    // Модал просмотра задачи
    const [showTaskModal, setShowTaskModal] = useState(false)
    const [selectedTask, setSelectedTask] = useState<Task | null>(null)
    const [updatingStatus, setUpdatingStatus] = useState(false)

    useEffect(() => {
        loadTasks()
    }, [])

    async function loadTasks() {
        try {
            setLoading(true)

            const response = await fetch('/api/teamlead/tasks?team_only=true')

            if (!response.ok) {
                throw new Error('Ошибка загрузки задач')
            }

            const data = await response.json()
            setTasks(data.tasks || [])

        } catch (error: any) {
            console.error('Ошибка загрузки задач для Kanban:', error)
            addToast({
                type: 'error',
                title: 'Ошибка загрузки данных',
                description: error.message
            })
        } finally {
            setLoading(false)
        }
    }

    async function updateTaskStatus(taskId: string, newStatus: string) {
        try {
            setUpdatingStatus(true)

            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_status: newStatus })
            })

            if (!response.ok) {
                throw new Error('Ошибка обновления статуса')
            }

            // Обновляем локальное состояние
            setTasks(prevTasks =>
                prevTasks.map(task =>
                    task.id === taskId ? { ...task, task_status: newStatus } : task
                )
            )

            addToast({
                type: 'success',
                title: 'Статус обновлен',
                description: `Задача перемещена в "${getColumnTitle(newStatus)}"`
            })

        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Ошибка обновления',
                description: error.message
            })
        } finally {
            setUpdatingStatus(false)
        }
    }

    function getColumnTitle(status: string): string {
        const column = COLUMNS.find(col => col.id === status)
        return column ? column.title : status
    }

    function getTasksByStatus(status: string): Task[] {
        return tasks.filter(task => task.task_status === status)
    }

    function handleDragStart(task: Task) {
        setDraggedTask(task)
    }

    function handleDragEnd() {
        setDraggedTask(null)
    }

    function handleDragOver(e: React.DragEvent) {
        e.preventDefault()
    }

    function handleDrop(e: React.DragEvent, newStatus: string) {
        e.preventDefault()

        if (draggedTask && draggedTask.task_status !== newStatus) {
            updateTaskStatus(draggedTask.id, newStatus)
        }

        setDraggedTask(null)
    }

    function openTaskModal(task: Task) {
        setSelectedTask(task)
        setShowTaskModal(true)
    }

    function getPriorityColor(priority: string): string {
        switch (priority) {
            case 'urgent': return 'border-l-red-500 bg-red-50'
            case 'high': return 'border-l-orange-500 bg-orange-50'
            case 'medium': return 'border-l-blue-500 bg-blue-50'
            case 'low': return 'border-l-gray-500 bg-gray-50'
            default: return 'border-l-gray-500 bg-gray-50'
        }
    }

    function getColumnColor(color: string): string {
        switch (color) {
            case 'gray': return 'bg-gray-100 border-gray-300'
            case 'blue': return 'bg-blue-100 border-blue-300'
            case 'yellow': return 'bg-yellow-100 border-yellow-300'
            case 'purple': return 'bg-purple-100 border-purple-300'
            case 'green': return 'bg-green-100 border-green-300'
            default: return 'bg-gray-100 border-gray-300'
        }
    }

    // Статистика для KPI карточек
    const backlogTasks = getTasksByStatus('backlog')
    const todoTasks = getTasksByStatus('todo')
    const inProgressTasks = getTasksByStatus('in_progress')
    const reviewTasks = getTasksByStatus('review')
    const doneTasks = getTasksByStatus('done')
    const overdueTasks = tasks.filter(t => t.is_overdue)

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg text-gray-600">Загрузка Kanban доски...</div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Kanban доска</h1>
                    <p className="text-gray-600">Team Lead: визуальное управление задачами команды</p>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={loadTasks}
                        className="btn-secondary"
                    >
                        🔄 Обновить
                    </button>
                </div>
            </div>

            {/* Информация о Kanban */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <ClipboardDocumentListIcon className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-indigo-800">
                            Kanban поток задач
                        </h3>
                        <div className="mt-2 text-sm text-indigo-700">
                            <p>📋 <strong>Backlog</strong> → 📝 <strong>To Do</strong> → ⚡ <strong>In Progress</strong> → 👀 <strong>Review</strong> → ✅ <strong>Done</strong></p>
                            <p className="mt-1">Перетаскивайте карточки между колонками для изменения статуса</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Статистика */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <KPICard
                    title="Backlog"
                    value={backlogTasks.length}
                    icon={<ClipboardDocumentListIcon className="h-6 w-6" />}
                    color="gray"
                />
                <KPICard
                    title="To Do"
                    value={todoTasks.length}
                    icon={<ClockIcon className="h-6 w-6" />}
                    color="primary"
                />
                <KPICard
                    title="In Progress"
                    value={inProgressTasks.length}
                    icon={<UserIcon className="h-6 w-6" />}
                    color="warning"
                />
                <KPICard
                    title="Review"
                    value={reviewTasks.length}
                    icon={<ChatBubbleLeftIcon className="h-6 w-6" />}
                    color="primary"
                />
                <KPICard
                    title="Done"
                    value={doneTasks.length}
                    icon={<CheckCircleIcon className="h-6 w-6" />}
                    color="success"
                />
                <KPICard
                    title="Просрочены"
                    value={overdueTasks.length}
                    icon={<ExclamationTriangleIcon className="h-6 w-6" />}
                    color="danger"
                />
            </div>

            {/* Kanban доска */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-[600px]">
                    {COLUMNS.map((column) => {
                        const columnTasks = getTasksByStatus(column.id)

                        return (
                            <div
                                key={column.id}
                                className={`rounded-lg border-2 border-dashed p-4 ${getColumnColor(column.color)}`}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, column.id)}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-gray-900 flex items-center">
                                        <span className="mr-2">{column.icon}</span>
                                        {column.title}
                                    </h3>
                                    <span className="bg-white rounded-full px-2 py-1 text-sm font-medium text-gray-600">
                                        {columnTasks.length}
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    {columnTasks.map((task) => (
                                        <div
                                            key={task.id}
                                            draggable
                                            onDragStart={() => handleDragStart(task)}
                                            onDragEnd={handleDragEnd}
                                            onClick={() => openTaskModal(task)}
                                            className={`p-3 rounded-lg border-l-4 cursor-move hover:shadow-md transition-shadow ${getPriorityColor(task.priority)} ${draggedTask?.id === task.id ? 'opacity-50' : ''
                                                }`}
                                        >
                                            <div className="space-y-2">
                                                {/* Заголовок задачи */}
                                                <h4 className="font-medium text-gray-900 text-sm leading-tight">
                                                    {task.title}
                                                </h4>

                                                {/* Исполнитель */}
                                                {task.assignee && (
                                                    <div className="flex items-center text-xs text-gray-600">
                                                        <UserIcon className="h-3 w-3 mr-1" />
                                                        <span>
                                                            {`${task.assignee.first_name || ''} ${task.assignee.last_name || ''}`.trim() || task.assignee.email}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Дедлайн */}
                                                {task.due_date && (
                                                    <div className={`flex items-center text-xs ${task.is_overdue ? 'text-red-600' : 'text-gray-600'}`}>
                                                        <ClockIcon className="h-3 w-3 mr-1" />
                                                        <span>
                                                            {new Date(task.due_date).toLocaleDateString('ru-RU')}
                                                            {task.is_overdue && ' ⚠️'}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Приоритет */}
                                                <div className="flex justify-between items-center">
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${task.priority === 'urgent'
                                                            ? 'bg-red-100 text-red-800'
                                                            : task.priority === 'high'
                                                                ? 'bg-orange-100 text-orange-800'
                                                                : task.priority === 'medium'
                                                                    ? 'bg-blue-100 text-blue-800'
                                                                    : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {task.priority === 'urgent' ? '🔥' :
                                                            task.priority === 'high' ? '⚡' :
                                                                task.priority === 'medium' ? '📝' : '📋'}
                                                    </span>

                                                    {/* Быстрые действия для Review */}
                                                    {task.task_status === 'review' && (
                                                        <div className="flex space-x-1">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    updateTaskStatus(task.id, 'done')
                                                                }}
                                                                className="text-green-600 hover:text-green-800 text-xs"
                                                                disabled={updatingStatus}
                                                                title="Принять"
                                                            >
                                                                ✅
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    updateTaskStatus(task.id, 'in_progress')
                                                                }}
                                                                className="text-orange-600 hover:text-orange-800 text-xs"
                                                                disabled={updatingStatus}
                                                                title="Доработать"
                                                            >
                                                                🔄
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {columnTasks.length === 0 && (
                                        <div className="text-center text-gray-500 text-sm py-8">
                                            Перетащите задачи сюда
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Modal просмотра задачи */}
            <Modal
                isOpen={showTaskModal}
                onClose={() => setShowTaskModal(false)}
                title={selectedTask?.title || 'Задача'}
                size="lg"
            >
                {selectedTask && (
                    <div className="space-y-4">
                        {/* Основная информация */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700">Статус</label>
                                <div className="mt-1">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${selectedTask.task_status === 'done'
                                            ? 'bg-green-100 text-green-800'
                                            : selectedTask.task_status === 'in_progress'
                                                ? 'bg-blue-100 text-blue-800'
                                                : selectedTask.task_status === 'review'
                                                    ? 'bg-purple-100 text-purple-800'
                                                    : selectedTask.task_status === 'todo'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {getColumnTitle(selectedTask.task_status)}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Приоритет</label>
                                <div className="mt-1">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${selectedTask.priority === 'urgent'
                                            ? 'bg-red-100 text-red-800'
                                            : selectedTask.priority === 'high'
                                                ? 'bg-orange-100 text-orange-800'
                                                : selectedTask.priority === 'medium'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {selectedTask.priority === 'urgent' ? 'Срочно' :
                                            selectedTask.priority === 'high' ? 'Высокий' :
                                                selectedTask.priority === 'medium' ? 'Средний' : 'Низкий'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Описание */}
                        {selectedTask.description && (
                            <div>
                                <label className="text-sm font-medium text-gray-700">Описание</label>
                                <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-900">{selectedTask.description}</p>
                                </div>
                            </div>
                        )}

                        {/* Исполнитель и дедлайн */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700">Исполнитель</label>
                                <div className="mt-1">
                                    {selectedTask.assignee ? (
                                        <div>
                                            <div className="font-medium text-gray-900">
                                                {`${selectedTask.assignee.first_name || ''} ${selectedTask.assignee.last_name || ''}`.trim() || selectedTask.assignee.email}
                                            </div>
                                            <div className="text-sm text-gray-500">{selectedTask.assignee.email}</div>
                                            <div className="text-xs text-blue-600 capitalize">{selectedTask.assignee.role}</div>
                                        </div>
                                    ) : (
                                        <span className="text-gray-500">Не назначена</span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Дедлайн</label>
                                <div className="mt-1">
                                    {selectedTask.due_date ? (
                                        <div className={`text-sm ${selectedTask.is_overdue ? 'text-red-600' : 'text-gray-600'}`}>
                                            <div>{new Date(selectedTask.due_date).toLocaleDateString('ru-RU')}</div>
                                            {selectedTask.is_overdue && (
                                                <div className="text-xs text-red-600">⚠️ Просрочена</div>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-gray-500">Не указан</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Действия для Review */}
                        {selectedTask.task_status === 'review' && (
                            <div className="flex space-x-3 pt-4 border-t">
                                <button
                                    onClick={() => {
                                        updateTaskStatus(selectedTask.id, 'done')
                                        setShowTaskModal(false)
                                    }}
                                    className="btn-success"
                                    disabled={updatingStatus}
                                >
                                    ✅ Принять работу
                                </button>
                                <button
                                    onClick={() => {
                                        updateTaskStatus(selectedTask.id, 'in_progress')
                                        setShowTaskModal(false)
                                    }}
                                    className="btn-warning"
                                    disabled={updatingStatus}
                                >
                                    🔄 Отправить на доработку
                                </button>
                            </div>
                        )}

                        {/* Кнопка закрытия */}
                        <div className="flex justify-end pt-4">
                            <button
                                onClick={() => setShowTaskModal(false)}
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
