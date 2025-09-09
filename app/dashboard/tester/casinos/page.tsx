'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column, ActionButton } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import StatusBadge from '@/components/ui/StatusBadge'
import Modal from '@/components/ui/Modal'
import { 
  ComputerDesktopIcon,
  PlusIcon,
  BeakerIcon,
  DocumentTextIcon,
  EyeIcon,
  PlayIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

interface Casino {
  id: string
  name: string
  url: string
  promo?: string
  company?: string
  currency?: string
  status: string
  allowed_bins: string[]
  auto_approve_limit: number
  withdrawal_time_value: number
  withdrawal_time_unit: string
  notes: string | null
  latest_test_id: string | null
  latest_test_status: string | null
  test_result: string | null
  rating: number | null
  last_tested_at: string | null
  last_tester_first_name: string | null
  last_tester_last_name: string | null
  created_at: string
}

interface CasinoStats {
  totalCasinos: number
  newCasinos: number
  testingCasinos: number
  approvedCasinos: number
  rejectedCasinos: number
}

export default function TesterCasinosPage() {
  const { addToast } = useToast()
  const [casinos, setCasinos] = useState<Casino[]>([])
  const [stats, setStats] = useState<CasinoStats>({
    totalCasinos: 0,
    newCasinos: 0,
    testingCasinos: 0,
    approvedCasinos: 0,
    rejectedCasinos: 0
  })
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showTestModal, setShowTestModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [selectedCasino, setSelectedCasino] = useState<Casino | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedCompany, setSelectedCompany] = useState<string>('all')

  // Форма нового казино
  const [newCasino, setNewCasino] = useState({
    name: '',
    url: '',
    promo: '',
    company: '',
    currency: 'USD',
    notes: ''
  })

  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)

  // Форма настроек казино
  const [casinoSettings, setCasinoSettings] = useState({
    name: '',
    url: '',
    promo: '',
    company: '',
    currency: 'USD',
    allowed_bins: [] as string[],
    auto_approve_limit: 100,
    withdrawal_time_value: 0,
    withdrawal_time_unit: 'instant',
    notes: '',
    status: 'new'
  })
  const [binCodesText, setBinCodesText] = useState('')

  useEffect(() => {
    loadCasinos()
  }, [])

  useEffect(() => {
    if (selectedCasino && showSettingsModal) {
      setCasinoSettings({
        name: selectedCasino.name,
        url: selectedCasino.url,
        promo: selectedCasino.promo || '',
        company: selectedCasino.company || '',
        currency: selectedCasino.currency || 'USD',
        allowed_bins: selectedCasino.allowed_bins || [],
        auto_approve_limit: selectedCasino.auto_approve_limit,
        withdrawal_time_value: selectedCasino.withdrawal_time_value,
        withdrawal_time_unit: selectedCasino.withdrawal_time_unit,
        notes: selectedCasino.notes || '',
        status: selectedCasino.status
      })
      setBinCodesText((selectedCasino.allowed_bins || []).join(', '))
    }
  }, [selectedCasino, showSettingsModal])

  async function loadCasinos() {
    try {
      const response = await fetch('/api/casinos')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка загрузки казино')
      }

      const { casinos: casinosData } = await response.json()
      
      // Сортируем казино по статусам: approved -> testing -> new -> blocked
      const statusOrder = { 'approved': 1, 'testing': 2, 'new': 3, 'blocked': 4 }
      const sortedCasinos = (casinosData || []).sort((a: Casino, b: Casino) => {
        const aOrder = statusOrder[a.status as keyof typeof statusOrder] || 5
        const bOrder = statusOrder[b.status as keyof typeof statusOrder] || 5
        if (aOrder !== bOrder) return aOrder - bOrder
        return a.name.localeCompare(b.name) // Вторичная сортировка по названию
      })
      
      setCasinos(sortedCasinos)

      // Рассчитываем статистику
      const totalCasinos = casinosData.length
      const newCasinos = casinosData.filter((c: Casino) => c.status === 'new').length
      const testingCasinos = casinosData.filter((c: Casino) => c.status === 'testing').length
      const approvedCasinos = casinosData.filter((c: Casino) => c.status === 'approved').length
      const rejectedCasinos = casinosData.filter((c: Casino) => c.status === 'rejected').length

      setStats({
        totalCasinos,
        newCasinos,
        testingCasinos,
        approvedCasinos,
        rejectedCasinos
      })

    } catch (error: any) {
      console.error('Ошибка загрузки казино:', error)
      addToast({
        type: 'error',
        title: 'Ошибка загрузки данных',
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateCasino() {
    if (!newCasino.name.trim() || !newCasino.url.trim()) {
      addToast({ type: 'error', title: 'Заполните название и URL' })
      return
    }

    setCreating(true)

    try {
      const response = await fetch('/api/casinos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newCasino)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'Казино создано',
        description: data.message
      })

      setShowCreateModal(false)
      setNewCasino({
        name: '',
        url: '',
        promo: '',
        company: '',
        currency: 'USD',
        notes: ''
      })
      
      await loadCasinos()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка создания казино',
        description: error.message
      })
    } finally {
      setCreating(false)
    }
  }

  async function startTest(casino: Casino) {
    try {
      const response = await fetch('/api/casino-tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          casino_id: casino.id,
          test_type: 'full'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'Тест запущен',
        description: `Тестирование ${casino.name} начато`
      })

      await loadCasinos()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка запуска теста',
        description: error.message
      })
    }
  }

  async function handleUpdateCasino() {
    if (!selectedCasino || !casinoSettings.name.trim() || !casinoSettings.url.trim()) {
      addToast({ type: 'error', title: 'Заполните название и URL' })
      return
    }

    setUpdating(true)

    try {
      const response = await fetch(`/api/casinos/${selectedCasino.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(casinoSettings)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'Казино обновлено',
        description: data.message
      })

      setShowSettingsModal(false)
      setSelectedCasino(null)
      await loadCasinos()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка обновления казино',
        description: error.message
      })
    } finally {
      setUpdating(false)
    }
  }

  function getWithdrawalTimeLabel(value: number, unit: string): string {
    if (unit === 'instant' || value === 0) {
      return 'Моментально'
    }
    const unitLabels = {
      minutes: 'мин',
      hours: 'ч'
    }
    return `${value} ${unitLabels[unit as keyof typeof unitLabels] || unit}`
  }

  const columns: Column<Casino>[] = [
    {
      key: 'name',
      label: 'Казино',
      sortable: true,
      filterable: true,
      render: (casino) => (
        <div>
          <div className="font-medium text-gray-900">{casino.name}</div>
          <div className="text-sm text-gray-500">
            <a href={casino.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
              {casino.url}
            </a>
          </div>
          {casino.company && (
            <div className="text-xs text-primary-600 font-medium mt-1">🏢 {casino.company}</div>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Статус',
      sortable: true,
      render: (casino) => <StatusBadge status={casino.status} />
    },
    {
      key: 'allowed_bins',
      label: 'BIN коды',
      render: (casino) => (
        <div className="text-sm">
          {casino.allowed_bins.length > 0 ? (
            <div>
              <span className="font-medium">{casino.allowed_bins.length} BIN</span>
              <div className="text-xs text-gray-500">
                {casino.allowed_bins.slice(0, 2).join(', ')}
                {casino.allowed_bins.length > 2 && '...'}
              </div>
            </div>
          ) : (
            <span className="text-gray-500">Не указаны</span>
          )}
        </div>
      )
    },
    {
      key: 'auto_approve_limit',
      label: 'Лимит авто',
      sortable: true,
      align: 'right',
      render: (casino) => {
        const getCurrencySymbol = (currency: string) => {
          const symbols = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'CAD': 'C$' }
          return symbols[currency as keyof typeof symbols] || currency
        }
        return (
          <span className="font-mono text-success-600">
            {getCurrencySymbol(casino.currency || 'USD')}{casino.auto_approve_limit}
          </span>
        )
      }
    },
    {
      key: 'withdrawal_time_value',
      label: 'Время вывода',
      render: (casino) => (
        <span className="text-sm text-gray-600">
          {getWithdrawalTimeLabel(casino.withdrawal_time_value, casino.withdrawal_time_unit)}
        </span>
      )
    },
    {
      key: 'latest_test_status',
      label: 'Последний тест',
      render: (casino) => {
        if (!casino.latest_test_id) {
          return <span className="text-gray-500">Не тестировалось</span>
        }
        
        return (
          <div>
            <StatusBadge status={casino.latest_test_status || 'unknown'} size="sm" />
            {casino.rating && (
              <div className="text-xs text-gray-500 mt-1">
                Рейтинг: {casino.rating}/10
              </div>
            )}
          </div>
        )
      }
    }
  ]

  const actions: ActionButton<Casino>[] = [
    {
      label: 'Начать тест',
      action: startTest,
      variant: 'primary',
      condition: (casino) => casino.status === 'new'
    },
    {
      label: 'Мануал',
      action: (casino) => {
        addToast({ type: 'info', title: 'Мануалы - в разработке' })
      },
      variant: 'secondary'
    },
    {
      label: 'Настройки',
      action: (casino) => {
        setSelectedCasino(casino)
        setShowSettingsModal(true)
      },
      variant: 'secondary'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Управление казино</h1>
          <p className="text-gray-600">Тестирование и настройка казино</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Добавить казино
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KPICard
          title="Всего казино"
          value={stats.totalCasinos}
          icon={<ComputerDesktopIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Новые"
          value={stats.newCasinos}
          icon={<ClockIcon className="h-6 w-6" />}
          color="warning"
        />
        <KPICard
          title="Тестируются"
          value={stats.testingCasinos}
          icon={<BeakerIcon className="h-6 w-6" />}
          color="warning"
        />
        <KPICard
          title="Одобрены"
          value={stats.approvedCasinos}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="success"
        />
        <KPICard
          title="Отклонены"
          value={stats.rejectedCasinos}
          icon={<XCircleIcon className="h-6 w-6" />}
          color="danger"
        />
      </div>

      {/* Фильтры */}
      <div className="card">
        <div className="card-header">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Фильтры</h3>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Статус</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="form-input"
              >
                <option value="all">Все статусы</option>
                <option value="approved">✅ Одобренные</option>
                <option value="testing">🧪 Тестирование</option>
                <option value="new">🆕 Новые</option>
                <option value="blocked">🚫 Заблокированные</option>
              </select>
            </div>
            <div>
              <label className="form-label">Компания</label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="form-input"
              >
                <option value="all">Все компании</option>
                {Array.from(new Set(casinos.map(c => c.company).filter(Boolean))).map(company => (
                  <option key={company} value={company}>🏢 {company}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Таблица казино */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">
            Казино ({casinos.filter(casino => {
              const statusMatch = selectedStatus === 'all' || casino.status === selectedStatus
              const companyMatch = selectedCompany === 'all' || casino.company === selectedCompany
              return statusMatch && companyMatch
            }).length} из {casinos.length})
          </h3>
        </div>
        
        <DataTable
          data={casinos.filter(casino => {
            const statusMatch = selectedStatus === 'all' || casino.status === selectedStatus
            const companyMatch = selectedCompany === 'all' || casino.company === selectedCompany
            return statusMatch && companyMatch
          })}
          columns={columns}
          actions={actions}
          loading={loading}
          pagination={{ pageSize: 20 }}
          filtering={true}
          exportable={true}
          emptyMessage="Казино не найдены"
        />
      </div>

      {/* Modal создания казино */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Добавить новое казино"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Название казино *</label>
              <input
                type="text"
                value={newCasino.name}
                onChange={(e) => setNewCasino({ ...newCasino, name: e.target.value })}
                className="form-input"
                placeholder="Super Casino"
                required
              />
            </div>
            <div>
              <label className="form-label">URL *</label>
              <input
                type="url"
                value={newCasino.url}
                onChange={(e) => setNewCasino({ ...newCasino, url: e.target.value })}
                className="form-input"
                placeholder="https://supercasino.com"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="form-label">Промо код</label>
              <input
                type="text"
                value={newCasino.promo}
                onChange={(e) => setNewCasino({ ...newCasino, promo: e.target.value })}
                className="form-input"
                placeholder="BONUS100"
              />
            </div>
            <div>
              <label className="form-label">Компания</label>
              <input
                type="text"
                value={newCasino.company}
                onChange={(e) => setNewCasino({ ...newCasino, company: e.target.value })}
                className="form-input"
                placeholder="Casino Group Ltd"
              />
            </div>
            <div>
              <label className="form-label">Валюта</label>
              <select
                value={newCasino.currency}
                onChange={(e) => setNewCasino({ ...newCasino, currency: e.target.value })}
                className="form-input"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD (C$)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Заметки</label>
            <textarea
              value={newCasino.notes}
              onChange={(e) => setNewCasino({ ...newCasino, notes: e.target.value })}
              className="form-input"
              rows={3}
              placeholder="Особенности, требования, заметки..."
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
              onClick={handleCreateCasino}
              className="btn-primary"
              disabled={creating || !newCasino.name.trim() || !newCasino.url.trim()}
            >
              {creating ? 'Создание...' : 'Создать казино'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal настроек казино */}
      <Modal
        isOpen={showSettingsModal}
        onClose={() => {
          setShowSettingsModal(false)
          setSelectedCasino(null)
        }}
        title={`Настройки казино: ${selectedCasino?.name}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Название казино *</label>
              <input
                type="text"
                value={casinoSettings.name}
                onChange={(e) => setCasinoSettings({ ...casinoSettings, name: e.target.value })}
                className="form-input"
                placeholder="Super Casino"
                required
              />
            </div>
            <div>
              <label className="form-label">URL *</label>
              <input
                type="url"
                value={casinoSettings.url}
                onChange={(e) => setCasinoSettings({ ...casinoSettings, url: e.target.value })}
                className="form-input"
                placeholder="https://supercasino.com"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="form-label">Промо код</label>
              <input
                type="text"
                value={casinoSettings.promo}
                onChange={(e) => setCasinoSettings({ ...casinoSettings, promo: e.target.value })}
                className="form-input"
                placeholder="BONUS100"
              />
            </div>
            <div>
              <label className="form-label">Компания</label>
              <input
                type="text"
                value={casinoSettings.company}
                onChange={(e) => setCasinoSettings({ ...casinoSettings, company: e.target.value })}
                className="form-input"
                placeholder="Casino Group Ltd"
              />
            </div>
            <div>
              <label className="form-label">Валюта</label>
              <select
                value={casinoSettings.currency}
                onChange={(e) => setCasinoSettings({ ...casinoSettings, currency: e.target.value })}
                className="form-input"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD (C$)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Статус</label>
              <select
                value={casinoSettings.status}
                onChange={(e) => setCasinoSettings({ ...casinoSettings, status: e.target.value })}
                className="form-input"
              >
                <option value="new">Новое</option>
                <option value="testing">Тестируется</option>
                <option value="approved">Одобрено</option>
                <option value="blocked">Заблокировано</option>
              </select>
            </div>
            <div>
              <label className="form-label">Лимит автоодобрения</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={casinoSettings.auto_approve_limit}
                  onChange={(e) => setCasinoSettings({ ...casinoSettings, auto_approve_limit: parseFloat(e.target.value) || 0 })}
                  className="form-input flex-1"
                  placeholder="100"
                  min="0"
                  step="0.01"
                />
                <span className="text-sm text-gray-500 w-16">
                  {casinoSettings.currency || 'USD'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Лимит указывается в валюте казино
              </p>
            </div>
          </div>

          <div>
            <label className="form-label">Время вывода</label>
            <div className="flex space-x-2">
              <select
                value={casinoSettings.withdrawal_time_unit}
                onChange={(e) => {
                  const unit = e.target.value
                  setCasinoSettings({ 
                    ...casinoSettings, 
                    withdrawal_time_unit: unit,
                    withdrawal_time_value: unit === 'instant' ? 0 : casinoSettings.withdrawal_time_value
                  })
                }}
                className="form-input w-48"
              >
                <option value="instant">Моментально</option>
                <option value="minutes">Минуты</option>
                <option value="hours">Часы</option>
              </select>
              {casinoSettings.withdrawal_time_unit !== 'instant' && (
                <input
                  type="number"
                  value={casinoSettings.withdrawal_time_value}
                  onChange={(e) => setCasinoSettings({ ...casinoSettings, withdrawal_time_value: parseInt(e.target.value) || 0 })}
                  className="form-input w-24"
                  placeholder={`Количество ${casinoSettings.withdrawal_time_unit === 'minutes' ? 'минут' : 'часов'}`}
                  min="1"
                />
              )}
            </div>
            {casinoSettings.withdrawal_time_unit === 'instant' && (
              <p className="text-xs text-gray-500 mt-1">Выводы обрабатываются мгновенно</p>
            )}
          </div>

          <div>
            <label className="form-label">BIN коды</label>
            <textarea
              value={binCodesText}
              onChange={(e) => setBinCodesText(e.target.value)}
              onBlur={(e) => {
                // При потере фокуса разбираем строку на массив
                const bins = e.target.value
                  .split(/[,\s]+/)
                  .map(bin => bin.trim())
                  .filter(bin => bin)
                setCasinoSettings({ 
                  ...casinoSettings, 
                  allowed_bins: bins
                })
              }}
              className="form-input"
              rows={3}
              placeholder="123456, 654321, 111111"
            />
            <p className="text-xs text-gray-500 mt-1">
              Введите BIN коды через запятую. Можно копировать и вставлять списком.
            </p>
          </div>

          <div>
            <label className="form-label">Заметки</label>
            <textarea
              value={casinoSettings.notes}
              onChange={(e) => setCasinoSettings({ ...casinoSettings, notes: e.target.value })}
              className="form-input"
              rows={3}
              placeholder="Особенности, требования, заметки..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => {
                setShowSettingsModal(false)
                setSelectedCasino(null)
              }}
              className="btn-secondary"
              disabled={updating}
            >
              Отмена
            </button>
            <button
              onClick={handleUpdateCasino}
              className="btn-primary"
              disabled={updating || !casinoSettings.name.trim() || !casinoSettings.url.trim()}
            >
              {updating ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
