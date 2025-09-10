'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column, ActionButton } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import Modal from '@/components/ui/Modal'
import { 
  BuildingLibraryIcon,
  ComputerDesktopIcon,
  UserIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

interface BankAssignment {
  id: string
  bank_id: string
  teamlead_id: string
  assigned_at: string
  notes?: string
  bank: {
    name: string
    country: string
    is_active: boolean
  }
  teamlead: {
    email: string
    first_name?: string
    last_name?: string
  }
}

interface CasinoAssignment {
  id: string
  casino_id: string
  teamlead_id: string
  assigned_at: string
  notes?: string
  casino: {
    name: string
    url: string
    status: string
  }
  teamlead: {
    email: string
    first_name?: string
    last_name?: string
  }
}

export default function ManagerAssignmentsPage() {
  const { addToast } = useToast()
  const [bankAssignments, setBankAssignments] = useState<BankAssignment[]>([])
  const [casinoAssignments, setCasinoAssignments] = useState<CasinoAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'banks' | 'casinos'>('banks')
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignmentType, setAssignmentType] = useState<'bank' | 'casino'>('bank')

  // Данные для модалов
  const [availableBanks, setAvailableBanks] = useState([])
  const [availableCasinos, setAvailableCasinos] = useState([])
  const [availableTeamLeads, setAvailableTeamLeads] = useState([])
  const [assignmentForm, setAssignmentForm] = useState({
    bank_id: '',
    casino_id: '',
    teamlead_id: '',
    notes: ''
  })

  useEffect(() => {
    loadAssignments()
  }, [])

  async function loadAssignments() {
    try {
      setLoading(true)

      // Загружаем назначения банков
      const banksResponse = await fetch('/api/manager/bank-assignments')
      if (banksResponse.ok) {
        const { assignments } = await banksResponse.json()
        setBankAssignments(assignments)
      }

      // Загружаем назначения казино
      const casinosResponse = await fetch('/api/manager/casino-assignments')
      if (casinosResponse.ok) {
        const { assignments } = await casinosResponse.json()
        setCasinoAssignments(assignments)
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

  async function loadModalData() {
    try {
      // Загружаем доступных Team Lead'ов
      const teamleadsResponse = await fetch('/api/users?role=teamlead&status=active')
      if (teamleadsResponse.ok) {
        const { users } = await teamleadsResponse.json()
        setAvailableTeamLeads(users.filter((u: any) => u.role === 'teamlead' && u.status === 'active'))
      }

      // Загружаем доступные банки
      const banksResponse = await fetch('/api/banks?available_for_assignment=true')
      if (banksResponse.ok) {
        const { banks } = await banksResponse.json()
        setAvailableBanks(banks)
      }

      // Загружаем доступные казино
      const casinosResponse = await fetch('/api/casinos')
      if (casinosResponse.ok) {
        const { casinos } = await casinosResponse.json()
        setAvailableCasinos(casinos)
      }

    } catch (error: any) {
      console.error('Ошибка загрузки данных для модала:', error)
    }
  }

  async function handleCreateAssignment() {
    const endpoint = assignmentType === 'bank' ? '/api/manager/bank-assignments' : '/api/manager/casino-assignments'
    const payload = assignmentType === 'bank' 
      ? { bank_id: assignmentForm.bank_id, teamlead_id: assignmentForm.teamlead_id, notes: assignmentForm.notes }
      : { casino_id: assignmentForm.casino_id, teamlead_id: assignmentForm.teamlead_id, notes: assignmentForm.notes }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'Назначение создано',
        description: data.message
      })

      setShowAssignModal(false)
      setAssignmentForm({ bank_id: '', casino_id: '', teamlead_id: '', notes: '' })
      await loadAssignments()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка назначения',
        description: error.message
      })
    }
  }

  const bankColumns: Column<BankAssignment>[] = [
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
      key: 'teamlead',
      label: 'Team Lead',
      render: (assignment) => (
        <div>
          <div className="font-medium text-gray-900">
            {`${assignment.teamlead.first_name || ''} ${assignment.teamlead.last_name || ''}`.trim() || assignment.teamlead.email}
          </div>
          <div className="text-sm text-gray-500">{assignment.teamlead.email}</div>
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

  const casinoColumns: Column<CasinoAssignment>[] = [
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
      key: 'teamlead',
      label: 'Team Lead',
      render: (assignment) => (
        <div>
          <div className="font-medium text-gray-900">
            {`${assignment.teamlead.first_name || ''} ${assignment.teamlead.last_name || ''}`.trim() || assignment.teamlead.email}
          </div>
          <div className="text-sm text-gray-500">{assignment.teamlead.email}</div>
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
          <h1 className="text-2xl font-bold text-gray-900">Назначения Team Lead'ам</h1>
          <p className="text-gray-600">Управление назначениями банков и казино</p>
        </div>
        <button
          onClick={() => {
            setShowAssignModal(true)
            loadModalData()
          }}
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Создать назначение
        </button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Назначений банков"
          value={bankAssignments.length}
          icon={<BuildingLibraryIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Назначений казино"
          value={casinoAssignments.length}
          icon={<ComputerDesktopIcon className="h-6 w-6" />}
          color="success"
        />
        <KPICard
          title="Активных Team Lead"
          value={new Set([...bankAssignments.map(a => a.teamlead_id), ...casinoAssignments.map(a => a.teamlead_id)]).size}
          icon={<UserIcon className="h-6 w-6" />}
          color="warning"
        />
        <KPICard
          title="Всего назначений"
          value={bankAssignments.length + casinoAssignments.length}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="primary"
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
            Назначения банков ({bankAssignments.length})
          </button>
          <button
            onClick={() => setActiveTab('casinos')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'casinos'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Назначения казино ({casinoAssignments.length})
          </button>
        </nav>
      </div>

      {/* Таблицы */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">
            {activeTab === 'banks' ? 'Назначения банков' : 'Назначения казино'}
          </h3>
        </div>
        
        {activeTab === 'banks' ? (
          <DataTable
            data={bankAssignments}
            columns={bankColumns}
            loading={loading}
            pagination={{ pageSize: 20 }}
            filtering={true}
            exportable={true}
            emptyMessage="Назначения банков не найдены"
          />
        ) : (
          <DataTable
            data={casinoAssignments}
            columns={casinoColumns}
            loading={loading}
            pagination={{ pageSize: 20 }}
            filtering={true}
            exportable={true}
            emptyMessage="Назначения казино не найдены"
          />
        )}
      </div>

      {/* Modal создания назначения */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Создать назначение"
        size="lg"
      >
        <div className="space-y-4">
          {/* Выбор типа назначения */}
          <div>
            <label className="form-label">Тип назначения</label>
            <select
              value={assignmentType}
              onChange={(e) => setAssignmentType(e.target.value as 'bank' | 'casino')}
              className="form-input"
            >
              <option value="bank">Назначить банк</option>
              <option value="casino">Назначить казино</option>
            </select>
          </div>

          {/* Выбор Team Lead */}
          <div>
            <label className="form-label">Team Lead *</label>
            <select
              value={assignmentForm.teamlead_id}
              onChange={(e) => setAssignmentForm({ ...assignmentForm, teamlead_id: e.target.value })}
              className="form-input"
              required
            >
              <option value="">Выберите Team Lead</option>
              {availableTeamLeads.map((tl: any) => (
                <option key={tl.id} value={tl.id}>
                  {`${tl.first_name || ''} ${tl.last_name || ''}`.trim() || tl.email}
                </option>
              ))}
            </select>
          </div>

          {/* Выбор банка или казино */}
          {assignmentType === 'bank' ? (
            <div>
              <label className="form-label">Банк *</label>
              <select
                value={assignmentForm.bank_id}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, bank_id: e.target.value })}
                className="form-input"
                required
              >
                <option value="">Выберите банк</option>
                {availableBanks.map((bank: any) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name} ({bank.country})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="form-label">Казино *</label>
              <select
                value={assignmentForm.casino_id}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, casino_id: e.target.value })}
                className="form-input"
                required
              >
                <option value="">Выберите казино</option>
                {availableCasinos.map((casino: any) => (
                  <option key={casino.id} value={casino.id}>
                    {casino.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Заметки */}
          <div>
            <label className="form-label">Заметки</label>
            <textarea
              value={assignmentForm.notes}
              onChange={(e) => setAssignmentForm({ ...assignmentForm, notes: e.target.value })}
              className="form-input"
              rows={3}
              placeholder="Дополнительные заметки о назначении..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowAssignModal(false)}
              className="btn-secondary"
            >
              Отмена
            </button>
            <button
              onClick={handleCreateAssignment}
              className="btn-primary"
              disabled={!assignmentForm.teamlead_id || (!assignmentForm.bank_id && !assignmentForm.casino_id)}
            >
              Создать назначение
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
