'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column, ActionButton } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import Modal from '@/components/ui/Modal'
import { 
  ClipboardDocumentListIcon,
  UserIcon,
  CheckCircleIcon,
  PlusIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  FolderIcon,
  ArrowDownIcon
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
}

export default function ManagerTasksPage() {
  const { addToast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  // Модал создания задачи
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [creating, setCreating] = useState(false)
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    project_id: '',
    assignee_id: '',
    priority: 'medium',
    due_date: '',
    estimated_hours: '',
    tags: [] as string[],
    task_type: 'general' // general, hr_onboarding, hr_reporting, testing, regression
  })

  useEffect(() => {
    loadTasks()
  }, [])

  async function loadTasks() {
    try {
      setLoading(true)
      
      let url = '/api/tasks'
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (priorityFilter !== 'all') params.append('priority', priorityFilter)
      if (params.toString()) url += '?' + params.toString()
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки задач')
      }

      const data = await response.json()
      setTasks(data.tasks || [])

    } catch (error: any) {
      console.error('Ошибка загрузки задач:', error)
      addToast({
        type: 'error',
        title: 'Ошибка загрузки данных',
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  async function loadCreateModalData() {
    try {
      // Загружаем проекты
      const projectsResponse = await fetch('/api/projects?status=active')
      if (projectsResponse.ok) {
        const { projects: projectData } = await projectsResponse.json()
        setProjects(projectData || [])
      }

      // Загружаем пользователей для назначения
      const usersResponse = await fetch('/api/users')
      if (usersResponse.ok) {
        const { users: userData } = await usersResponse.json()
        setUsers(userData.filter((u: any) => u.status === 'active'))
      }
    } catch (error: any) {
      console.error('Ошибка загрузки данных для создания:', error)
    }
  }

  async function handleCreateTask() {
    if (!taskForm.title) {
      addToast({
        type: 'error',
        title: 'Заполните обязательные поля',
        description: 'Название задачи обязательно'
      })
      return
    }

    try {
      setCreating(true)
      
      // Подготавливаем данные на основе типа задачи
      let taskData = {
        ...taskForm,
        estimated_hours: taskForm.estimated_hours ? parseFloat(taskForm.estimated_hours) : null
      }

      // Специальная логика для HR задач
      if (taskForm.task_type === 'hr_onboarding' && !taskForm.description) {
        taskData.description = 'Задача по адаптации нового сотрудника'
      } else if (taskForm.task_type === 'hr_reporting' && !taskForm.description) {
        taskData.description = 'Задача по подготовке HR отчетности'
      } else if (taskForm.task_type === 'testing' && !taskForm.description) {
        taskData.description = 'Задача по тестированию функциональности'
      } else if (taskForm.task_type === 'regression' && !taskForm.description) {
        taskData.description = 'Задача по регрессионному тестированию'
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
        title: 'Задача создана',
        description: data.message
      })

      setShowCreateModal(false)
      setTaskForm({
        title: '',
        description: '',
        project_id: '',
        assignee_id: '',
        priority: 'medium',
        due_date: '',
        estimated_hours: '',
        tags: [],
        task_type: 'general'
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

  async function handleDelegateTask(task: Task) {
    // Логика делегирования задачи Team Lead'у
    // Будет реализована в следующих задачах
    addToast({
      type: 'info',
      title: 'Функция в разработке',
      description: 'Делегирование задач Team Lead\'ам будет добавлено в следующей версии'
    })
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
          <div className="text-xs text-gray-500 capitalize">{task.project?.project_type || 'Без проекта'}</div>
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
            <span className="text-gray-500">Не назначена</span>
          )}
        </div>
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
          {task.priority === 'urgent' ? 'Срочно' :
           task.priority === 'high' ? 'Высокий' :
           task.priority === 'medium' ? 'Средний' : 'Низкий'}
        </span>
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
    },
    {
      key: 'created_by',
      label: 'Создал',
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
      label: 'Делегировать',
      action: handleDelegateTask,
      variant: 'primary',
      icon: ArrowDownIcon,
      condition: (task) => task.task_status === 'backlog' || task.task_status === 'todo'
    }
  ]

  // Статистика
  const totalTasks = tasks.length
  const myTasks = tasks.filter(t => t.created_by_user.role === 'manager')
  const pendingTasks = tasks.filter(t => ['backlog', 'todo'].includes(t.task_status))
  const inProgressTasks = tasks.filter(t => t.task_status === 'in_progress')
  const completedTasks = tasks.filter(t => t.task_status === 'done')
  const overdueTasks = tasks.filter(t => t.is_overdue)

  // Группировка по типам (для Coordinator функций)
  const hrTasks = tasks.filter(t => t.project?.project_type === 'hr' || 
                               (t.title.toLowerCase().includes('hr') || 
                                t.title.toLowerCase().includes('адаптация') ||
                                t.title.toLowerCase().includes('онбординг')))
  const testingTasks = tasks.filter(t => t.project?.project_type === 'testing' ||
                                    (t.title.toLowerCase().includes('тест') ||
                                     t.title.toLowerCase().includes('qa') ||
                                     t.title.toLowerCase().includes('регресс')))

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Управление задачами</h1>
          <p className="text-gray-600">Coordinator: распределение задач от C-Level к Team Leads</p>
        </div>
        <button
          onClick={() => {
            setShowCreateModal(true)
            loadCreateModalData()
          }}
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Создать задачу
        </button>
      </div>

      {/* Информация о роли Coordinator */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <ClipboardDocumentListIcon className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-indigo-800">
              Coordinator (Manager) функции
            </h3>
            <div className="mt-2 text-sm text-indigo-700">
              <p>• Распределение задач от C-Level к Team Leads</p>
              <p>• Создание задач для департаментов (HR, QA, разработка)</p>
              <p>• Контроль выполнения и делегирование</p>
              <p>• Координация между уровнями управления</p>
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
            onChange={(e) => {
              setStatusFilter(e.target.value)
              loadTasks()
            }}
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
        <div>
          <label className="form-label">Приоритет</label>
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value)
              loadTasks()
            }}
            className="form-input"
          >
            <option value="all">Все приоритеты</option>
            <option value="urgent">Срочные</option>
            <option value="high">Высокий</option>
            <option value="medium">Средний</option>
            <option value="low">Низкий</option>
          </select>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <KPICard
          title="Всего задач"
          value={totalTasks}
          icon={<ClipboardDocumentListIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Ожидают"
          value={pendingTasks.length}
          icon={<ClockIcon className="h-6 w-6" />}
          color="warning"
        />
        <KPICard
          title="В работе"
          value={inProgressTasks.length}
          icon={<UserIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Выполнены"
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
          title="HR задачи"
          value={hrTasks.length}
          icon={<UserIcon className="h-6 w-6" />}
          color="primary"
        />
      </div>

      {/* Быстрые действия */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">👥 HR задачи</h3>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Всего HR задач:</span>
                <span className="font-medium">{hrTasks.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Онбординг:</span>
                <span className="font-medium">
                  {hrTasks.filter(t => t.title.toLowerCase().includes('онбординг') || 
                                       t.title.toLowerCase().includes('адаптация')).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Отчетность:</span>
                <span className="font-medium">
                  {hrTasks.filter(t => t.title.toLowerCase().includes('отчет') || 
                                       t.title.toLowerCase().includes('nda')).length}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">🧪 QA задачи</h3>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Всего QA задач:</span>
                <span className="font-medium">{testingTasks.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Тестирование:</span>
                <span className="font-medium">
                  {testingTasks.filter(t => t.title.toLowerCase().includes('тест')).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Регрессы:</span>
                <span className="font-medium">
                  {testingTasks.filter(t => t.title.toLowerCase().includes('регресс')).length}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">📊 Эффективность</h3>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Завершено:</span>
                <span className="font-medium text-green-600">
                  {totalTasks > 0 ? ((completedTasks.length / totalTasks) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Просрочено:</span>
                <span className="font-medium text-red-600">
                  {totalTasks > 0 ? ((overdueTasks.length / totalTasks) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Таблица задач */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">
            Все задачи ({tasks.length})
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
        title="Создать новую задачу"
        size="lg"
      >
        <div className="space-y-4">
          {/* Тип задачи */}
          <div>
            <label className="form-label">Тип задачи</label>
            <select
              value={taskForm.task_type}
              onChange={(e) => setTaskForm({ ...taskForm, task_type: e.target.value })}
              className="form-input"
            >
              <option value="general">Общая задача</option>
              <option value="hr_onboarding">HR: Онбординг сотрудника</option>
              <option value="hr_reporting">HR: Отчетность</option>
              <option value="testing">QA: Тестирование</option>
              <option value="regression">QA: Регрессионное тестирование</option>
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
              placeholder={
                taskForm.task_type === 'hr_onboarding' ? 'Адаптация нового Junior\'а' :
                taskForm.task_type === 'hr_reporting' ? 'Подготовка месячного отчета' :
                taskForm.task_type === 'testing' ? 'Тестирование новой функции' :
                taskForm.task_type === 'regression' ? 'Регрессионное тестирование после обновления' :
                'Название задачи'
              }
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
              rows={3}
              placeholder={
                taskForm.task_type === 'hr_onboarding' ? 'Провести адаптацию, подписать документы, настроить доступы...' :
                taskForm.task_type === 'hr_reporting' ? 'Собрать данные, проанализировать показатели, подготовить презентацию...' :
                taskForm.task_type === 'testing' ? 'Протестировать функциональность, проверить граничные случаи...' :
                taskForm.task_type === 'regression' ? 'Выполнить полное регрессионное тестирование всех модулей...' :
                'Подробное описание задачи...'
              }
            />
          </div>

          {/* Проект и исполнитель */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Проект</label>
              <select
                value={taskForm.project_id}
                onChange={(e) => setTaskForm({ ...taskForm, project_id: e.target.value })}
                className="form-input"
              >
                <option value="">Без проекта</option>
                {projects.map((project: any) => (
                  <option key={project.id} value={project.id}>
                    {project.title} ({project.project_type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Назначить исполнителя</label>
              <select
                value={taskForm.assignee_id}
                onChange={(e) => setTaskForm({ ...taskForm, assignee_id: e.target.value })}
                className="form-input"
              >
                <option value="">Выберите исполнителя</option>
                {users
                  .filter((user: any) => {
                    // Фильтруем пользователей по типу задачи
                    if (taskForm.task_type.startsWith('hr_')) {
                      return user.role === 'hr'
                    } else if (taskForm.task_type === 'testing' || taskForm.task_type === 'regression') {
                      return user.role === 'tester'
                    }
                    return ['teamlead', 'manager', 'hr', 'tester'].includes(user.role)
                  })
                  .map((user: any) => (
                    <option key={user.id} value={user.id}>
                      {`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email} ({user.role})
                    </option>
                  ))}
              </select>
            </div>
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
              placeholder="8.0"
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
