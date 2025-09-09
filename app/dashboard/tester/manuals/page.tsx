'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column, ActionButton } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import StatusBadge from '@/components/ui/StatusBadge'
import { 
  DocumentTextIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline'

interface CasinoManual {
  id: string
  title: string
  content: string
  version: number
  is_published: boolean
  created_at: string
  updated_at: string
  casino: {
    id: string
    name: string
    status: string
  }
  created_by_user: {
    first_name: string
    last_name: string
  }
}

export default function TesterManualsPage() {
  const { addToast } = useToast()
  const [manuals, setManuals] = useState<CasinoManual[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadManuals()
  }, [])

  async function loadManuals() {
    try {
      const response = await fetch('/api/casino-manuals')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка загрузки мануалов')
      }

      const { manuals: manualsData } = await response.json()
      setManuals(manualsData || [])

    } catch (error: any) {
      console.error('Ошибка загрузки мануалов:', error)
      addToast({
        type: 'error',
        title: 'Ошибка загрузки мануалов',
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  const columns: Column<CasinoManual>[] = [
    {
      key: 'title',
      label: 'Мануал',
      sortable: true,
      filterable: true,
      render: (manual) => (
        <div>
          <div className="font-medium text-gray-900">{manual.title}</div>
          <div className="text-sm text-gray-500">
            {manual.casino?.name} • Версия {manual.version}
          </div>
        </div>
      )
    },
    {
      key: 'is_published',
      label: 'Статус',
      sortable: true,
      render: (manual) => (
        <StatusBadge 
          status={manual.is_published ? 'approved' : 'pending'} 
          size="sm" 
        />
      )
    },
    {
      key: 'updated_at',
      label: 'Обновлен',
      sortable: true,
      render: (manual) => (
        <span className="text-sm text-gray-600">
          {new Date(manual.updated_at).toLocaleDateString('ru-RU')}
        </span>
      )
    }
  ]

  const actions: ActionButton<CasinoManual>[] = [
    {
      label: 'Редактировать',
      action: (manual) => {
        addToast({ type: 'info', title: 'Редактор мануалов - в разработке' })
      },
      variant: 'primary'
    },
    {
      label: 'Просмотр',
      action: (manual) => {
        addToast({ type: 'info', title: 'Просмотр мануала - в разработке' })
      },
      variant: 'secondary'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Мануалы казино</h1>
          <p className="text-gray-600">Создание и редактирование инструкций</p>
        </div>
        <button
          onClick={() => addToast({ type: 'info', title: 'Создание мануала - в разработке' })}
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Создать мануал
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Всего мануалов"
          value={manuals.length}
          icon={<DocumentTextIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Опубликованы"
          value={manuals.filter(m => m.is_published).length}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="success"
        />
        <KPICard
          title="Черновики"
          value={manuals.filter(m => !m.is_published).length}
          icon={<PencilIcon className="h-6 w-6" />}
          color="warning"
        />
        <KPICard
          title="Казино с мануалами"
          value={new Set(manuals.map(m => m.casino?.id)).size}
          icon={<ComputerDesktopIcon className="h-6 w-6" />}
          color="primary"
        />
      </div>

      {/* Таблица мануалов */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">
            Мануалы ({manuals.length})
          </h3>
        </div>
        
        <DataTable
          data={manuals}
          columns={columns}
          actions={actions}
          loading={loading}
          pagination={{ pageSize: 20 }}
          filtering={true}
          exportable={true}
          emptyMessage="Мануалы не найдены"
        />
      </div>

      {/* Информация */}
      <div className="bg-success-50 border border-success-200 rounded-lg p-6">
        <h3 className="font-medium text-success-900 mb-3">📝 Работа с мануалами</h3>
        <div className="text-sm text-success-800 space-y-2">
          <div>• <strong>Создавайте мануалы</strong> для каждого протестированного казино</div>
          <div>• <strong>Используйте версионирование</strong> для отслеживания изменений</div>
          <div>• <strong>Публикуйте мануалы</strong> для доступа Junior пользователям</div>
          <div>• <strong>Обновляйте инструкции</strong> при изменениях в казино</div>
        </div>
      </div>
    </div>
  )
}
