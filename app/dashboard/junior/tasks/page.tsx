'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column, ActionButton } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import Modal from '@/components/ui/Modal'
import { 
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  UserIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  PauseIcon,
  ArrowUpIcon,
  ChatBubbleLeftIcon,
  ListBulletIcon,
  CalendarDaysIcon
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
  tags?: string[]
  template_id?: string
  project?: {
    id: string
    title: string
    project_type: string
  }
  created_by_user: {
    email: string
    first_name?: string
    last_name?: string
    role: string
  }
}

interface ChecklistItem {
  id: string
  task_id: string
  title: string
  is_completed: boolean
  order_index: number
}

export default function JuniorTasksPage() {
  const { addToast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('active')

  // Модал просмотра задачи
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    loadTasks()
  }, [statusFilter])

  async function loadTasks() {
    try {
      setLoading(true)
      
      // Загружаем задачи Junior'а
      let url = '/api/junior/tasks'
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        if (statusFilter === 'active') {
          params.append('status', 'todo,in_progress,review')
        } else {
          params.append('status', statusFilter)
        }
      }
      if (params.toString()) url += '?' + params.toString()
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки задач')
      }

      const data = await response.json()
      setTasks(data.tasks || [])

    } catch (error: any) {
      console.error('Ошибка загрузки задач Junior:', error)
      addToast({
        type: 'error',
        title: 'Ошибка загрузки данных',
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  async function loadTaskChecklist(taskId: string) {
    try {
      const response = await fetch(`/api/tasks/${taskId}/checklist`)
      if (response.ok) {
        const data = await response.json()
        setChecklist(data.checklist || [])
      }
    } catch (error: any) {
      console.error('Ошибка загрузки чек-листа:', error)
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

      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask({ ...selectedTask, task_status: newStatus })
      }

      addToast({
        type: 'success',
        title: 'Статус обновлен',
        description: `Задача ${getStatusName(newStatus)}`
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

  async function updateChecklistItem(itemId: string, isCompleted: boolean) {
    try {
      const response = await fetch(`/api/tasks/checklist/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: isCompleted })
      })

      if (!response.ok) {
        throw new Error('Ошибка обновления чек-листа')
      }

      // Обновляем локальное состояние чек-листа
      setChecklist(prevChecklist =>
        prevChecklist.map(item =>
          item.id === itemId ? { ...item, is_completed: isCompleted } : item
        )
      )

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка обновления чек-листа',
        description: error.message
      })
    }
  }

  function getStatusName(status: string): string {
    const statusMap: { [key: string]: string } = {
      'backlog': 'отложена',
      'todo': 'готова к выполнению',
      'in_progress': 'взята в работу',
      'review': 'отправлена на проверку',
      'done': 'выполнена'
    }
    return statusMap[status] || status
  }

  function openTaskModal(task: Task) {
    setSelectedTask(task)
    setShowTaskModal(true)
    loadTaskChecklist(task.id)
  }

  function startTask(task: Task) {
    updateTaskStatus(task.id, 'in_progress')
  }

  function submitForReview(task: Task) {
    // Проверяем, что все пункты чек-листа выполнены (если есть)
    if (checklist.length > 0) {
      const completedItems = checklist.filter(item => item.is_completed).length
      const totalItems = checklist.length
      
      if (completedItems < totalItems) {
        addToast({
          type: 'warning',
          title: 'Чек-лист не завершен',
          description: `Выполнено ${completedItems} из ${totalItems} пунктов`
        })
        return
      }
    }
    
    updateTaskStatus(task.id, 'review')
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
          <div className="flex items-center space-x-2 mt-1">
            {task.template_id && (
              <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">📋 Шаблон</span>
            )}
            {task.tags?.map((tag, index) => (
              <span key={index} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )
    },
    {
      key: 'task_status',
      label: 'Статус',
      render: (task) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          task.task_status === 'done' 
            ? 'bg-green-100 text-green-800'
            : task.task_status === 'in_progress'
            ? 'bg-blue-100 text-blue-800'
            : task.task_status === 'review'
            ? 'bg-purple-100 text-purple-800'
            : task.task_status === 'todo'
            ? 'bg-yellow-100 text-yellow-800'
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
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          task.priority === 'urgent' 
            ? 'bg-red-100 text-red-800'
            : task.priority === 'high'
            ? 'bg-orange-100 text-orange-800'
            : task.priority === 'medium'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {task.priority === 'urgent' ? '🔥 Срочно' :
           task.priority === 'high' ? '⚡ Высокий' :
           task.priority === 'medium' ? '📝 Средний' : '📋 Низкий'}
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
        
        const dueDate = new Date(task.due_date)
        const today = new Date()
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        
        return (
          <div className={`text-sm ${task.is_overdue ? 'text-red-600' : diffDays <= 1 ? 'text-orange-600' : 'text-gray-600'}`}>
            <div className="flex items-center">
              <CalendarDaysIcon className="h-4 w-4 mr-1" />
              {dueDate.toLocaleDateString('ru-RU')}
            </div>
            {task.is_overdue && (
              <div className="text-xs text-red-600">⚠️ Просрочена</div>
            )}
            {!task.is_overdue && diffDays <= 1 && diffDays >= 0 && (
              <div className="text-xs text-orange-600">🔔 Скоро дедлайн</div>
            )}
          </div>
        )
      }
    },
    {
      key: 'created_by',
      label: 'От кого',
      render: (task) => (
        <div>
          <div className="text-sm text-gray-600">
            {`${task.created_by_user.first_name || ''} ${task.created_by_user.last_name || ''}`.trim() || task.created_by_user.email}
          </div>
          <div className="text-xs text-gray-500 capitalize">{task.created_by_user.role}</div>
        </div>
      )
    }
  ]

  const actions: ActionButton<Task>[] = [
    {
      label: 'Начать',
      action: startTask,
      variant: 'success',
      icon: PlayIcon,
      condition: (task) => task.task_status === 'todo'
    },
    {
      label: 'На проверку',
      action: submitForReview,
      variant: 'primary',
      icon: ArrowUpIcon,
      condition: (task) => task.task_status === 'in_progress'
    },
    {
      label: 'Подробнее',
      action: openTaskModal,
      variant: 'secondary',
      icon: ClipboardDocumentListIcon
    }
  ]

  // Статистика
  const todoTasks = tasks.filter(t => t.task_status === 'todo')
  const inProgressTasks = tasks.filter(t => t.task_status === 'in_progress')
  const reviewTasks = tasks.filter(t => t.task_status === 'review')
  const completedTasks = tasks.filter(t => t.task_status === 'done')
  const overdueTasks = tasks.filter(t => t.is_overdue)
  const urgentTasks = tasks.filter(t => t.priority === 'urgent' && t.task_status !== 'done')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Мои задачи</h1>
          <p className="text-gray-600">Junior: получайте задачи от Team Lead с дедлайнами и чек-листами</p>
        </div>
      </div>

      {/* Информация для Junior */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <ClipboardDocumentListIcon className="h-5 w-5 text-green-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">
              Как работать с задачами
            </h3>
            <div className="mt-2 text-sm text-green-700">
              <p>• 📝 <strong>К выполнению</strong> → нажмите "Начать" для взятия в работу</p>
              <p>• ⚡ <strong>В работе</strong> → выполняйте по чек-листу, отправляйте "На проверку"</p>
              <p>• 👀 <strong>На проверке</strong> → ждите решения Team Lead'а</p>
              <p>• ✅ <strong>Выполнена</strong> → задача принята, учтется в зарплате</p>
            </div>
          </div>
        </div>
      </div>

      {/* Фильтр */}
      <div className="flex space-x-4">
        <div>
          <label className="form-label">Показать</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-input"
          >
            <option value="active">Активные задачи</option>
            <option value="todo">К выполнению</option>
            <option value="in_progress">В работе</option>
            <option value="review">На проверке</option>
            <option value="done">Выполненные</option>
            <option value="all">Все задачи</option>
          </select>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <KPICard
          title="К выполнению"
          value={todoTasks.length}
          icon={<ClockIcon className="h-6 w-6" />}
          color="warning"
        />
        <KPICard
          title="В работе"
          value={inProgressTasks.length}
          icon={<PlayIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="На проверке"
          value={reviewTasks.length}
          icon={<ChatBubbleLeftIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Выполнено"
          value={completedTasks.length}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="success"
        />
        <KPICard
          title="Просрочены"
          value={overdueTasks.length}
          icon={<ExclamationTriangleIcon className="h-6 w-6" />}
          color="danger"
        />
        <KPICard
          title="Срочные"
          value={urgentTasks.length}
          icon={<ExclamationTriangleIcon className="h-6 w-6" />}
          color="danger"
        />
      </div>

      {/* Таблица задач */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">
            Мои задачи ({tasks.length})
          </h3>
        </div>
        
        <DataTable
          data={tasks}
          columns={columns}
          actions={actions}
          loading={loading}
          pagination={{ pageSize: 20 }}
          filtering={true}
          exportable={true}
          emptyMessage="Задач не найдено"
        />
      </div>

      {/* Modal просмотра задачи */}
      <Modal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title={selectedTask?.title || 'Задача'}
        size="lg"
      >
        {selectedTask && (
          <div className="space-y-6">
            {/* Основная информация */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Статус</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${
                    selectedTask.task_status === 'done' 
                      ? 'bg-green-100 text-green-800'
                      : selectedTask.task_status === 'in_progress'
                      ? 'bg-blue-100 text-blue-800'
                      : selectedTask.task_status === 'review'
                      ? 'bg-purple-100 text-purple-800'
                      : selectedTask.task_status === 'todo'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {getStatusName(selectedTask.task_status)}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Приоритет</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${
                    selectedTask.priority === 'urgent' 
                      ? 'bg-red-100 text-red-800'
                      : selectedTask.priority === 'high'
                      ? 'bg-orange-100 text-orange-800'
                      : selectedTask.priority === 'medium'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedTask.priority === 'urgent' ? '🔥 Срочно' :
                     selectedTask.priority === 'high' ? '⚡ Высокий' :
                     selectedTask.priority === 'medium' ? '📝 Средний' : '📋 Низкий'}
                  </span>
                </div>
              </div>
            </div>

            {/* Описание */}
            {selectedTask.description && (
              <div>
                <label className="text-sm font-medium text-gray-700">Описание</label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedTask.description}</p>
                </div>
              </div>
            )}

            {/* Дедлайн и время */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Дедлайн</label>
                <div className="mt-1">
                  {selectedTask.due_date ? (
                    <div className={`text-sm ${selectedTask.is_overdue ? 'text-red-600' : 'text-gray-600'}`}>
                      <div className="flex items-center">
                        <CalendarDaysIcon className="h-4 w-4 mr-1" />
                        {new Date(selectedTask.due_date).toLocaleDateString('ru-RU')}
                      </div>
                      {selectedTask.is_overdue && (
                        <div className="text-xs text-red-600">⚠️ Просрочена</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-500">Не указан</span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Оценка времени</label>
                <div className="mt-1">
                  {selectedTask.estimated_hours ? (
                    <span className="text-sm text-gray-600">{selectedTask.estimated_hours} часов</span>
                  ) : (
                    <span className="text-gray-500">Не указано</span>
                  )}
                </div>
              </div>
            </div>

            {/* Чек-лист */}
            {checklist.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <ListBulletIcon className="h-4 w-4 mr-1" />
                  Чек-лист ({checklist.filter(item => item.is_completed).length}/{checklist.length})
                </label>
                <div className="mt-2 space-y-2">
                  {checklist
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((item) => (
                      <div key={item.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={item.is_completed}
                          onChange={(e) => updateChecklistItem(item.id, e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          disabled={selectedTask.task_status === 'done' || selectedTask.task_status === 'review'}
                        />
                        <span className={`text-sm ${item.is_completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {item.title}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Кто создал */}
            <div>
              <label className="text-sm font-medium text-gray-700">Создал задачу</label>
              <div className="mt-1">
                <div className="text-sm text-gray-900">
                  {`${selectedTask.created_by_user.first_name || ''} ${selectedTask.created_by_user.last_name || ''}`.trim() || selectedTask.created_by_user.email}
                </div>
                <div className="text-xs text-gray-500 capitalize">{selectedTask.created_by_user.role}</div>
              </div>
            </div>

            {/* Действия */}
            <div className="flex space-x-3 pt-4 border-t">
              {selectedTask.task_status === 'todo' && (
                <button
                  onClick={() => {
                    updateTaskStatus(selectedTask.id, 'in_progress')
                    setShowTaskModal(false)
                  }}
                  className="btn-success"
                  disabled={updatingStatus}
                >
                  <PlayIcon className="h-4 w-4 mr-2" />
                  Начать выполнение
                </button>
              )}
              
              {selectedTask.task_status === 'in_progress' && (
                <button
                  onClick={() => {
                    submitForReview(selectedTask)
                    setShowTaskModal(false)
                  }}
                  className="btn-primary"
                  disabled={updatingStatus}
                >
                  <ArrowUpIcon className="h-4 w-4 mr-2" />
                  Отправить на проверку
                </button>
              )}

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
