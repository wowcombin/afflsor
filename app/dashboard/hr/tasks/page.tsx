'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column, ActionButton } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import Modal from '@/components/ui/Modal'
import { 
  UserIcon,
  CheckCircleIcon,
  PlusIcon,
  ClockIcon,
  DocumentTextIcon,
  UserPlusIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

export default function HRTasksPage() {
  const { addToast } = useToast()
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  // Модал создания HR задачи
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [users, setUsers] = useState([])
  const [creating, setCreating] = useState(false)
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    task_type: 'onboarding',
    assignee_id: '',
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
      
      // Загружаем задачи, связанные с HR
      const response = await fetch('/api/tasks')
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки задач')
      }

      const data = await response.json()
      // Фильтруем HR-специфичные задачи
      const hrTasks = (data.tasks || []).filter((task: any) => 
        task.project?.project_type === 'hr' ||
        task.assignee?.role === 'hr' ||
        task.created_by_user?.role === 'hr' ||
        task.title.toLowerCase().includes('hr') ||
        task.title.toLowerCase().includes('онбординг') ||
        task.title.toLowerCase().includes('адаптация') ||
        task.title.toLowerCase().includes('nda') ||
        task.title.toLowerCase().includes('отчет')
      )
      
      setTasks(hrTasks)

    } catch (error: any) {
      console.error('Ошибка загрузки HR задач:', error)
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
      const usersResponse = await fetch('/api/users')
      if (usersResponse.ok) {
        const { users: userData } = await usersResponse.json()
        setUsers(userData.filter((u: any) => u.status === 'active'))
      }
    } catch (error: any) {
      console.error('Ошибка загрузки пользователей:', error)
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

      // Подготавливаем данные задачи
      const taskData = {
        title: taskForm.title.trim(),
        description: taskForm.description?.trim() || getDefaultDescription(taskForm.task_type),
        assignee_id: taskForm.assignee_id || null,
        priority: taskForm.priority,
        due_date: taskForm.due_date || null,
        estimated_hours: taskForm.estimated_hours ? parseFloat(taskForm.estimated_hours) : null,
        tags: [taskForm.task_type, 'hr']
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
        title: 'HR задача создана',
        description: data.message
      })

      setShowCreateModal(false)
      setTaskForm({
        title: '',
        description: '',
        task_type: 'onboarding',
        assignee_id: '',
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

  function getDefaultDescription(taskType: string): string {
    switch (taskType) {
      case 'onboarding':
        return 'Провести полную адаптацию нового сотрудника: знакомство с командой, подписание документов, настройка доступов, объяснение процессов'
      case 'reporting':
        return 'Подготовить месячный HR отчет: статистика сотрудников, анализ эффективности, рекомендации'
      case 'nda':
        return 'Обработать NDA документы: проверка подписей, архивирование, уведомления'
      case 'kpi':
        return 'Анализ KPI сотрудников: оценка производительности, выявление проблем, план развития'
      default:
        return 'HR задача по управлению персоналом'
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
            {task.tags?.includes('onboarding') && '👤 Онбординг'}
            {task.tags?.includes('reporting') && '📊 Отчетность'}
            {task.tags?.includes('nda') && '📄 NDA'}
            {task.tags?.includes('kpi') && '🎯 KPI'}
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
            </>
          ) : (
            <span className="text-gray-500">Не назначена</span>
          )}
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

  // Статистика HR задач
  const onboardingTasks = tasks.filter(t => t.title.toLowerCase().includes('онбординг') || 
                                           t.title.toLowerCase().includes('адаптация'))
  const reportingTasks = tasks.filter(t => t.title.toLowerCase().includes('отчет'))
  const ndaTasks = tasks.filter(t => t.title.toLowerCase().includes('nda'))
  const kpiTasks = tasks.filter(t => t.title.toLowerCase().includes('kpi') || 
                                    t.title.toLowerCase().includes('оценка'))
  const completedTasks = tasks.filter(t => t.task_status === 'done')
  const overdueTasks = tasks.filter(t => t.is_overdue)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">HR задачи</h1>
          <p className="text-gray-600">Задачи по управлению персоналом</p>
        </div>
        <button
          onClick={() => {
            setShowCreateModal(true)
            loadCreateModalData()
          }}
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Создать HR задачу
        </button>
      </div>

      {/* Информация о HR задачах */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <UserIcon className="h-5 w-5 text-purple-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-purple-800">
              HR задачи по людям
            </h3>
            <div className="mt-2 text-sm text-purple-700">
              <p>• Онбординг: адаптация новых сотрудников (5 шагов)</p>
              <p>• Отчетность: месячные и квартальные HR отчеты</p>
              <p>• NDA: подписание и контроль соглашений</p>
              <p>• KPI: оценка производительности и развитие</p>
            </div>
          </div>
        </div>
      </div>

      {/* Статистика по типам HR задач */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <KPICard
          title="Всего HR задач"
          value={tasks.length}
          icon={<UserIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Онбординг"
          value={onboardingTasks.length}
          icon={<UserPlusIcon className="h-6 w-6" />}
          color="success"
        />
        <KPICard
          title="Отчетность"
          value={reportingTasks.length}
          icon={<DocumentTextIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="NDA"
          value={ndaTasks.length}
          icon={<DocumentTextIcon className="h-6 w-6" />}
          color="warning"
        />
        <KPICard
          title="KPI"
          value={kpiTasks.length}
          icon={<ChartBarIcon className="h-6 w-6" />}
          color="primary"
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
            HR задачи ({tasks.length})
          </h3>
        </div>
        
        <DataTable
          data={tasks}
          columns={columns}
          loading={loading}
          pagination={{ pageSize: 20 }}
          filtering={true}
          exportable={true}
          emptyMessage="HR задачи не найдены"
        />
      </div>

      {/* Modal создания HR задачи */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Создать HR задачу"
        size="lg"
      >
        <div className="space-y-4">
          {/* Тип HR задачи */}
          <div>
            <label className="form-label">Тип HR задачи</label>
            <select
              value={taskForm.task_type}
              onChange={(e) => {
                setTaskForm({ 
                  ...taskForm, 
                  task_type: e.target.value,
                  title: getDefaultTitle(e.target.value),
                  description: getDefaultDescription(e.target.value)
                })
              }}
              className="form-input"
            >
              <option value="onboarding">Онбординг нового сотрудника</option>
              <option value="reporting">Подготовка отчетности</option>
              <option value="nda">Обработка NDA</option>
              <option value="kpi">Анализ KPI сотрудников</option>
              <option value="general">Общая HR задача</option>
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

          {/* Исполнитель */}
          <div>
            <label className="form-label">Назначить исполнителя</label>
            <select
              value={taskForm.assignee_id}
              onChange={(e) => setTaskForm({ ...taskForm, assignee_id: e.target.value })}
              className="form-input"
            >
              <option value="">Выберите исполнителя</option>
              {users.map((user: any) => (
                <option key={user.id} value={user.id}>
                  {`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email} ({user.role})
                </option>
              ))}
            </select>
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
                taskForm.task_type === 'onboarding' ? '4.0' :
                taskForm.task_type === 'reporting' ? '8.0' :
                taskForm.task_type === 'nda' ? '1.0' :
                taskForm.task_type === 'kpi' ? '6.0' : '2.0'
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

  function getDefaultTitle(taskType: string): string {
    switch (taskType) {
      case 'onboarding':
        return 'Адаптация нового сотрудника'
      case 'reporting':
        return 'Подготовка месячного HR отчета'
      case 'nda':
        return 'Обработка NDA документов'
      case 'kpi':
        return 'Анализ KPI сотрудников'
      default:
        return ''
    }
  }
}
