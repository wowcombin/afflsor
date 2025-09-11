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
  ChartBarIcon,
  UsersIcon
} from '@heroicons/react/24/outline'

interface PayPalAccount {
  id: string
  name: string
  email: string
  phone_number?: string
  date_created: string
  balance: number
  sender_paypal_email?: string
  balance_send: number
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

export default function HRPayPalPage() {
  const { addToast } = useToast()
  const [accounts, setAccounts] = useState<PayPalAccount[]>([])
  const [loading, setLoading] = useState(true)

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

  const columns: Column<PayPalAccount>[] = [
    {
      key: 'user',
      label: 'Сотрудник',
      render: (account) => (
        <div>
          <div className="font-medium text-gray-900">
            {`${account.user.first_name || ''} ${account.user.last_name || ''}`.trim() || account.user.email}
          </div>
          <div className="text-sm text-gray-500">{account.user.email}</div>
          <div className="text-xs text-blue-600 capitalize">{account.user.role}</div>
        </div>
      )
    },
    {
      key: 'name',
      label: 'PayPal аккаунт',
      render: (account) => (
        <div>
          <div className="font-medium text-gray-900">{account.name}</div>
          <div className="text-sm text-gray-500">{account.email}</div>
        </div>
      )
    },
    {
      key: 'phone_number',
      label: 'Телефон',
      render: (account) => (
        <span className="text-sm text-gray-600">
          {account.phone_number || 'Не указан'}
        </span>
      )
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
      key: 'sender_paypal_email',
      label: 'Отправитель',
      render: (account) => (
        <span className="text-sm text-gray-600">
          {account.sender_paypal_email || 'Не указан'}
        </span>
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

  // HR статистика
  const activeAccounts = accounts.filter(acc => acc.status === 'active')
  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)
  const uniqueUsers = new Set(accounts.map(acc => acc.user.id)).size

  // Статистика по ролям
  const roleStats = accounts.reduce((acc, account) => {
    const role = account.user.role
    if (!acc[role]) {
      acc[role] = { count: 0, balance: 0 }
    }
    acc[role].count++
    acc[role].balance += account.balance || 0
    return acc
  }, {} as Record<string, { count: number; balance: number }>)

  // Статистика по статусам
  const statusStats = {
    active: accounts.filter(acc => acc.status === 'active').length,
    blocked: accounts.filter(acc => acc.status === 'blocked').length,
    suspended: accounts.filter(acc => acc.status === 'suspended').length
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PayPal отчеты</h1>
          <p className="text-gray-600">Анализ PayPal аккаунтов сотрудников</p>
        </div>
      </div>

      {/* HR информация */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <ChartBarIcon className="h-5 w-5 text-purple-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-purple-800">
              HR анализ PayPal аккаунтов
            </h3>
            <div className="mt-2 text-sm text-purple-700">
              <p>• Мониторинг использования PayPal аккаунтов сотрудниками</p>
              <p>• Анализ балансов и активности по командам</p>
              <p>• Контроль статусов и эффективности работы</p>
              <p>• Отчеты по производительности и нагрузке</p>
            </div>
          </div>
        </div>
      </div>

      {/* Основная статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          title="Сотрудников"
          value={uniqueUsers}
          icon={<UsersIcon className="h-6 w-6" />}
          color="warning"
        />
        <KPICard
          title="Общий баланс"
          value={`$${totalBalance.toFixed(2)}`}
          icon={<BanknotesIcon className="h-6 w-6" />}
          color="success"
        />
      </div>

      {/* Статистика по ролям */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">
              Распределение по ролям
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {Object.entries(roleStats).map(([role, stats]) => (
                <div key={role} className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-gray-900 capitalize">{role}</div>
                    <div className="text-sm text-gray-500">{stats.count} аккаунтов</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      ${stats.balance.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">
              Статусы аккаунтов
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-gray-900">Активные</span>
                </div>
                <span className="font-bold text-green-600">{statusStats.active}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <span className="text-gray-900">Заблокированные</span>
                </div>
                <span className="font-bold text-red-600">{statusStats.blocked}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                  <span className="text-gray-900">Приостановленные</span>
                </div>
                <span className="font-bold text-yellow-600">{statusStats.suspended}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Таблица аккаунтов */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">
            Все PayPal аккаунты
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
    </div>
  )
}
