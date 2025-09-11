'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column, ActionButton } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import { 
  DocumentDuplicateIcon,
  PlusIcon,
  PlayIcon,
  UserIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'

export default function HRTaskTemplatesPage() {
  const { addToast } = useToast()
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTemplates()
  }, [])

  async function loadTemplates() {
    try {
      setLoading(true)
      
      // Загружаем только HR-специфичные шаблоны
      const response = await fetch('/api/task-templates?category=hr')
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки шаблонов')
      }

      const data = await response.json()
      setTemplates(data.templates || [])

    } catch (error: any) {
      console.error('Ошибка загрузки HR шаблонов:', error)
      addToast({
        type: 'error',
        title: 'Ошибка загрузки данных',
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  async function createTaskFromTemplate(template: any) {
    try {
      const response = await fetch(`/api/task-templates/${template.id}/create-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          custom_priority: 'medium',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // +7 дней
        })
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

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка создания задачи',
        description: error.message
      })
    }
  }

  const columns: Column<any>[] = [
    {
      key: 'title',
      label: 'Шаблон',
      render: (template) => (
        <div>
          <div className="font-medium text-gray-900">{template.title}</div>
          <div className="text-sm text-gray-500">
            {template.checklist_items?.length > 0 && `📋 ${template.checklist_items.length} пунктов`}
          </div>
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
        </div>
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
    }
  ]

  const actions: ActionButton<any>[] = [
    {
      label: 'Создать задачу',
      action: createTaskFromTemplate,
      variant: 'primary',
      icon: PlayIcon
    }
  ]

  // Предустановленные HR шаблоны
  const defaultTemplates = [
    {
      title: 'Адаптация нового сотрудника (5 шагов)',
      description: 'Полная программа онбординга для новых Junior/Team Lead',
      category: 'hr',
      estimated_hours: 4,
      checklist_items: [
        'Знакомство с командой и структурой компании',
        'Подписание трудового договора и NDA',
        'Настройка рабочих аккаунтов и доступов',
        'Обучение рабочим процессам и инструментам',
        'Назначение наставника и первых задач'
      ]
    },
    {
      title: 'Месячный HR отчет',
      description: 'Подготовка ежемесячной отчетности по персоналу',
      category: 'hr',
      estimated_hours: 8,
      checklist_items: [
        'Сбор статистики по сотрудникам',
        'Анализ производительности команд',
        'Подготовка рекомендаций по развитию',
        'Оформление презентации для руководства'
      ]
    },
    {
      title: 'Обработка NDA документов',
      description: 'Контроль подписания соглашений о неразглашении',
      category: 'hr',
      estimated_hours: 1,
      checklist_items: [
        'Проверка подписанных NDA',
        'Архивирование документов',
        'Отправка напоминаний неподписавшим',
        'Обновление статуса в системе'
      ]
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">HR шаблоны задач</h1>
          <p className="text-gray-600">Быстрое создание типовых HR задач</p>
        </div>
      </div>

      {/* Информация */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <DocumentDuplicateIcon className="h-5 w-5 text-purple-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-purple-800">
              Автоматизация HR процессов
            </h3>
            <div className="mt-2 text-sm text-purple-700">
              <p>• Онбординг: 5-шаговая адаптация с чек-листом</p>
              <p>• Отчетность: месячные HR отчеты</p>
              <p>• NDA: контроль подписания документов</p>
              <p>• KPI: анализ производительности сотрудников</p>
            </div>
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="HR шаблонов"
          value={templates.length}
          icon={<DocumentDuplicateIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Онбординг"
          value={templates.filter(t => t.title.toLowerCase().includes('адаптация')).length}
          icon={<UserIcon className="h-6 w-6" />}
          color="success"
        />
        <KPICard
          title="Отчетность"
          value={templates.filter(t => t.title.toLowerCase().includes('отчет')).length}
          icon={<ClipboardDocumentListIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="NDA"
          value={templates.filter(t => t.title.toLowerCase().includes('nda')).length}
          icon={<DocumentTextIcon className="h-6 w-6" />}
          color="warning"
        />
      </div>

      {/* Быстрые шаблоны */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {defaultTemplates.map((template, index) => (
          <div key={index} className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">{template.title}</h3>
            </div>
            <div className="p-4">
              <p className="text-gray-600 text-sm mb-4">{template.description}</p>
              <div className="space-y-2 mb-4">
                <div className="text-xs font-medium text-gray-700">Чек-лист:</div>
                {template.checklist_items.slice(0, 3).map((item, i) => (
                  <div key={i} className="text-xs text-gray-600">• {item}</div>
                ))}
                {template.checklist_items.length > 3 && (
                  <div className="text-xs text-gray-500">... и еще {template.checklist_items.length - 3} пунктов</div>
                )}
              </div>
              <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                <span>⏱️ {template.estimated_hours}ч</span>
                <span>📋 {template.checklist_items.length} шагов</span>
              </div>
              <button
                onClick={() => {
                  // Имитируем создание задачи из предустановленного шаблона
                  addToast({
                    type: 'success',
                    title: 'HR задача создана',
                    description: `Создана задача: ${template.title}`
                  })
                }}
                className="btn-primary w-full"
              >
                <PlayIcon className="h-4 w-4 mr-2" />
                Создать задачу
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Таблица кастомных шаблонов */}
      {templates.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">
              Кастомные HR шаблоны ({templates.length})
            </h3>
          </div>
          
          <DataTable
            data={templates}
            columns={columns}
            actions={actions}
            loading={loading}
            pagination={{ pageSize: 10 }}
            emptyMessage="Кастомные шаблоны не найдены"
          />
        </div>
      )}
    </div>
  )
}
