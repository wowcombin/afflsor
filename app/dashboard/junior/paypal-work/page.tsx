'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column, ActionButton } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import Modal from '@/components/ui/Modal'
import { 
  CreditCardIcon,
  ComputerDesktopIcon,
  CheckCircleIcon,
  PlusIcon,
  BanknotesIcon,
  ClockIcon,
  ArrowUpIcon
} from '@heroicons/react/24/outline'

interface PayPalWork {
  id: string
  casino_email: string
  deposit_amount: number
  currency: string
  status: string
  created_at: string
  notes?: string
  paypal_account: {
    id: string
    name: string
    email: string
    balance: number
  }
  casino: {
    id: string
    name: string
    url: string
  }
}

export default function JuniorPayPalWorkPage() {
  const { addToast } = useToast()
  const [works, setWorks] = useState<PayPalWork[]>([])
  const [loading, setLoading] = useState(true)
  
  // Модал создания работы
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [paypalAccounts, setPaypalAccounts] = useState([])
  const [assignedCasinos, setAssignedCasinos] = useState([])
  const [creating, setCreating] = useState(false)
  const [workForm, setWorkForm] = useState({
    paypal_account_id: '',
    casino_id: '',
    casino_email: '',
    casino_password: '',
    deposit_amount: '',
    currency: 'USD',
    notes: ''
  })

  // Модал создания вывода
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false)
  const [selectedWork, setSelectedWork] = useState<PayPalWork | null>(null)
  const [creatingWithdrawal, setCreatingWithdrawal] = useState(false)
  const [withdrawalForm, setWithdrawalForm] = useState({
    withdrawal_amount: '',
    currency: 'USD',
    notes: ''
  })

  useEffect(() => {
    loadPayPalWorks()
  }, [])

  async function loadPayPalWorks() {
    try {
      setLoading(true)
      const response = await fetch('/api/junior/paypal-works')
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки PayPal работ')
      }

      const data = await response.json()
      setWorks(data.works || [])

    } catch (error: any) {
      console.error('Ошибка загрузки PayPal работ:', error)
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
      // Загружаем PayPal аккаунты Junior'а
      const paypalResponse = await fetch('/api/junior/paypal')
      if (paypalResponse.ok) {
        const { accounts } = await paypalResponse.json()
        setPaypalAccounts(accounts.filter((acc: any) => acc.status === 'active'))
      }

      // Загружаем назначенные казино (через API для получения назначенных Junior'у казино)
      const casinosResponse = await fetch('/api/junior/assigned-casinos')
      if (casinosResponse.ok) {
        const { casinos } = await casinosResponse.json()
        setAssignedCasinos(casinos)
      } else {
        // Если API не существует, используем заглушку
        setAssignedCasinos([])
      }

    } catch (error: any) {
      console.error('Ошибка загрузки данных для создания работы:', error)
    }
  }

  async function handleCreateWork() {
    if (!workForm.paypal_account_id || !workForm.casino_id || !workForm.casino_email || 
        !workForm.casino_password || !workForm.deposit_amount) {
      addToast({
        type: 'error',
        title: 'Заполните все поля',
        description: 'Все поля обязательны для создания работы'
      })
      return
    }

    if (parseFloat(workForm.deposit_amount) <= 0) {
      addToast({
        type: 'error',
        title: 'Некорректная сумма',
        description: 'Сумма депозита должна быть больше 0'
      })
      return
    }

    try {
      setCreating(true)
      const response = await fetch('/api/junior/paypal-works', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...workForm,
          deposit_amount: parseFloat(workForm.deposit_amount)
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка создания работы')
      }

      addToast({
        type: 'success',
        title: 'Работа создана',
        description: data.message
      })

      setShowCreateModal(false)
      setWorkForm({
        paypal_account_id: '',
        casino_id: '',
        casino_email: '',
        casino_password: '',
        deposit_amount: '',
        currency: 'USD',
        notes: ''
      })
      await loadPayPalWorks()

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

  function handleCreateWithdrawal(work: PayPalWork) {
    setSelectedWork(work)
    setWithdrawalForm({
      withdrawal_amount: '',
      currency: work.currency,
      notes: ''
    })
    setShowWithdrawalModal(true)
  }

  async function handleSubmitWithdrawal() {
    if (!selectedWork || !withdrawalForm.withdrawal_amount) {
      addToast({
        type: 'error',
        title: 'Заполните сумму вывода',
        description: 'Сумма вывода обязательна'
      })
      return
    }

    if (parseFloat(withdrawalForm.withdrawal_amount) <= 0) {
      addToast({
        type: 'error',
        title: 'Некорректная сумма',
        description: 'Сумма вывода должна быть больше 0'
      })
      return
    }

    try {
      setCreatingWithdrawal(true)
      const response = await fetch('/api/junior/paypal-withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paypal_work_id: selectedWork.id,
          withdrawal_amount: parseFloat(withdrawalForm.withdrawal_amount),
          currency: withdrawalForm.currency,
          notes: withdrawalForm.notes
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка создания вывода')
      }

      addToast({
        type: 'success',
        title: 'Вывод создан',
        description: data.message
      })

      setShowWithdrawalModal(false)
      setSelectedWork(null)
      setWithdrawalForm({ withdrawal_amount: '', currency: 'USD', notes: '' })
      await loadPayPalWorks()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка создания вывода',
        description: error.message
      })
    } finally {
      setCreatingWithdrawal(false)
    }
  }

  const columns: Column<PayPalWork>[] = [
    {
      key: 'paypal_account',
      label: 'PayPal аккаунт',
      render: (work) => (
        <div>
          <div className="font-medium text-gray-900">{work.paypal_account.name}</div>
          <div className="text-sm text-gray-500">{work.paypal_account.email}</div>
        </div>
      )
    },
    {
      key: 'casino',
      label: 'Казино',
      render: (work) => (
        <div>
          <div className="font-medium text-gray-900">{work.casino.name}</div>
          <div className="text-sm text-blue-600">{work.casino.url}</div>
        </div>
      )
    },
    {
      key: 'casino_email',
      label: 'Email казино',
      render: (work) => (
        <span className="text-sm text-gray-600">{work.casino_email}</span>
      )
    },
    {
      key: 'deposit_amount',
      label: 'Депозит',
      render: (work) => (
        <div className="text-right">
          <div className="font-bold text-green-600">
            {work.deposit_amount.toFixed(2)} {work.currency}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Статус',
      render: (work) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          work.status === 'active' 
            ? 'bg-blue-100 text-blue-800'
            : work.status === 'completed'
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {work.status === 'active' ? 'Активна' :
           work.status === 'completed' ? 'Завершена' : 
           'Ошибка'}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Создана',
      render: (work) => (
        <span className="text-sm text-gray-500">
          {new Date(work.created_at).toLocaleDateString('ru-RU')}
        </span>
      )
    },
    {
      key: 'notes',
      label: 'Заметки',
      render: (work) => (
        <span className="text-sm text-gray-600">
          {work.notes || 'Нет заметок'}
        </span>
      )
    }
  ]

  const actions: ActionButton<PayPalWork>[] = [
    {
      label: 'Создать вывод',
      action: handleCreateWithdrawal,
      variant: 'primary',
      icon: ArrowUpIcon,
      condition: (work) => work.status === 'active'
    }
  ]

  // Статистика
  const activeWorks = works.filter(work => work.status === 'active')
  const completedWorks = works.filter(work => work.status === 'completed')
  const totalDeposits = works.reduce((sum, work) => sum + work.deposit_amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PayPal работы</h1>
          <p className="text-gray-600">Создание и управление работами на PayPal аккаунтах</p>
        </div>
        <button
          onClick={() => {
            setShowCreateModal(true)
            loadCreateModalData()
          }}
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Создать работу
        </button>
      </div>

      {/* Информация о PayPal работах */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <CreditCardIcon className="h-5 w-5 text-green-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">
              PayPal работы
            </h3>
            <div className="mt-2 text-sm text-green-700">
              <p>• Выберите активный PayPal аккаунт и назначенное казино</p>
              <p>• Введите данные для входа в казино и сумму депозита</p>
              <p>• PayPal работы учитываются в расчете зарплаты</p>
              <p>• Все PayPal аккаунты используют BEP20 сеть</p>
            </div>
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Всего работ"
          value={works.length}
          icon={<CreditCardIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Активных"
          value={activeWorks.length}
          icon={<ClockIcon className="h-6 w-6" />}
          color="warning"
        />
        <KPICard
          title="Завершенных"
          value={completedWorks.length}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="success"
        />
        <KPICard
          title="Общий депозит"
          value={`$${totalDeposits.toFixed(2)}`}
          icon={<BanknotesIcon className="h-6 w-6" />}
          color="success"
        />
      </div>

      {/* Таблица работ */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">Мои PayPal работы</h3>
        </div>
        
        <DataTable
          data={works}
          columns={columns}
          actions={actions}
          loading={loading}
          pagination={{ pageSize: 20 }}
          filtering={true}
          exportable={true}
          emptyMessage="PayPal работы не найдены"
        />
      </div>

      {/* Modal создания работы */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Создать PayPal работу"
        size="lg"
      >
        <div className="space-y-4">
          {/* Выбор PayPal аккаунта */}
          <div>
            <label className="form-label">PayPal аккаунт *</label>
            <select
              value={workForm.paypal_account_id}
              onChange={(e) => setWorkForm({ ...workForm, paypal_account_id: e.target.value })}
              className="form-input"
              required
            >
              <option value="">Выберите PayPal аккаунт</option>
              {paypalAccounts.map((account: any) => (
                <option key={account.id} value={account.id}>
                  {account.name} - {account.email} (${account.balance?.toFixed(2) || '0.00'})
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Доступно аккаунтов: {paypalAccounts.length}
            </p>
          </div>

          {/* Выбор казино */}
          <div>
            <label className="form-label">Казино *</label>
            <select
              value={workForm.casino_id}
              onChange={(e) => setWorkForm({ ...workForm, casino_id: e.target.value })}
              className="form-input"
              required
            >
              <option value="">Выберите казино</option>
              {assignedCasinos.map((assignment: any) => (
                <option key={assignment.casino?.id || assignment.id} value={assignment.casino?.id || assignment.id}>
                  {assignment.casino?.name || assignment.name}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Назначенных казино: {assignedCasinos.length}
            </p>
          </div>

          {/* Email казино */}
          <div>
            <label className="form-label">Email для входа в казино *</label>
            <input
              type="email"
              value={workForm.casino_email}
              onChange={(e) => setWorkForm({ ...workForm, casino_email: e.target.value })}
              className="form-input"
              placeholder="email@example.com"
              required
            />
          </div>

          {/* Пароль казино */}
          <div>
            <label className="form-label">Пароль для входа в казино *</label>
            <input
              type="password"
              value={workForm.casino_password}
              onChange={(e) => setWorkForm({ ...workForm, casino_password: e.target.value })}
              className="form-input"
              placeholder="Пароль"
              required
            />
          </div>

          {/* Сумма депозита */}
          <div>
            <label className="form-label">Сумма депозита *</label>
            <div className="flex space-x-2">
              <input
                type="number"
                step="0.01"
                min="0"
                value={workForm.deposit_amount}
                onChange={(e) => setWorkForm({ ...workForm, deposit_amount: e.target.value })}
                className="form-input flex-1"
                placeholder="0.00"
                required
              />
              <select
                value={workForm.currency}
                onChange={(e) => setWorkForm({ ...workForm, currency: e.target.value })}
                className="form-input w-20"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
              </select>
            </div>
          </div>

          {/* Заметки */}
          <div>
            <label className="form-label">Заметки</label>
            <textarea
              value={workForm.notes}
              onChange={(e) => setWorkForm({ ...workForm, notes: e.target.value })}
              className="form-input"
              rows={3}
              placeholder="Дополнительные заметки о работе..."
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
              onClick={handleCreateWork}
              className="btn-primary"
              disabled={creating || !workForm.paypal_account_id || !workForm.casino_id || 
                       !workForm.casino_email || !workForm.casino_password || !workForm.deposit_amount}
            >
              {creating ? 'Создание...' : 'Создать работу'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal создания вывода */}
      <Modal
        isOpen={showWithdrawalModal}
        onClose={() => {
          setShowWithdrawalModal(false)
          setSelectedWork(null)
          setWithdrawalForm({ withdrawal_amount: '', currency: 'USD', notes: '' })
        }}
        title="Создать PayPal вывод"
        size="lg"
      >
        {selectedWork && (
          <div className="space-y-4">
            {/* Информация о работе */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Информация о работе</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">PayPal аккаунт:</span>
                  <div className="font-medium">{selectedWork.paypal_account.name}</div>
                </div>
                <div>
                  <span className="text-gray-600">Казино:</span>
                  <div className="font-medium">{selectedWork.casino.name}</div>
                </div>
                <div>
                  <span className="text-gray-600">Депозит:</span>
                  <div className="font-medium text-green-600">
                    {selectedWork.deposit_amount.toFixed(2)} {selectedWork.currency}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Email казино:</span>
                  <div className="font-medium">{selectedWork.casino_email}</div>
                </div>
              </div>
            </div>

            {/* Сумма вывода */}
            <div>
              <label className="form-label">Сумма вывода *</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={withdrawalForm.withdrawal_amount}
                  onChange={(e) => setWithdrawalForm({ ...withdrawalForm, withdrawal_amount: e.target.value })}
                  className="form-input flex-1"
                  placeholder="0.00"
                  required
                />
                <select
                  value={withdrawalForm.currency}
                  onChange={(e) => setWithdrawalForm({ ...withdrawalForm, currency: e.target.value })}
                  className="form-input w-20"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                </select>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Депозит по этой работе: {selectedWork.deposit_amount.toFixed(2)} {selectedWork.currency}
              </p>
            </div>

            {/* Заметки */}
            <div>
              <label className="form-label">Заметки</label>
              <textarea
                value={withdrawalForm.notes}
                onChange={(e) => setWithdrawalForm({ ...withdrawalForm, notes: e.target.value })}
                className="form-input"
                rows={3}
                placeholder="Дополнительные заметки о выводе..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => {
                  setShowWithdrawalModal(false)
                  setSelectedWork(null)
                  setWithdrawalForm({ withdrawal_amount: '', currency: 'USD', notes: '' })
                }}
                className="btn-secondary"
                disabled={creatingWithdrawal}
              >
                Отмена
              </button>
              <button
                onClick={handleSubmitWithdrawal}
                className="btn-primary"
                disabled={creatingWithdrawal || !withdrawalForm.withdrawal_amount}
              >
                {creatingWithdrawal ? 'Создание...' : 'Создать вывод'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
