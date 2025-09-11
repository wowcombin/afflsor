'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import StatusBadge from '@/components/ui/StatusBadge'
import { 
  CreditCardIcon,
  UserIcon,
  CheckCircleIcon,
  BanknotesIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface PayPalAccount {
  id: string
  name: string
  email: string
  phone_number?: string
  authenticator_url?: string
  date_created: string
  balance: number
  sender_paypal_email?: string
  balance_send: number
  send_paypal_balance?: string
  info?: string
  status: 'active' | 'blocked' | 'suspended'
  created_at: string
  user: {
    id: string
    email: string
    first_name?: string
    last_name?: string
    role: string
    team_lead_id?: string
  }
}

export default function ManagerPayPalPage() {
  const { addToast } = useToast()
  const [accounts, setAccounts] = useState<PayPalAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [revealedData, setRevealedData] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadPayPalAccounts()
  }, [])

  async function loadPayPalAccounts() {
    try {
      setLoading(true)
      const response = await fetch('/api/paypal/accounts')
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки PayPal аккаунтов')
      }

      const data = await response.json()
      setAccounts(data.accounts || [])

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

  function toggleDataReveal(accountId: string) {
    setRevealedData(prev => {
      const newSet = new Set(prev)
      if (newSet.has(accountId)) {
        newSet.delete(accountId)
      } else {
        newSet.add(accountId)
      }
      return newSet
    })
  }

  const columns: Column<PayPalAccount>[] = [
    {
      key: 'name',
      label: 'Аккаунт',
      render: (account) => (
        <div>
          <div className="font-medium text-gray-900">{account.name}</div>
          <div className="text-sm text-gray-500">{account.email}</div>
        </div>
      )
    },
    {
      key: 'user',
      label: 'Сотрудник',
      render: (account) => (
        <div>
          <div className="font-medium text-gray-900">
            {`${account.user.first_name || ''} ${account.user.last_name || ''}`.trim() || account.user.email}
          </div>
          <div className="text-sm text-gray-500">{account.user.email}</div>
          <div className="text-xs text-blue-600">{account.user.role}</div>
        </div>
      )
    },
    {
      key: 'phone_number',
      label: 'Телефон',
      render: (account) => {
        const isRevealed = revealedData.has(account.id)
        return (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {account.phone_number ? (
                isRevealed ? account.phone_number : '***скрыт***'
              ) : 'Не указан'}
            </span>
            {account.phone_number && (
              <button
                onClick={() => toggleDataReveal(account.id)}
                className="text-gray-400 hover:text-gray-600"
              >
                {isRevealed ? (
                  <EyeSlashIcon className="h-4 w-4" />
                ) : (
                  <EyeIcon className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        )
      }
    },
    {
      key: 'balance',
      label: 'Баланс',
      render: (account) => (
        <div className="text-right">
          <div className="font-bold text-green-600">
            ${account.balance?.toFixed(2) || '0.00'}
          </div>
          {account.balance_send > 0 && (
            <div className="text-sm text-blue-600">
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
          <div className="text-sm text-gray-600">
            {account.sender_paypal_email || 'Не указан'}
          </div>
          {account.send_paypal_balance && (
            <div className="text-xs text-blue-600">
              {account.send_paypal_balance}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Статус',
      render: (account) => (
        <StatusBadge status={account.status} />
      )
    },
    {
      key: 'date_created',
      label: 'Создан',
      render: (account) => (
        <span className="text-sm text-gray-500">
          {new Date(account.date_created).toLocaleDateString('ru-RU')}
        </span>
      )
    },
    {
      key: 'info',
      label: 'Заметки',
      render: (account) => (
        <span className="text-sm text-gray-600 max-w-xs truncate">
          {account.info || 'Нет заметок'}
        </span>
      )
    }
  ]

  // Статистика
  const activeAccounts = accounts.filter(acc => acc.status === 'active')
  const blockedAccounts = accounts.filter(acc => acc.status === 'blocked')
  const suspendedAccounts = accounts.filter(acc => acc.status === 'suspended')
  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)
  const totalSendBalance = accounts.reduce((sum, acc) => sum + (acc.balance_send || 0), 0)

  // Группировка по Team Lead'ам
  const byTeamLead = accounts.reduce((acc, account) => {
    const teamLeadId = account.user.team_lead_id || 'no_team_lead'
    if (!acc[teamLeadId]) {
      acc[teamLeadId] = []
    }
    acc[teamLeadId].push(account)
    return acc
  }, {} as Record<string, PayPalAccount[]>)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Все PayPal аккаунты</h1>
          <p className="text-gray-600">Управление всеми PayPal аккаунтами в системе</p>
        </div>
      </div>

      {/* Предупреждение о конфиденциальности */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Конфиденциальные данные
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>• Некоторые данные скрыты по умолчанию для безопасности</p>
              <p>• Нажмите на иконку глаза, чтобы показать скрытые данные</p>
              <p>• Не передавайте конфиденциальную информацию третьим лицам</p>
            </div>
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <KPICard
          title="Всего аккаунтов"
          value={accounts.length}
          icon={<CreditCardIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Активных"
          value={activeAccounts.length}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="success"
        />
        <KPICard
          title="Заблокированных"
          value={blockedAccounts.length}
          icon={<ExclamationTriangleIcon className="h-6 w-6" />}
          color="danger"
        />
        <KPICard
          title="Приостановленных"
          value={suspendedAccounts.length}
          icon={<ExclamationTriangleIcon className="h-6 w-6" />}
          color="warning"
        />
        <KPICard
          title="Общий баланс"
          value={`$${totalBalance.toFixed(2)}`}
          icon={<BanknotesIcon className="h-6 w-6" />}
          color="success"
        />
        <KPICard
          title="Баланс отправки"
          value={`$${totalSendBalance.toFixed(2)}`}
          icon={<BanknotesIcon className="h-6 w-6" />}
          color="primary"
        />
      </div>

      {/* Таблица аккаунтов */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">
            PayPal аккаунты ({accounts.length})
          </h3>
        </div>
        
        <DataTable
          data={accounts}
          columns={columns}
          loading={loading}
          pagination={{ pageSize: 25 }}
          filtering={true}
          exportable={true}
          emptyMessage="PayPal аккаунты не найдены"
        />
      </div>

      {/* Статистика по командам */}
      {Object.keys(byTeamLead).length > 1 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">
              Распределение по командам
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(byTeamLead).map(([teamLeadId, teamAccounts]) => (
                <div key={teamLeadId} className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-gray-900">
                    {teamLeadId === 'no_team_lead' ? 'Без Team Lead' : `Team Lead ${teamLeadId}`}
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="text-sm text-gray-600">
                      Аккаунтов: {teamAccounts.length}
                    </div>
                    <div className="text-sm text-green-600">
                      Баланс: ${teamAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
