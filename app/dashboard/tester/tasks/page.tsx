'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import Modal from '@/components/ui/Modal'
import {
    BeakerIcon,
    CheckCircleIcon,
    PlusIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    BugAntIcon,
    ComputerDesktopIcon
} from '@heroicons/react/24/outline'

export default function TesterTasksPage() {
    const { addToast } = useToast()
    const [tasks, setTasks] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Модал создания QA задачи
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [creating, setCreating] = useState(false)
    const [taskForm, setTaskForm] = useState({
        title: '',
        description: '',
        test_type: 'functionality',
        priority: 'medium',
        due_date: '',
        estimated_hours: ''
    })

    useEffect(() => {
        loadTasks()
    }, [])

    async function loadTasks() {
        try {
            setLoading(true)

            // Загружаем задачи, связанные с тестированием
            const response = await fetch('/api/tasks')

            if (!response.ok) {
                throw new Error('Ошибка загрузки задач')
            }

            const data = await response.json()
            // Фильтруем QA-специфичные задачи
            const qaTasks = (data.tasks || []).filter((task: any) =>
                task.project?.project_type === 'testing' ||
                task.assignee?.role === 'tester' ||
                task.created_by_user?.role === 'tester' ||
                task.title.toLowerCase().includes('тест') ||
                task.title.toLowerCase().includes('qa') ||
                task.title.toLowerCase().includes('регресс') ||
                task.title.toLowerCase().includes('баг')
            )

            setTasks(qaTasks)

        } catch (error: any) {
            console.error('Ошибка загрузки QA задач:', error)
            addToast({
                type: 'error',
                title: 'Ошибка загрузки данных',
                description: error.message
            })
        } finally {
            setLoading(false)
        }
    }

    async function handleCreateTask() {
        if (!taskForm.title) {
            addToast({
                type: 'error',
                title: 'Заполните название задачи',
                description: 'Название задачи обязательно'
            })
            return
        }

        try {
            setCreating(true)

            const taskData = {
                title: taskForm.title.trim(),
                description: taskForm.description?.trim() || getDefaultTestDescription(taskForm.test_type),
                priority: taskForm.priority,
                due_date: taskForm.due_date || null,
                estimated_hours: taskForm.estimated_hours ? parseFloat(taskForm.estimated_hours) : null,
                tags: [taskForm.test_type, 'qa', 'testing']
            }

            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка создания задачи')
            }

            addToast({
                type: 'success',
                title: 'QA задача создана',
                description: data.message
            })

            setShowCreateModal(false)
            setTaskForm({
                title: '',
                description: '',
                test_type: 'functionality',
                priority: 'medium',
                due_date: '',
                estimated_hours: ''
            })
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

    function getDefaultTestDescription(testType: string): string {
        switch (testType) {
            case 'functionality':
                return 'Тестирование функциональности: проверка основных сценариев, граничных случаев, интеграций'
            case 'regression':
                return 'Регрессионное тестирование: полная проверка всех модулей после обновления'
            case 'performance':
                return 'Тестирование производительности: нагрузочное тестирование, оптимизация'
            case 'security':
                return 'Тестирование безопасности: проверка уязвимостей, аутентификации, авторизации'
            case 'usability':
                return 'Тестирование юзабилити: проверка удобства интерфейса, пользовательского опыта'
            default:
                return 'Задача по тестированию и обеспечению качества'
        }
    }

    function getDefaultTitle(testType: string): string {
        switch (testType) {
            case 'functionality':
                return 'Функциональное тестирование'
            case 'regression':
                return 'Регрессионное тестирование'
            case 'performance':
                return 'Тестирование производительности'
            case 'security':
                return 'Тестирование безопасности'
            case 'usability':
                return 'Тестирование юзабилити'
            default:
                return ''
        }
    }

    const columns: Column<any>[] = [
        {
            key: 'title',
            label: 'Задача',
            render: (task) => (
                <div>
                    <div className="font-medium text-gray-900">{task.title}</div>
                    <div className="text-sm text-gray-500">
                        {task.tags?.includes('functionality') && '🔧 Функциональность'}
                        {task.tags?.includes('regression') && '🔄 Регресс'}
                        {task.tags?.includes('performance') && '⚡ Производительность'}
                        {task.tags?.includes('security') && '🔒 Безопасность'}
                        {task.tags?.includes('usability') && '👤 Юзабилити'}
                    </div>
                </div>
            )
        },
        {
            key: 'task_status',
            label: 'Статус',
            render: (task) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${task.task_status === 'done'
                        ? 'bg-green-100 text-green-800'
                        : task.task_status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : task.task_status === 'review'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-800'
                    }`}>
                    {task.task_status === 'done' ? 'Выполнена' :
                        task.task_status === 'in_progress' ? 'В работе' :
                            task.task_status === 'review' ? 'На проверке' :
                                task.task_status === 'todo' ? 'К выполнению' : 'Отложена'}
                </span>
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
                            <div className="text-xs text-red-600">Просрочена</div>
                        )}
                    </div>
                )
            }
        }
    ]

    // Статистика QA задач
    const functionalityTasks = tasks.filter(t => t.tags?.includes('functionality'))
    const regressionTasks = tasks.filter(t => t.tags?.includes('regression'))
    const performanceTasks = tasks.filter(t => t.tags?.includes('performance'))
    const securityTasks = tasks.filter(t => t.tags?.includes('security'))
    const completedTasks = tasks.filter(t => t.task_status === 'done')

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">QA задачи</h1>
                    <p className="text-gray-600">Manual QA: тестирование и регрессы</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary"
                >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Создать QA задачу
                </button>
            </div>

            {/* Информация о QA задачах */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <BeakerIcon className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">
                            Manual QA задачи
                        </h3>
                        <div className="mt-2 text-sm text-green-700">
                            <p>• Функциональное тестирование новых возможностей</p>
                            <p>• Регрессионное тестирование после обновлений</p>
                            <p>• Тестирование производительности и безопасности</p>
                            <p>• Проверка юзабилити и пользовательского опыта</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Статистика по типам QA задач */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <KPICard
                    title="Всего QA задач"
                    value={tasks.length}
                    icon={<BeakerIcon className="h-6 w-6" />}
                    color="primary"
                />
                <KPICard
                    title="Функциональность"
                    value={functionalityTasks.length}
                    icon={<ComputerDesktopIcon className="h-6 w-6" />}
                    color="primary"
                />
                <KPICard
                    title="Регрессы"
                    value={regressionTasks.length}
                    icon={<BugAntIcon className="h-6 w-6" />}
                    color="warning"
                />
                <KPICard
                    title="Производительность"
                    value={performanceTasks.length}
                    icon={<ClockIcon className="h-6 w-6" />}
                    color="primary"
                />
                <KPICard
                    title="Безопасность"
                    value={securityTasks.length}
                    icon={<ExclamationTriangleIcon className="h-6 w-6" />}
                    color="danger"
                />
                <KPICard
                    title="Выполнено"
                    value={completedTasks.length}
                    icon={<CheckCircleIcon className="h-6 w-6" />}
                    color="success"
                />
            </div>

            {/* Таблица задач */}
            <div className="card">
                <div className="card-header">
                    <h3 className="text-lg font-semibold text-gray-900">
                        QA задачи ({tasks.length})
                    </h3>
                </div>

                <DataTable
                    data={tasks}
                    columns={columns}
                    loading={loading}
                    pagination={{ pageSize: 20 }}
                    filtering={true}
                    exportable={true}
                    emptyMessage="QA задачи не найдены"
                />
            </div>

            {/* Modal создания QA задачи */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Создать QA задачу"
                size="lg"
            >
                <div className="space-y-4">
                    {/* Тип тестирования */}
                    <div>
                        <label className="form-label">Тип тестирования</label>
                        <select
                            value={taskForm.test_type}
                            onChange={(e) => {
                                setTaskForm({
                                    ...taskForm,
                                    test_type: e.target.value,
                                    title: getDefaultTitle(e.target.value),
                                    description: getDefaultTestDescription(e.target.value)
                                })
                            }}
                            className="form-input"
                        >
                            <option value="functionality">Функциональное тестирование</option>
                            <option value="regression">Регрессионное тестирование</option>
                            <option value="performance">Тестирование производительности</option>
                            <option value="security">Тестирование безопасности</option>
                            <option value="usability">Тестирование юзабилити</option>
                        </select>
                    </div>

                    {/* Название */}
                    <div>
                        <label className="form-label">Название задачи *</label>
                        <input
                            type="text"
                            value={taskForm.title}
                            onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                            className="form-input"
                            required
                        />
                    </div>

                    {/* Описание */}
                    <div>
                        <label className="form-label">Описание</label>
                        <textarea
                            value={taskForm.description}
                            onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                            className="form-input"
                            rows={4}
                        />
                    </div>

                    {/* Приоритет и дедлайн */}
                    <div className="grid grid-cols-2 gap-4">
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
                        <div>
                            <label className="form-label">Дедлайн</label>
                            <input
                                type="date"
                                value={taskForm.due_date}
                                onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                                className="form-input"
                            />
                        </div>
                    </div>

                    {/* Оценка времени */}
                    <div>
                        <label className="form-label">Оценка времени (часы)</label>
                        <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={taskForm.estimated_hours}
                            onChange={(e) => setTaskForm({ ...taskForm, estimated_hours: e.target.value })}
                            className="form-input"
                            placeholder={
                                taskForm.test_type === 'functionality' ? '4.0' :
                                    taskForm.test_type === 'regression' ? '8.0' :
                                        taskForm.test_type === 'performance' ? '6.0' :
                                            taskForm.test_type === 'security' ? '12.0' : '3.0'
                            }
                        />
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
        </div>
    )
}
