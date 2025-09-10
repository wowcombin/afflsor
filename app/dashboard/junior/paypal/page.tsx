'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column, ActionButton } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import Modal from '@/components/ui/Modal'
import { 
  CreditCardIcon,
  PlusIcon,
  EyeIcon,
  EyeSlashIcon,
  BanknotesIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon
} from '@heroicons/react/24/outline'

interface PayPalAccount {
  id: string
  name: string
  email: string
  password: string
  phone_number: string
  authenticator_url: string
  date_created: string
  balance: number
  sender_paypal_email?: string
  balance_send?: number
  send_paypal_balance?: string
  info?: string
  status: 'active' | 'blocked' | 'suspended'
  created_at: string
  updated_at: string
}

interface PayPalStats {
  totalAccounts: number
  activeAccounts: number
  blockedAccounts: number
  totalBalance: number
}

export default function JuniorPayPalPage() {
  const { addToast } = useToast()
  const [accounts, setAccounts] = useState<PayPalAccount[]>([])
  const [stats, setStats] = useState<PayPalStats>({
    totalAccounts: 0,
    activeAccounts: 0,
    blockedAccounts: 0,
    totalBalance: 0
  })
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<PayPalAccount | null>(null)
  const [showSensitiveData, setShowSensitiveData] = useState<{[key: string]: boolean}>({})
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)

  // Форма нового PayPal аккаунта
  const [newAccountForm, setNewAccountForm] = useState({
    name: '',
    email: '',
    password: '',
    phone_number: '',
    authenticator_url: '',
    date_created: new Date().toISOString().split('T')[0],
    balance: 0,
    sender_paypal_email: '',
    balance_send: 0,
    send_paypal_balance: '',
    info: ''
  })

  useEffect(() => {
    loadPayPalAccounts()
  }, [])

  async function loadPayPalAccounts() {
    try {
      const response = await fetch('/api/junior/paypal')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка загрузки PayPal аккаунтов')
      }

      const { accounts: accountsData } = await response.json()
      setAccounts(accountsData)

      // Рассчитываем статистику
      const totalAccounts = accountsData.length
      const activeAccounts = accountsData.filter((a: PayPalAccount) => a.status === 'active').length
      const blockedAccounts = accountsData.filter((a: PayPalAccount) => a.status === 'blocked').length
      const totalBalance = accountsData.reduce((sum: number, a: PayPalAccount) => sum + (a.balance || 0), 0)

      setStats({
        totalAccounts,
        activeAccounts,
        blockedAccounts,
        totalBalance
      })

    } catch (error: any) {
      console.error('Ошибка загрузки PayPal аккаунтов:', error)
      addToast({
        type: 'error',
        title: 'Ошибка загрузки данных',
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateAccount() {
    if (!newAccountForm.name || !newAccountForm.email || !newAccountForm.password) {
      addToast({ type: 'error', title: 'Заполните обязательные поля' })
      return
    }

    setCreating(true)

    try {
      const response = await fetch('/api/junior/paypal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAccountForm)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'PayPal аккаунт создан',
        description: `${newAccountForm.name} успешно добавлен`
      })

      setShowCreateModal(false)
      setNewAccountForm({
        name: '',
        email: '',
        password: '',
        phone_number: '',
        authenticator_url: '',
        date_created: new Date().toISOString().split('T')[0],
        balance: 0,
        sender_paypal_email: '',
        balance_send: 0,
        send_paypal_balance: '',
        info: ''
      })
      
      await loadPayPalAccounts()

    } catch (error: any) {
      console.error('Ошибка создания PayPal аккаунта:', error)
      addToast({
        type: 'error',
        title: 'Ошибка создания аккаунта',
        description: error.message
      })
    } finally {
      setCreating(false)
    }
  }

  function toggleSensitiveData(accountId: string) {
    setShowSensitiveData(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }))
  }

  function maskEmail(email: string) {
    if (!email) return 'Не указан'
    const [name, domain] = email.split('@')
    return `${name.substring(0, 3)}***@${domain}`
  }

  function maskPassword(password: string) {
    if (!password) return 'Не указан'
    return '*'.repeat(password.length)
  }

  const columns: Column<PayPalAccount>[] = [
    {
      key: 'name',
      label: 'Имя',
      sortable: true,
      filterable: true,
      render: (account) => (
        <div>
          <div className="font-medium text-gray-900">{account.name}</div>
          <div className="text-sm text-gray-500">
            {showSensitiveData[account.id] ? account.email : maskEmail(account.email)}
          </div>
        </div>
      )
    },
    {
      key: 'credentials',
      label: 'Учетные данные',
      render: (account) => (
        <div className="space-y-1">
          <div className="text-xs">
            <span className="font-medium">Пароль: </span>
            {showSensitiveData[account.id] ? account.password : maskPassword(account.password)}
          </div>
          <div className="text-xs">
            <span className="font-medium">Телефон: </span>
            {account.phone_number || 'Не указан'}
          </div>
        </div>
      )
    },
    {
      key: 'balance',
      label: 'Баланс',
      sortable: true,
      align: 'right',
      render: (account) => (
        <div className="text-right">
          <div className="font-bold text-gray-900">
            ${(account.balance || 0).toFixed(2)}
          </div>
          {account.balance_send && (
            <div className="text-xs text-gray-500">
              Отправка: ${account.balance_send.toFixed(2)}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'sender_info',
      label: 'Отправитель',
      render: (account) => (
        <div>
          {account.sender_paypal_email ? (
            <div className="text-xs text-blue-600">
              {showSensitiveData[account.id] ? account.sender_paypal_email : maskEmail(account.sender_paypal_email)}
            </div>
          ) : (
            <span className="text-xs text-gray-400">Не указан</span>
          )}
        </div>
      )
    },
    {
      key: 'date_created',
      label: 'Дата создания',
      sortable: true,
      render: (account) => (
        <span className="text-sm text-gray-500">
          {new Date(account.date_created).toLocaleDateString('ru-RU')}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Действия',
      render: (account) => (
        <button
          onClick={() => toggleSensitiveData(account.id)}
          className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
        >
          {showSensitiveData[account.id] ? (
            <>
              <EyeSlashIcon className="h-4 w-4 mr-1" />
              Скрыть
            </>
          ) : (
            <>
              <EyeIcon className="h-4 w-4 mr-1" />
              Показать
            </>
          )}
        </button>
      )
    }
  ]

  const actions: ActionButton<PayPalAccount>[] = [
    {
      label: 'Редактировать',
      action: (account) => {
        setSelectedAccount(account)
        setShowEditModal(true)
      },
      variant: 'primary'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Мои PayPal аккаунты</h1>
          <p className="text-gray-600">Управление PayPal аккаунтами для работы с казино</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Добавить PayPal
        </button>
      </div>

      {/* Информация о PayPal работе */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <CreditCardIcon className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Работа с PayPal аккаунтами
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>• Создавайте и ведите учет ваших PayPal аккаунтов</p>
              <p>• Записывайте данные для работы с PayPal казино</p>
              <p>• Отслеживайте балансы и переводы</p>
              <p>• Данные видны вашему Team Lead и администрации</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Всего аккаунтов"
          value={stats.totalAccounts}
          icon={<CreditCardIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Активные"
          value={stats.activeAccounts}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="success"
        />
        <KPICard
          title="Заблокированы"
          value={stats.blockedAccounts}
          icon={<XCircleIcon className="h-6 w-6" />}
          color="danger"
        />
        <KPICard
          title="Общий баланс"
          value={`$${stats.totalBalance.toFixed(2)}`}
          icon={<BanknotesIcon className="h-6 w-6" />}
          color="success"
        />
      </div>

      {/* Таблица PayPal аккаунтов */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">
            PayPal аккаунты ({accounts.length})
          </h3>
        </div>
        
        <DataTable
          data={accounts}
          columns={columns}
          actions={actions}
          loading={loading}
          pagination={{ pageSize: 10 }}
          filtering={true}
          exportable={true}
          emptyMessage="PayPal аккаунты не найдены"
        />
      </div>

      {/* Modal создания PayPal аккаунта */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Добавить PayPal аккаунт"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Имя *</label>
              <input
                type="text"
                value={newAccountForm.name}
                onChange={(e) => setNewAccountForm({ ...newAccountForm, name: e.target.value })}
                className="form-input"
                placeholder="PHILIP JOHN KNIGHT"
                required
              />
            </div>
            <div>
              <label className="form-label">Email *</label>
              <input
                type="email"
                value={newAccountForm.email}
                onChange={(e) => setNewAccountForm({ ...newAccountForm, email: e.target.value })}
                className="form-input"
                placeholder="rtehdouwos18@outlook.com"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Пароль *</label>
              <input
                type="password"
                value={newAccountForm.password}
                onChange={(e) => setNewAccountForm({ ...newAccountForm, password: e.target.value })}
                className="form-input"
                placeholder="ajCO84qtgcs!"
                required
              />
            </div>
            <div>
              <label className="form-label">Номер телефона</label>
              <input
                type="text"
                value={newAccountForm.phone_number}
                onChange={(e) => setNewAccountForm({ ...newAccountForm, phone_number: e.target.value })}
                className="form-input"
                placeholder="447312155931"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Ссылка на аутентификатор</label>
            <input
              type="url"
              value={newAccountForm.authenticator_url}
              onChange={(e) => setNewAccountForm({ ...newAccountForm, authenticator_url: e.target.value })}
              className="form-input"
              placeholder="https://2fa.fb.tools/HRCBMVK3Z5U2DYHA"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Дата создания</label>
              <input
                type="date"
                value={newAccountForm.date_created}
                onChange={(e) => setNewAccountForm({ ...newAccountForm, date_created: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Баланс ($)</label>
              <input
                type="number"
                value={newAccountForm.balance}
                onChange={(e) => setNewAccountForm({ ...newAccountForm, balance: parseFloat(e.target.value) || 0 })}
                className="form-input"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Email отправителя</label>
            <input
              type="email"
              value={newAccountForm.sender_paypal_email}
              onChange={(e) => setNewAccountForm({ ...newAccountForm, sender_paypal_email: e.target.value })}
              className="form-input"
              placeholder="pitcairnkaren565@outlook.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Баланс отправки ($)</label>
              <input
                type="number"
                value={newAccountForm.balance_send}
                onChange={(e) => setNewAccountForm({ ...newAccountForm, balance_send: parseFloat(e.target.value) || 0 })}
                className="form-input"
                placeholder="16.71"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="form-label">PayPal для отправки</label>
              <input
                type="email"
                value={newAccountForm.send_paypal_balance}
                onChange={(e) => setNewAccountForm({ ...newAccountForm, send_paypal_balance: e.target.value })}
                className="form-input"
                placeholder="pp161fdyeke@outlook.com"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Дополнительная информация</label>
            <textarea
              value={newAccountForm.info}
              onChange={(e) => setNewAccountForm({ ...newAccountForm, info: e.target.value })}
              className="form-input"
              rows={3}
              placeholder="Дополнительные заметки..."
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
              onClick={handleCreateAccount}
              className="btn-primary"
              disabled={creating}
            >
              {creating ? 'Создание...' : 'Создать аккаунт'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
