'use client'

import { useState, useEffect } from 'react'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { 
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline'

interface Template {
  id: string
  name: string
  description: string
  content: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function NDATemplatesPage() {
  const { addToast } = useToast()
  
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [viewingTemplate, setViewingTemplate] = useState<Template | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    content: '',
    is_active: true
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/nda/templates')
      const data = await response.json()
      
      if (data.success) {
        setTemplates(data.data)
      } else {
        addToast({ type: 'error', title: 'Ошибка', description: data.error })
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Не удалось загрузить шаблоны' })
    } finally {
      setLoading(false)
    }
  }

  const createTemplate = async () => {
    try {
      const response = await fetch('/api/nda/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (result.success) {
        addToast({ 
          type: 'success', 
          title: 'Успешно', 
          description: 'Шаблон создан' 
        })
        setShowCreateModal(false)
        resetForm()
        await fetchTemplates()
      } else {
        addToast({ type: 'error', title: 'Ошибка', description: result.error })
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Не удалось создать шаблон' })
    }
  }

  const updateTemplate = async () => {
    if (!editingTemplate) return

    try {
      const response = await fetch(`/api/nda/templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (result.success) {
        addToast({ 
          type: 'success', 
          title: 'Успешно', 
          description: 'Шаблон обновлен' 
        })
        setShowEditModal(false)
        setEditingTemplate(null)
        resetForm()
        await fetchTemplates()
      } else {
        addToast({ type: 'error', title: 'Ошибка', description: result.error })
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Не удалось обновить шаблон' })
    }
  }

  const deleteTemplate = async (template: Template) => {
    if (!confirm(`Вы уверены, что хотите удалить шаблон "${template.name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/nda/templates/${template.id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        addToast({ 
          type: 'success', 
          title: 'Успешно', 
          description: 'Шаблон удален' 
        })
        await fetchTemplates()
      } else {
        addToast({ type: 'error', title: 'Ошибка', description: result.error })
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Не удалось удалить шаблон' })
    }
  }

  const viewTemplate = (template: Template) => {
    setViewingTemplate(template)
    setShowViewModal(true)
  }

  const editTemplate = (template: Template) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      description: template.description,
      content: template.content,
      is_active: template.is_active
    })
    setShowEditModal(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      content: '',
      is_active: true
    })
  }

  const columns = [
    {
      key: 'name',
      label: 'Название',
      render: (template: Template) => (
        <div>
          <div className="font-medium text-gray-900">{template.name}</div>
          <div className="text-sm text-gray-500">{template.description}</div>
        </div>
      )
    },
    {
      key: 'is_active',
      label: 'Статус',
      render: (template: Template) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          template.is_active 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {template.is_active ? 'Активный' : 'Неактивный'}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Создан',
      render: (template: Template) => (
        <div className="text-sm text-gray-500">
          {new Date(template.created_at).toLocaleDateString('ru-RU')}
        </div>
      )
    },
    {
      key: 'updated_at',
      label: 'Обновлен',
      render: (template: Template) => (
        <div className="text-sm text-gray-500">
          {new Date(template.updated_at).toLocaleDateString('ru-RU')}
        </div>
      )
    }
  ]

  const actions = [
    {
      label: 'Просмотр',
      action: (template: Template) => viewTemplate(template),
      variant: 'secondary' as const,
      icon: EyeIcon
    },
    {
      label: 'Редактировать',
      action: (template: Template) => editTemplate(template),
      variant: 'primary' as const,
      icon: PencilIcon
    },
    {
      label: 'Удалить',
      action: (template: Template) => deleteTemplate(template),
      variant: 'danger' as const,
      icon: TrashIcon
    }
  ]

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Всего шаблонов</h3>
          <p className="text-2xl font-bold text-gray-900">{templates.length}</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Активных</h3>
          <p className="text-2xl font-bold text-success-600">
            {templates.filter(t => t.is_active).length}
          </p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Неактивных</h3>
          <p className="text-2xl font-bold text-warning-600">
            {templates.filter(t => !t.is_active).length}
          </p>
        </div>
      </div>

      {/* Таблица шаблонов */}
      <div className="card">
        <div className="card-header flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Шаблоны NDA</h3>
            <p className="text-sm text-gray-500">Управление шаблонами соглашений о неразглашении</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Создать шаблон
          </button>
        </div>
        <DataTable
          data={templates}
          columns={columns}
          actions={actions}
          loading={loading}
          filtering={true}
        />
      </div>

      {/* Модальное окно создания шаблона */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          resetForm()
        }}
        title="Создать новый шаблон NDA"
        size="xl"
      >
        <div className="space-y-4">
          <div>
            <label className="form-label">Название шаблона *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="form-input w-full"
              placeholder="Например: Стандартный NDA"
            />
          </div>

          <div>
            <label className="form-label">Описание</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="form-input w-full"
              placeholder="Краткое описание шаблона"
            />
          </div>

          <div>
            <label className="form-label">Содержание NDA *</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              className="form-input w-full"
              rows={12}
              placeholder="Введите текст соглашения о неразглашении..."
            />
            <p className="text-sm text-gray-500 mt-1">
              Используйте плейсхолдеры: [FULL_NAME], [SIGNATURE_DATE], [ADDRESS], [PASSPORT]
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active_create"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="mr-2"
            />
            <label htmlFor="is_active_create" className="text-sm text-gray-700">
              Активный шаблон
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={createTemplate}
              disabled={!formData.name || !formData.content}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              Создать шаблон
            </button>
            <button
              onClick={() => {
                setShowCreateModal(false)
                resetForm()
              }}
              className="btn-secondary flex-1"
            >
              Отмена
            </button>
          </div>
        </div>
      </Modal>

      {/* Модальное окно редактирования шаблона */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingTemplate(null)
          resetForm()
        }}
        title="Редактировать шаблон NDA"
        size="xl"
      >
        <div className="space-y-4">
          <div>
            <label className="form-label">Название шаблона *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="form-input w-full"
            />
          </div>

          <div>
            <label className="form-label">Описание</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="form-input w-full"
            />
          </div>

          <div>
            <label className="form-label">Содержание NDA *</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              className="form-input w-full"
              rows={12}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active_edit"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="mr-2"
            />
            <label htmlFor="is_active_edit" className="text-sm text-gray-700">
              Активный шаблон
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={updateTemplate}
              disabled={!formData.name || !formData.content}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              Сохранить изменения
            </button>
            <button
              onClick={() => {
                setShowEditModal(false)
                setEditingTemplate(null)
                resetForm()
              }}
              className="btn-secondary flex-1"
            >
              Отмена
            </button>
          </div>
        </div>
      </Modal>

      {/* Модальное окно просмотра шаблона */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false)
          setViewingTemplate(null)
        }}
        title="Просмотр шаблона NDA"
        size="xl"
      >
        {viewingTemplate && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Название</label>
                <p className="text-gray-900">{viewingTemplate.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Статус</label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  viewingTemplate.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {viewingTemplate.is_active ? 'Активный' : 'Неактивный'}
                </span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Описание</label>
              <p className="text-gray-900">{viewingTemplate.description || 'Нет описания'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Содержание</label>
              <div className="mt-2 p-4 border rounded-lg bg-gray-50 max-h-96 overflow-y-auto">
                <div className="whitespace-pre-wrap text-sm">
                  {viewingTemplate.content}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
              <div>
                <label className="font-medium">Создан</label>
                <p>{new Date(viewingTemplate.created_at).toLocaleString('ru-RU')}</p>
              </div>
              <div>
                <label className="font-medium">Обновлен</label>
                <p>{new Date(viewingTemplate.updated_at).toLocaleString('ru-RU')}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
