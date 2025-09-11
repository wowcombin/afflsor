'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column, ActionButton } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import Modal from '@/components/ui/Modal'
import { 
  FolderIcon,
  UserIcon,
  CheckCircleIcon,
  PlusIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

interface Project {
  id: string
  title: string
  description?: string
  project_type: string
  status: string
  priority: string
  progress_percentage: number
  budget?: number
  spent_amount: number
  start_date?: string
  end_date?: string
  deadline?: string
  created_at: string
  owner: {
    id: string
    email: string
    first_name?: string
    last_name?: string
    role: string
  }
  task_stats: {
    total: number
    completed: number
    in_progress: number
    completion_rate: number
  }
}

export default function AdminProjectsPage() {
  const { addToast } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  // Модал создания проекта
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [users, setUsers] = useState([])
  const [creating, setCreating] = useState(false)
  const [projectForm, setProjectForm] = useState({
    title: '',
    description: '',
    project_type: 'development',
    owner_id: '',
    priority: 'medium',
    start_date: '',
    end_date: '',
    deadline: '',
    budget: ''
  })

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    try {
      setLoading(true)
      
      let url = '/api/projects'
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (typeFilter !== 'all') params.append('type', typeFilter)
      if (params.toString()) url += '?' + params.toString()
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки проектов')
      }

      const data = await response.json()
      setProjects(data.projects || [])

    } catch (error: any) {
      console.error('Ошибка загрузки проектов:', error)
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
      // Загружаем пользователей для назначения владельца
      const usersResponse = await fetch('/api/users')
      if (usersResponse.ok) {
        const { users: userData } = await usersResponse.json()
        setUsers(userData.filter((u: any) => u.status === 'active' && 
                                  ['manager', 'teamlead', 'hr', 'cfo', 'admin', 'ceo'].includes(u.role)))
      }
    } catch (error: any) {
      console.error('Ошибка загрузки данных для создания:', error)
    }
  }

  async function handleCreateProject() {
    if (!projectForm.title || !projectForm.owner_id) {
      addToast({
        type: 'error',
        title: 'Заполните обязательные поля',
        description: 'Название и владелец проекта обязательны'
      })
      return
    }

    try {
      setCreating(true)
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...projectForm,
          budget: projectForm.budget ? parseFloat(projectForm.budget) : null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка создания проекта')
      }

      addToast({
        type: 'success',
        title: 'Проект создан',
        description: data.message
      })

      setShowCreateModal(false)
      setProjectForm({
        title: '',
        description: '',
        project_type: 'development',
        owner_id: '',
        priority: 'medium',
        start_date: '',
        end_date: '',
        deadline: '',
        budget: ''
      })
      await loadProjects()

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

  const columns: Column<Project>[] = [
    {
      key: 'title',
      label: 'Проект',
      render: (project) => (
        <div>
          <div className="font-medium text-gray-900">{project.title}</div>
          <div className="text-sm text-gray-500 capitalize">{project.project_type}</div>
          <div className="text-xs text-blue-600">{project.status}</div>
        </div>
      )
    },
    {
      key: 'owner',
      label: 'Владелец',
      render: (project) => (
        <div>
          <div className="font-medium text-gray-900">
            {`${project.owner.first_name || ''} ${project.owner.last_name || ''}`.trim() || project.owner.email}
          </div>
          <div className="text-sm text-gray-500">{project.owner.email}</div>
          <div className="text-xs text-blue-600 capitalize">{project.owner.role}</div>
        </div>
      )
    },
    {
      key: 'progress',
      label: 'Прогресс',
      render: (project) => (
        <div className="w-full">
          <div className="flex justify-between text-sm mb-1">
            <span>{project.progress_percentage}%</span>
            <span className="text-gray-500">
              {project.task_stats.completed}/{project.task_stats.total}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${project.progress_percentage}%` }}
            ></div>
          </div>
        </div>
      )
    },
    {
      key: 'budget',
      label: 'Бюджет',
      render: (project) => (
        <div className="text-right">
          {project.budget ? (
            <>
              <div className="font-bold text-green-600">
                ${project.budget.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500">
                Потрачено: ${project.spent_amount.toFixed(2)}
              </div>
              <div className="text-xs text-orange-600">
                Остаток: ${(project.budget - project.spent_amount).toFixed(2)}
              </div>
            </>
          ) : (
            <span className="text-gray-500">Не указан</span>
          )}
        </div>
      )
    },
    {
      key: 'deadline',
      label: 'Дедлайн',
      render: (project) => {
        if (!project.deadline) {
          return <span className="text-gray-500">Не указан</span>
        }
        
        const isOverdue = new Date(project.deadline) < new Date()
        const daysLeft = Math.ceil((new Date(project.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        
        return (
          <div className={`text-sm ${isOverdue ? 'text-red-600' : daysLeft <= 7 ? 'text-orange-600' : 'text-gray-600'}`}>
            <div>{new Date(project.deadline).toLocaleDateString('ru-RU')}</div>
            <div className="text-xs">
              {isOverdue ? `Просрочен на ${Math.abs(daysLeft)} дн.` : `Осталось ${daysLeft} дн.`}
            </div>
          </div>
        )
      }
    },
    {
      key: 'priority',
      label: 'Приоритет',
      render: (project) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          project.priority === 'urgent' 
            ? 'bg-red-100 text-red-800'
            : project.priority === 'high'
            ? 'bg-orange-100 text-orange-800'
            : project.priority === 'medium'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {project.priority === 'urgent' ? 'Срочно' :
           project.priority === 'high' ? 'Высокий' :
           project.priority === 'medium' ? 'Средний' : 'Низкий'}
        </span>
      )
    }
  ]

  // Статистика
  const activeProjects = projects.filter(p => p.status === 'active')
  const completedProjects = projects.filter(p => p.status === 'completed')
  const overdueProjects = projects.filter(p => p.deadline && new Date(p.deadline) < new Date() && p.status === 'active')
  const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0)
  const totalSpent = projects.reduce((sum, p) => sum + (p.spent_amount || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Управление проектами</h1>
          <p className="text-gray-600">C-Level обзор всех проектов и задач</p>
        </div>
        <button
          onClick={() => {
            setShowCreateModal(true)
            loadCreateModalData()
          }}
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Создать проект
        </button>
      </div>

      {/* Информация о C-Level правах */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <ChartBarIcon className="h-5 w-5 text-purple-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-purple-800">
              C-Level управление проектами
            </h3>
            <div className="mt-2 text-sm text-purple-700">
              <p>• Полный обзор всех проектов и задач в системе</p>
              <p>• Агрегированные отчеты по прогрессу департаментов</p>
              <p>• Контроль % выполнения и задержек</p>
              <p>• Назначение через Coordinator/Team Leads, не напрямую Junior'ам</p>
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
              loadProjects()
            }}
            className="form-input"
          >
            <option value="all">Все статусы</option>
            <option value="active">Активные</option>
            <option value="completed">Завершенные</option>
            <option value="on_hold">Приостановленные</option>
            <option value="cancelled">Отмененные</option>
          </select>
        </div>
        <div>
          <label className="form-label">Тип</label>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value)
              loadProjects()
            }}
            className="form-input"
          >
            <option value="all">Все типы</option>
            <option value="development">Разработка</option>
            <option value="marketing">Маркетинг</option>
            <option value="operations">Операции</option>
            <option value="hr">HR</option>
            <option value="finance">Финансы</option>
            <option value="testing">Тестирование</option>
            <option value="other">Прочее</option>
          </select>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KPICard
          title="Всего проектов"
          value={projects.length}
          icon={<FolderIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Активных"
          value={activeProjects.length}
          icon={<ClockIcon className="h-6 w-6" />}
          color="warning"
        />
        <KPICard
          title="Завершенных"
          value={completedProjects.length}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="success"
        />
        <KPICard
          title="Просроченных"
          value={overdueProjects.length}
          icon={<ExclamationTriangleIcon className="h-6 w-6" />}
          color="danger"
        />
        <KPICard
          title="Бюджет"
          value={`$${totalBudget.toFixed(0)}k`}
          icon={<ChartBarIcon className="h-6 w-6" />}
          color="success"
        />
      </div>

      {/* Таблица проектов */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">
            Все проекты ({projects.length})
          </h3>
        </div>
        
        <DataTable
          data={projects}
          columns={columns}
          loading={loading}
          pagination={{ pageSize: 20 }}
          filtering={true}
          exportable={true}
          emptyMessage="Проекты не найдены"
        />
      </div>

      {/* Modal создания проекта */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Создать новый проект"
        size="lg"
      >
        <div className="space-y-4">
          {/* Название */}
          <div>
            <label className="form-label">Название проекта *</label>
            <input
              type="text"
              value={projectForm.title}
              onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
              className="form-input"
              placeholder="Название проекта"
              required
            />
          </div>

          {/* Описание */}
          <div>
            <label className="form-label">Описание</label>
            <textarea
              value={projectForm.description}
              onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
              className="form-input"
              rows={3}
              placeholder="Описание проекта..."
            />
          </div>

          {/* Тип и владелец */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Тип проекта</label>
              <select
                value={projectForm.project_type}
                onChange={(e) => setProjectForm({ ...projectForm, project_type: e.target.value })}
                className="form-input"
              >
                <option value="development">Разработка</option>
                <option value="marketing">Маркетинг</option>
                <option value="operations">Операции</option>
                <option value="hr">HR</option>
                <option value="finance">Финансы</option>
                <option value="testing">Тестирование</option>
                <option value="other">Прочее</option>
              </select>
            </div>
            <div>
              <label className="form-label">Владелец проекта *</label>
              <select
                value={projectForm.owner_id}
                onChange={(e) => setProjectForm({ ...projectForm, owner_id: e.target.value })}
                className="form-input"
                required
              >
                <option value="">Выберите владельца</option>
                {users.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email} ({user.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Приоритет и бюджет */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Приоритет</label>
              <select
                value={projectForm.priority}
                onChange={(e) => setProjectForm({ ...projectForm, priority: e.target.value })}
                className="form-input"
              >
                <option value="low">Низкий</option>
                <option value="medium">Средний</option>
                <option value="high">Высокий</option>
                <option value="urgent">Срочный</option>
              </select>
            </div>
            <div>
              <label className="form-label">Бюджет ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={projectForm.budget}
                onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })}
                className="form-input"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Даты */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="form-label">Дата начала</label>
              <input
                type="date"
                value={projectForm.start_date}
                onChange={(e) => setProjectForm({ ...projectForm, start_date: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Дата окончания</label>
              <input
                type="date"
                value={projectForm.end_date}
                onChange={(e) => setProjectForm({ ...projectForm, end_date: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Дедлайн</label>
              <input
                type="date"
                value={projectForm.deadline}
                onChange={(e) => setProjectForm({ ...projectForm, deadline: e.target.value })}
                className="form-input"
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
              onClick={handleCreateProject}
              className="btn-primary"
              disabled={creating || !projectForm.title || !projectForm.owner_id}
            >
              {creating ? 'Создание...' : 'Создать проект'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
