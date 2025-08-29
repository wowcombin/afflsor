'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import KPICard from '@/components/ui/KPICard'
import DataTable, { Column } from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import { ClipboardDocumentListIcon, PlusIcon } from '@heroicons/react/24/outline'

interface Task {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  status: 'new' | 'in_progress' | 'done'
  assigned_to: string
  created_by: string
  created_at: string
  due_date?: string
}

export default function JuniorTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    inProgress: 0,
    completed: 0
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadTasks()
    } else {
      setLoading(false)
    }
  }, [])

  async function loadTasks() {
    try {
      // TODO: Реализовать API для задач
      // Пока заглушка
      setTasks([])
      setStats({ total: 0, new: 0, inProgress: 0, completed: 0 })
    } catch (error) {
      console.error('Ошибка загрузки задач:', error)
    } finally {
      setLoading(false)
    }
  }

  const columns: Column[] = [
    {
      key: 'title',
      label: 'Задача',
      sortable: true
    },
    {
      key: 'priority',
      label: 'Приоритет',
      sortable: true,
      render: (task: Task) => {
        const priorityColors = {
          low: 'bg-gray-100 text-gray-800',
          medium: 'bg-yellow-100 text-yellow-800', 
          high: 'bg-red-100 text-red-800'
        }
        const priorityLabels = {
          low: '⚪ Низкий',
          medium: '🔵 Средний',
          high: '⚡ Высокий'
        }
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${priorityColors[task.priority as keyof typeof priorityColors]}`}>
            {priorityLabels[task.priority as keyof typeof priorityLabels]}
          </span>
        )
      }
    },
    {
      key: 'status',
      label: 'Статус',
      sortable: true,
      render: (task: Task) => (
        <StatusBadge status={task.status} />
      )
    },
    {
      key: 'created_at',
      label: 'Создана',
      sortable: true,
      render: (task: Task) => (
        <div className="text-sm text-gray-500">
          {new Date(task.created_at).toLocaleDateString('ru-RU')}
        </div>
      )
    }
  ]

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Мои задачи</h1>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <PlusIcon className="h-5 w-5 mr-2" />
          Создать задачу
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Всего задач"
          value={stats.total.toString()}
          icon={<ClipboardDocumentListIcon className="h-6 w-6" />}
        />
        <KPICard
          title="Новые"
          value={stats.new.toString()}
          color="blue"
        />
        <KPICard
          title="В работе"
          value={stats.inProgress.toString()}
          color="yellow"
        />
        <KPICard
          title="Завершено"
          value={stats.completed.toString()}
          color="green"
        />
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-lg shadow">
        <DataTable
          data={tasks}
          columns={columns}
          pagination={{ pageSize: 20 }}
          sorting={{ key: 'created_at', direction: 'desc' }}
          export={true}
        />
      </div>

      {/* Заглушка для будущей реализации */}
      <div className="mt-8 text-center text-gray-500">
        <ClipboardDocumentListIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium mb-2">Система задач в разработке</h3>
        <p className="text-sm">
          Здесь будут отображаться задачи от Manager и возможность создавать новые задачи
        </p>
      </div>
    </div>
  )
}
