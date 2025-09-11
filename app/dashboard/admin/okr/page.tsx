'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column, ActionButton } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import Modal from '@/components/ui/Modal'
import { 
  TrophyIcon,
  UserIcon,
  CheckCircleIcon,
  PlusIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'

interface StrategicGoal {
  id: string
  title: string
  description?: string
  goal_type: string
  status: string
  quarter?: string
  year: number
  target_value: number
  current_value: number
  unit: string
  start_date: string
  end_date: string
  progress_percentage: number
  achievement_status: string
  is_overdue: boolean
  days_left: number | null
  owner: {
    id: string
    email: string
    first_name?: string
    last_name?: string
    role: string
  }
  linked_project_ids?: string[]
}

export default function AdminOKRPage() {
  const { addToast } = useToast()
  const [goals, setGoals] = useState<StrategicGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [quarterFilter, setQuarterFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Модал создания цели
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [creating, setCreating] = useState(false)
  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    goal_type: 'okr',
    owner_id: '',
    quarter: '',
    year: new Date().getFullYear().toString(),
    target_value: '',
    unit: '',
    start_date: '',
    end_date: '',
    linked_project_ids: [] as string[]
  })

  useEffect(() => {
    loadGoals()
  }, [])

  async function loadGoals() {
    try {
      setLoading(true)
      
      let url = '/api/strategic-goals'
      const params = new URLSearchParams()
      if (quarterFilter !== 'all') params.append('quarter', quarterFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (params.toString()) url += '?' + params.toString()
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки стратегических целей')
      }

      const data = await response.json()
      setGoals(data.goals || [])

    } catch (error: any) {
      console.error('Ошибка загрузки стратегических целей:', error)
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
      // Загружаем пользователей
      const usersResponse = await fetch('/api/users')
      if (usersResponse.ok) {
        const { users: userData } = await usersResponse.json()
        setUsers(userData.filter((u: any) => u.status === 'active' && 
                                  ['manager', 'teamlead', 'hr', 'cfo', 'admin', 'ceo'].includes(u.role)))
      }

      // Загружаем проекты
      const projectsResponse = await fetch('/api/projects?status=active')
      if (projectsResponse.ok) {
        const { projects: projectData } = await projectsResponse.json()
        setProjects(projectData || [])
      }
    } catch (error: any) {
      console.error('Ошибка загрузки данных для создания:', error)
    }
  }

  async function handleCreateGoal() {
    if (!goalForm.title || !goalForm.owner_id || !goalForm.target_value || 
        !goalForm.start_date || !goalForm.end_date) {
      addToast({
        type: 'error',
        title: 'Заполните обязательные поля',
        description: 'Все основные поля должны быть заполнены'
      })
      return
    }

    try {
      setCreating(true)
      const response = await fetch('/api/strategic-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...goalForm,
          target_value: parseFloat(goalForm.target_value),
          year: parseInt(goalForm.year),
          linked_project_ids: goalForm.linked_project_ids.length > 0 ? goalForm.linked_project_ids : null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка создания цели')
      }

      addToast({
        type: 'success',
        title: 'Цель создана',
        description: data.message
      })

      setShowCreateModal(false)
      setGoalForm({
        title: '',
        description: '',
        goal_type: 'okr',
        owner_id: '',
        quarter: '',
        year: new Date().getFullYear().toString(),
        target_value: '',
        unit: '',
        start_date: '',
        end_date: '',
        linked_project_ids: []
      })
      await loadGoals()

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

  const columns: Column<StrategicGoal>[] = [
    {
      key: 'title',
      label: 'Цель',
      render: (goal) => (
        <div>
          <div className="font-medium text-gray-900">{goal.title}</div>
          <div className="text-sm text-gray-500 capitalize">{goal.goal_type}</div>
          {goal.quarter && (
            <div className="text-xs text-blue-600">{goal.quarter}</div>
          )}
        </div>
      )
    },
    {
      key: 'owner',
      label: 'Владелец',
      render: (goal) => (
        <div>
          <div className="font-medium text-gray-900">
            {`${goal.owner.first_name || ''} ${goal.owner.last_name || ''}`.trim() || goal.owner.email}
          </div>
          <div className="text-sm text-gray-500">{goal.owner.email}</div>
          <div className="text-xs text-blue-600 capitalize">{goal.owner.role}</div>
        </div>
      )
    },
    {
      key: 'progress',
      label: 'Прогресс',
      render: (goal) => (
        <div className="w-full">
          <div className="flex justify-between text-sm mb-1">
            <span>{goal.progress_percentage.toFixed(1)}%</span>
            <span className="text-gray-500">
              {goal.current_value.toFixed(1)}/{goal.target_value.toFixed(1)} {goal.unit}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                goal.achievement_status === 'achieved' ? 'bg-green-600' :
                goal.achievement_status === 'on_track' ? 'bg-blue-600' :
                goal.achievement_status === 'at_risk' ? 'bg-yellow-600' : 'bg-red-600'
              }`}
              style={{ width: `${Math.min(goal.progress_percentage, 100)}%` }}
            ></div>
          </div>
        </div>
      )
    },
    {
      key: 'achievement_status',
      label: 'Статус',
      render: (goal) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          goal.achievement_status === 'achieved' 
            ? 'bg-green-100 text-green-800'
            : goal.achievement_status === 'on_track'
            ? 'bg-blue-100 text-blue-800'
            : goal.achievement_status === 'at_risk'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {goal.achievement_status === 'achieved' ? 'Достигнута' :
           goal.achievement_status === 'on_track' ? 'В процессе' :
           goal.achievement_status === 'at_risk' ? 'Под угрозой' : 'Критично'}
        </span>
      )
    },
    {
      key: 'deadline',
      label: 'Дедлайн',
      render: (goal) => {
        const isOverdue = goal.is_overdue
        const daysLeft = goal.days_left
        
        return (
          <div className={`text-sm ${isOverdue ? 'text-red-600' : daysLeft && daysLeft <= 7 ? 'text-orange-600' : 'text-gray-600'}`}>
            <div>{new Date(goal.end_date).toLocaleDateString('ru-RU')}</div>
            <div className="text-xs">
              {isOverdue ? `Просрочена на ${Math.abs(daysLeft || 0)} дн.` : 
               daysLeft ? `Осталось ${daysLeft} дн.` : 'Завершена'}
            </div>
          </div>
        )
      }
    }
  ]

  // Статистика
  const activeGoals = goals.filter(g => g.status === 'active')
  const achievedGoals = goals.filter(g => g.achievement_status === 'achieved')
  const overdueGoals = goals.filter(g => g.is_overdue)
  const onTrackGoals = goals.filter(g => g.achievement_status === 'on_track')
  const atRiskGoals = goals.filter(g => g.achievement_status === 'at_risk')

  // Генерируем кварталы для фильтра
  const currentYear = new Date().getFullYear()
  const quarters = [
    `${currentYear}-Q1`, `${currentYear}-Q2`, `${currentYear}-Q3`, `${currentYear}-Q4`,
    `${currentYear + 1}-Q1`, `${currentYear + 1}-Q2`, `${currentYear + 1}-Q3`, `${currentYear + 1}-Q4`
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">OKR и стратегические цели</h1>
          <p className="text-gray-600">Управление стратегическими целями компании</p>
        </div>
        <button
          onClick={() => {
            setShowCreateModal(true)
            loadCreateModalData()
          }}
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Создать цель
        </button>
      </div>

      {/* Информация о OKR */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <TrophyIcon className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Система OKR и стратегических целей
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>• Устанавливайте квартальные и годовые цели</p>
              <p>• Привязывайте цели к конкретным проектам</p>
              <p>• Отслеживайте прогресс в реальном времени</p>
              <p>• Пример: "Запустить новый продукт до декабря" с целевым значением 100%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Фильтры */}
      <div className="flex space-x-4">
        <div>
          <label className="form-label">Квартал</label>
          <select
            value={quarterFilter}
            onChange={(e) => {
              setQuarterFilter(e.target.value)
              loadGoals()
            }}
            className="form-input"
          >
            <option value="all">Все кварталы</option>
            {quarters.map(q => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Статус</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              loadGoals()
            }}
            className="form-input"
          >
            <option value="all">Все статусы</option>
            <option value="active">Активные</option>
            <option value="completed">Завершенные</option>
            <option value="paused">Приостановленные</option>
            <option value="cancelled">Отмененные</option>
          </select>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KPICard
          title="Всего целей"
          value={goals.length}
          icon={<TrophyIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Активных"
          value={activeGoals.length}
          icon={<ClockIcon className="h-6 w-6" />}
          color="warning"
        />
        <KPICard
          title="Достигнуты"
          value={achievedGoals.length}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="success"
        />
        <KPICard
          title="В процессе"
          value={onTrackGoals.length}
          icon={<ChartBarIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Под угрозой"
          value={atRiskGoals.length + overdueGoals.length}
          icon={<ExclamationTriangleIcon className="h-6 w-6" />}
          color="danger"
        />
      </div>

      {/* Таблица целей */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">
            Стратегические цели ({goals.length})
          </h3>
        </div>
        
        <DataTable
          data={goals}
          columns={columns}
          loading={loading}
          pagination={{ pageSize: 20 }}
          filtering={true}
          exportable={true}
          emptyMessage="Стратегические цели не найдены"
        />
      </div>

      {/* Modal создания цели */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Создать стратегическую цель"
        size="lg"
      >
        <div className="space-y-4">
          {/* Название */}
          <div>
            <label className="form-label">Название цели *</label>
            <input
              type="text"
              value={goalForm.title}
              onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
              className="form-input"
              placeholder="Например: Запустить новый продукт до декабря"
              required
            />
          </div>

          {/* Описание */}
          <div>
            <label className="form-label">Описание</label>
            <textarea
              value={goalForm.description}
              onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
              className="form-input"
              rows={3}
              placeholder="Подробное описание цели..."
            />
          </div>

          {/* Тип и владелец */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Тип цели</label>
              <select
                value={goalForm.goal_type}
                onChange={(e) => setGoalForm({ ...goalForm, goal_type: e.target.value })}
                className="form-input"
              >
                <option value="okr">OKR</option>
                <option value="milestone">Milestone</option>
                <option value="kpi">KPI</option>
              </select>
            </div>
            <div>
              <label className="form-label">Владелец цели *</label>
              <select
                value={goalForm.owner_id}
                onChange={(e) => setGoalForm({ ...goalForm, owner_id: e.target.value })}
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

          {/* Период */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="form-label">Квартал</label>
              <select
                value={goalForm.quarter}
                onChange={(e) => setGoalForm({ ...goalForm, quarter: e.target.value })}
                className="form-input"
              >
                <option value="">Не привязан к кварталу</option>
                {quarters.map(q => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Год</label>
              <input
                type="number"
                min="2024"
                max="2030"
                value={goalForm.year}
                onChange={(e) => setGoalForm({ ...goalForm, year: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Единица измерения</label>
              <input
                type="text"
                value={goalForm.unit}
                onChange={(e) => setGoalForm({ ...goalForm, unit: e.target.value })}
                className="form-input"
                placeholder="USD, %, шт, и т.д."
              />
            </div>
          </div>

          {/* Целевое значение */}
          <div>
            <label className="form-label">Целевое значение *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={goalForm.target_value}
              onChange={(e) => setGoalForm({ ...goalForm, target_value: e.target.value })}
              className="form-input"
              placeholder="100"
              required
            />
          </div>

          {/* Даты */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Дата начала *</label>
              <input
                type="date"
                value={goalForm.start_date}
                onChange={(e) => setGoalForm({ ...goalForm, start_date: e.target.value })}
                className="form-input"
                required
              />
            </div>
            <div>
              <label className="form-label">Дата окончания *</label>
              <input
                type="date"
                value={goalForm.end_date}
                onChange={(e) => setGoalForm({ ...goalForm, end_date: e.target.value })}
                className="form-input"
                required
              />
            </div>
          </div>

          {/* Связанные проекты */}
          <div>
            <label className="form-label">Связанные проекты (опционально)</label>
            <select
              multiple
              value={goalForm.linked_project_ids}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value)
                setGoalForm({ ...goalForm, linked_project_ids: selected })
              }}
              className="form-input"
              size={4}
            >
              {projects.map((project: any) => (
                <option key={project.id} value={project.id}>
                  {project.title} ({project.project_type})
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Удерживайте Ctrl (Cmd) для выбора нескольких проектов
            </p>
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
              onClick={handleCreateGoal}
              className="btn-primary"
              disabled={creating || !goalForm.title || !goalForm.owner_id || !goalForm.target_value || 
                       !goalForm.start_date || !goalForm.end_date}
            >
              {creating ? 'Создание...' : 'Создать цель'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
