'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import { 
  BuildingLibraryIcon,
  ComputerDesktopIcon,
  UserIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface AssignedBank {
  id: string
  assigned_at: string
  notes?: string
  bank: {
    id: string
    name: string
    country: string
    is_active: boolean
  }
}

interface AssignedCasino {
  id: string
  assigned_at: string
  notes?: string
  casino: {
    id: string
    name: string
    url: string
    status: string
  }
}

export default function TeamLeadAssignmentsPage() {
  const { addToast } = useToast()
  const [assignedBanks, setAssignedBanks] = useState<AssignedBank[]>([])
  const [assignedCasinos, setAssignedCasinos] = useState<AssignedCasino[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'banks' | 'casinos'>('banks')

  useEffect(() => {
    loadAssignments()
  }, [])

  async function loadAssignments() {
    try {
      setLoading(true)

      // Загружаем назначенные банки
      const banksResponse = await fetch('/api/teamlead/assigned-banks')
      if (banksResponse.ok) {
        const { banks } = await banksResponse.json()
        setAssignedBanks(banks)
      }

      // Загружаем назначенные казино
      const casinosResponse = await fetch('/api/teamlead/assigned-casinos')
      if (casinosResponse.ok) {
        const { casinos } = await casinosResponse.json()
        setAssignedCasinos(casinos)
      }

    } catch (error: any) {
      console.error('Ошибка загрузки назначений:', error)
      addToast({
        type: 'error',
        title: 'Ошибка загрузки данных',
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  const bankColumns: Column<AssignedBank>[] = [
    {
      key: 'bank',
      label: 'Банк',
      render: (assignment) => (
        <div>
          <div className="font-medium text-gray-900">{assignment.bank.name}</div>
          <div className="text-sm text-gray-500">{assignment.bank.country}</div>
        </div>
      )
    },
    {
      key: 'assigned_at',
      label: 'Назначен',
      render: (assignment) => (
        <span className="text-sm text-gray-500">
          {new Date(assignment.assigned_at).toLocaleDateString('ru-RU')}
        </span>
      )
    },
    {
      key: 'notes',
      label: 'Заметки',
      render: (assignment) => (
        <span className="text-sm text-gray-600">
          {assignment.notes || 'Нет заметок'}
        </span>
      )
    }
  ]

  const casinoColumns: Column<AssignedCasino>[] = [
    {
      key: 'casino',
      label: 'Казино',
      render: (assignment) => (
        <div>
          <div className="font-medium text-gray-900">{assignment.casino.name}</div>
          <div className="text-sm text-blue-600">{assignment.casino.url}</div>
        </div>
      )
    },
    {
      key: 'assigned_at',
      label: 'Назначено',
      render: (assignment) => (
        <span className="text-sm text-gray-500">
          {new Date(assignment.assigned_at).toLocaleDateString('ru-RU')}
        </span>
      )
    },
    {
      key: 'notes',
      label: 'Заметки',
      render: (assignment) => (
        <span className="text-sm text-gray-600">
          {assignment.notes || 'Нет заметок'}
        </span>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Мои назначения</h1>
          <p className="text-gray-600">Банки и казино, назначенные для работы с командой</p>
        </div>
      </div>

      {/* Информация о назначениях */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <UserIcon className="h-5 w-5 text-orange-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-orange-800">
              Ваши назначения как Team Lead
            </h3>
            <div className="mt-2 text-sm text-orange-700">
              <p>• Банки назначаются Manager, CFO, Tester или Admin</p>
              <p>• Казино назначаются для работы вашей команды</p>
              <p>• Вы можете назначать карты из этих банков своим Junior'ам</p>
              <p>• Вы можете создавать работы в назначенных казино</p>
            </div>
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Назначенных банков"
          value={assignedBanks.length}
          icon={<BuildingLibraryIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Назначенных казино"
          value={assignedCasinos.length}
          icon={<ComputerDesktopIcon className="h-6 w-6" />}
          color="success"
        />
        <KPICard
          title="Всего назначений"
          value={assignedBanks.length + assignedCasinos.length}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="warning"
        />
      </div>

      {/* Вкладки */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('banks')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'banks'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Мои банки ({assignedBanks.length})
          </button>
          <button
            onClick={() => setActiveTab('casinos')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'casinos'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Мои казино ({assignedCasinos.length})
          </button>
        </nav>
      </div>

      {/* Таблицы */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">
            {activeTab === 'banks' ? 'Назначенные банки' : 'Назначенные казино'}
          </h3>
        </div>
        
        {activeTab === 'banks' ? (
          <DataTable
            data={assignedBanks}
            columns={bankColumns}
            loading={loading}
            pagination={{ pageSize: 20 }}
            filtering={true}
            exportable={true}
            emptyMessage="Банки не назначены"
          />
        ) : (
          <DataTable
            data={assignedCasinos}
            columns={casinoColumns}
            loading={loading}
            pagination={{ pageSize: 20 }}
            filtering={true}
            exportable={true}
            emptyMessage="Казино не назначены"
          />
        )}
      </div>
    </div>
  )
}
