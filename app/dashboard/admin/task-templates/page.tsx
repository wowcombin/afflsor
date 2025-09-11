'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column, ActionButton } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import Modal from '@/components/ui/Modal'
import { 
  DocumentDuplicateIcon,
  PlusIcon,
  CheckCircleIcon,
  UserIcon,
  ClipboardDocumentListIcon,
  PlayIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline'

interface TaskTemplate {
  id: string
  title: string
  description?: string
  category: string
  target_role?: string
  estimated_hours?: number
  default_priority: string
  checklist_items: string[]
  tags: string[]
  auto_assign: boolean
  is_active: boolean
  created_at: string
  created_by_user: {
    email: string
    first_name?: string
    last_name?: string
    role: string
  }
}

export default function TaskTemplatesPage() {
  const { addToast } = useToast()
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Модал создания шаблона
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [templateForm, setTemplateForm] = useState({
    title: '',
    description: '',
    category: 'onboarding',
    target_role: '',
    estimated_hours: '',
    default_priority: 'medium',
    checklist_items: [] as string[],
    tags: [] as string[],
    auto_assign: false
  })

  // Модал создания задачи из шаблона
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null)
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [creatingTask, setCreatingTask] = useState(false)
  const [taskForm, setTaskForm] = useState({
    assignee_id: '',
    project_id: '',
    due_date: '',
    custom_title: '',
    custom_description: '',
    custom_priority: '',
    additional_tags: [] as string[]
  })

  // Состояние для чек-листа
  const [newChecklistItem, setNewChecklistItem] = useState('')

  useEffect(() => {
    loadTemplates()
  }, [categoryFilter])

  async function loadTemplates() {
    try {
      setLoading(true)
      
      let url = '/api/task-templates'
      const params = new URLSearchParams()
      if (categoryFilter !== 'all') params.append('category', categoryFilter)
      if (params.toString()) url += '?' + params.toString()
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки шаблонов')
      }

      const data = await response.json()
      setTemplates(data.templates || [])

    } catch (error: any) {
      console.error('Ошибка загрузки шаблонов:', error)
      addToast({
        type: 'error',
        title: 'Ошибка загрузки данных',
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  async function loadCreateTaskData() {
    try {
      // Загружаем пользователей
      const usersResponse = await fetch('/api/users')
      if (usersResponse.ok) {
        const { users: userData } = await usersResponse.json()
        setUsers(userData.filter((u: any) => u.status === 'active'))
      }

      // Загружаем проекты
      const projectsResponse = await fetch('/api/projects?status=active')
      if (projectsResponse.ok) {
        const { projects: projectData } = await projectsResponse.json()
        setProjects(projectData || [])
      }
    } catch (error: any) {
      console.error('Ошибка загрузки данных:', error)
    }
  }

  async function handleCreateTemplate() {
    if (!templateForm.title) {
      addToast({
        type: 'error',
        title: 'Заполните название',
        description: 'Название шаблона обязательно'
      })
      return
    }

    try {
      setCreating(true)

      const response = await fetch('/api/task-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...templateForm,
          estimated_hours: templateForm.estimated_hours ? parseFloat(templateForm.estimated_hours) : null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка создания шаблона')
      }

      addToast({
        type: 'success',
        title: 'Шаблон создан',
        description: data.message
      })

      setShowCreateModal(false)
      resetTemplateForm()
      await loadTemplates()

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

  async function handleCreateTaskFromTemplate() {
    if (!selectedTemplate) return

    try {
      setCreatingTask(true)

      const response = await fetch(`/api/task-templates/${selectedTemplate.id}/create-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskForm)
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

      setShowCreateTaskModal(false)
      setSelectedTemplate(null)
      resetTaskForm()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка создания задачи',
        description: error.message
      })
    } finally {
      setCreatingTask(false)
    }
  }

  function resetTemplateForm() {
    setTemplateForm({
      title: '',
      description: '',
      category: 'onboarding',
      target_role: '',
      estimated_hours: '',
      default_priority: 'medium',
      checklist_items: [],
      tags: [],
      auto_assign: false
    })
  }

  function resetTaskForm() {
    setTaskForm({
      assignee_id: '',
      project_id: '',
      due_date: '',
      custom_title: '',
      custom_description: '',
      custom_priority: '',
      additional_tags: []
    })
  }

  function addChecklistItem() {
    if (newChecklistItem.trim()) {
      setTemplateForm({
        ...templateForm,
        checklist_items: [...templateForm.checklist_items, newChecklistItem.trim()]
      })
      setNewChecklistItem('')
    }
  }

  function removeChecklistItem(index: number) {
    setTemplateForm({
      ...templateForm,
      checklist_items: templateForm.checklist_items.filter((_, i) => i !== index)
    })
  }

  function openCreateTaskModal(template: TaskTemplate) {
    setSelectedTemplate(template)
    setTaskForm({
      ...taskForm,
      custom_title: template.title,
      custom_description: template.description || '',
      custom_priority: template.default_priority
    })
    setShowCreateTaskModal(true)
    loadCreateTaskData()
  }

  const columns: Column<TaskTemplate>[] = [
    {
      key: 'title',
      label: 'Шаблон',
      render: (template) => (
        <div>
          <div className="font-medium text-gray-900">{template.title}</div>
          <div className="text-sm text-gray-500 capitalize">{template.category}</div>
          {template.target_role && (
            <div className="text-xs text-blue-600 capitalize">Для: {template.target_role}</div>
          )}
        </div>
      )
    },
    {
      key: 'description',
      label: 'Описание',
      render: (template) => (
        <div className="max-w-xs">
          <div className="text-sm text-gray-600 truncate">
            {template.description || 'Без описания'}
          </div>
          {template.checklist_items.length > 0 && (
            <div className="text-xs text-green-600 mt-1">
              📋 {template.checklist_items.length} пунктов
            </div>
          )}
        </div>
      )
    },
    {
      key: 'default_priority',
      label: 'Приоритет',
      render: (template) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          template.default_priority === 'urgent' 
            ? 'bg-red-100 text-red-800'
            : template.default_priority === 'high'
            ? 'bg-orange-100 text-orange-800'
            : template.default_priority === 'medium'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {template.default_priority === 'urgent' ? 'Срочно' :
           template.default_priority === 'high' ? 'Высокий' :
           template.default_priority === 'medium' ? 'Средний' : 'Низкий'}
        </span>
      )
    },
    {
      key: 'estimated_hours',
      label: 'Время',
      render: (template) => (
        <div className="text-sm text-gray-600">
          {template.estimated_hours ? `${template.estimated_hours}ч` : '—'}
        </div>
      )
    },
    {
      key: 'tags',
      label: 'Теги',
      render: (template) => (
        <div className="flex flex-wrap gap-1">
          {template.tags.slice(0, 3).map((tag, index) => (
            <span key={index} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
              {tag}
            </span>
          ))}
          {template.tags.length > 3 && (
            <span className="text-xs text-gray-500">+{template.tags.length - 3}</span>
          )}
        </div>
      )
    },
    {
      key: 'created_by',
      label: 'Создатель',
      render: (template) => (
        <div>
          <div className="text-sm text-gray-600">
            {`${template.created_by_user.first_name || ''} ${template.created_by_user.last_name || ''}`.trim() || template.created_by_user.email}
          </div>
          <div className="text-xs text-gray-500 capitalize">{template.created_by_user.role}</div>
        </div>
      )
    }
  ]

  const actions: ActionButton<TaskTemplate>[] = [
    {
      label: 'Создать задачу',
      action: openCreateTaskModal,
      variant: 'primary',
      icon: PlayIcon
    }
  ]

  // Статистика
  const onboardingTemplates = templates.filter(t => t.category === 'onboarding')
  const hrTemplates = templates.filter(t => t.category === 'hr')
  const testingTemplates = templates.filter(t => t.category === 'testing')
  const generalTemplates = templates.filter(t => t.category === 'general')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Шаблоны задач</h1>
          <p className="text-gray-600">Создание и управление шаблонами для повторяющихся задач</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Создать шаблон
        </button>
      </div>

      {/* Информация о шаблонах */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <DocumentDuplicateIcon className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Шаблоны задач для автоматизации
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>• Онбординг: 5-шаговая адаптация новых сотрудников</p>
              <p>• HR: отчетность, NDA, KPI анализ</p>
              <p>• Тестирование: функциональные, регрессионные тесты</p>
              <p>• Общие: повторяющиеся бизнес-процессы</p>
            </div>
          </div>
        </div>
      </div>

      {/* Фильтр по категории */}
      <div className="flex space-x-4">
        <div>
          <label className="form-label">Категория</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="form-input"
          >
            <option value="all">Все категории</option>
            <option value="onboarding">Онбординг</option>
            <option value="hr">HR процессы</option>
            <option value="testing">Тестирование</option>
            <option value="development">Разработка</option>
            <option value="general">Общие</option>
          </select>
        </div>
      </div>

      {/* Статистика по категориям */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KPICard
          title="Всего шаблонов"
          value={templates.length}
          icon={<DocumentDuplicateIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Онбординг"
          value={onboardingTemplates.length}
          icon={<UserIcon className="h-6 w-6" />}
          color="success"
        />
        <KPICard
          title="HR процессы"
          value={hrTemplates.length}
          icon={<ClipboardDocumentListIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Тестирование"
          value={testingTemplates.length}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="warning"
        />
        <KPICard
          title="Общие"
          value={generalTemplates.length}
          icon={<ClipboardDocumentListIcon className="h-6 w-6" />}
          color="primary"
        />
      </div>

      {/* Таблица шаблонов */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">
            Шаблоны задач ({templates.length})
          </h3>
        </div>
        
        <DataTable
          data={templates}
          columns={columns}
          actions={actions}
          loading={loading}
          pagination={{ pageSize: 20 }}
          filtering={true}
          exportable={true}
          emptyMessage="Шаблоны не найдены"
        />
      </div>

      {/* Modal создания шаблона */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Создать шаблон задачи"
        size="lg"
      >
        <div className="space-y-4">
          {/* Название и категория */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Название шаблона *</label>
              <input
                type="text"
                value={templateForm.title}
                onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                className="form-input"
                placeholder="Адаптация нового Junior'а"
                required
              />
            </div>
            <div>
              <label className="form-label">Категория</label>
              <select
                value={templateForm.category}
                onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                className="form-input"
              >
                <option value="onboarding">Онбординг</option>
                <option value="hr">HR процессы</option>
                <option value="testing">Тестирование</option>
                <option value="development">Разработка</option>
                <option value="general">Общие</option>
              </select>
            </div>
          </div>

          {/* Описание */}
          <div>
            <label className="form-label">Описание</label>
            <textarea
              value={templateForm.description}
              onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
              className="form-input"
              rows={3}
              placeholder="Подробное описание шаблона и его назначения..."
            />
          </div>

          {/* Целевая роль и параметры */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="form-label">Для роли</label>
              <select
                value={templateForm.target_role}
                onChange={(e) => setTemplateForm({ ...templateForm, target_role: e.target.value })}
                className="form-input"
              >
                <option value="">Любая роль</option>
                <option value="hr">HR</option>
                <option value="teamlead">Team Lead</option>
                <option value="junior">Junior</option>
                <option value="tester">Tester</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            <div>
              <label className="form-label">Приоритет</label>
              <select
                value={templateForm.default_priority}
                onChange={(e) => setTemplateForm({ ...templateForm, default_priority: e.target.value })}
                className="form-input"
              >
                <option value="low">Низкий</option>
                <option value="medium">Средний</option>
                <option value="high">Высокий</option>
                <option value="urgent">Срочный</option>
              </select>
            </div>
            <div>
              <label className="form-label">Время (часы)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={templateForm.estimated_hours}
                onChange={(e) => setTemplateForm({ ...templateForm, estimated_hours: e.target.value })}
                className="form-input"
                placeholder="4.0"
              />
            </div>
          </div>

          {/* Чек-лист */}
          <div>
            <label className="form-label">Чек-лист задач</label>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  className="form-input flex-1"
                  placeholder="Добавить пункт чек-листа..."
                  onKeyPress={(e) => e.key === 'Enter' && addChecklistItem()}
                />
                <button
                  type="button"
                  onClick={addChecklistItem}
                  className="btn-secondary"
                >
                  Добавить
                </button>
              </div>
              {templateForm.checklist_items.length > 0 && (
                <div className="border rounded-lg p-3 space-y-2">
                  {templateForm.checklist_items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-sm">{index + 1}. {item}</span>
                      <button
                        type="button"
                        onClick={() => removeChecklistItem(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
              onClick={handleCreateTemplate}
              className="btn-primary"
              disabled={creating || !templateForm.title}
            >
              {creating ? 'Создание...' : 'Создать шаблон'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal создания задачи из шаблона */}
      <Modal
        isOpen={showCreateTaskModal}
        onClose={() => setShowCreateTaskModal(false)}
        title={`Создать задачу из шаблона: ${selectedTemplate?.title}`}
        size="lg"
      >
        <div className="space-y-4">
          {selectedTemplate && (
            <>
              {/* Информация о шаблоне */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Шаблон:</h4>
                <p className="text-sm text-gray-600 mb-2">{selectedTemplate.description}</p>
                {selectedTemplate.checklist_items.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Чек-лист ({selectedTemplate.checklist_items.length} пунктов):</p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {selectedTemplate.checklist_items.slice(0, 3).map((item, index) => (
                        <li key={index}>• {item}</li>
                      ))}
                      {selectedTemplate.checklist_items.length > 3 && (
                        <li className="text-gray-500">... и еще {selectedTemplate.checklist_items.length - 3} пунктов</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {/* Настройки задачи */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Название (можно изменить)</label>
                  <input
                    type="text"
                    value={taskForm.custom_title}
                    onChange={(e) => setTaskForm({ ...taskForm, custom_title: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Приоритет</label>
                  <select
                    value={taskForm.custom_priority}
                    onChange={(e) => setTaskForm({ ...taskForm, custom_priority: e.target.value })}
                    className="form-input"
                  >
                    <option value="">Из шаблона ({selectedTemplate.default_priority})</option>
                    <option value="low">Низкий</option>
                    <option value="medium">Средний</option>
                    <option value="high">Высокий</option>
                    <option value="urgent">Срочный</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Описание (можно изменить)</label>
                <textarea
                  value={taskForm.custom_description}
                  onChange={(e) => setTaskForm({ ...taskForm, custom_description: e.target.value })}
                  className="form-input"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Назначить исполнителя</label>
                  <select
                    value={taskForm.assignee_id}
                    onChange={(e) => setTaskForm({ ...taskForm, assignee_id: e.target.value })}
                    className="form-input"
                  >
                    <option value="">Выберите исполнителя</option>
                    {users
                      .filter((user: any) => !selectedTemplate.target_role || user.role === selectedTemplate.target_role)
                      .map((user: any) => (
                        <option key={user.id} value={user.id}>
                          {`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email} ({user.role})
                        </option>
                      ))}
                  </select>
                </div>
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
            </>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowCreateTaskModal(false)}
              className="btn-secondary"
              disabled={creatingTask}
            >
              Отмена
            </button>
            <button
              onClick={handleCreateTaskFromTemplate}
              className="btn-primary"
              disabled={creatingTask}
            >
              {creatingTask ? 'Создание...' : 'Создать задачу'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
