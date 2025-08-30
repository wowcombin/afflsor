'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import BankBalanceEditor from '@/components/ui/BankBalanceEditor'
import KPICard from '@/components/ui/KPICard'
import { 
  BuildingLibraryIcon,
  CreditCardIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface BankAccount {
  id: string
  holder_name: string
  account_number: string
  balance: number
  currency: string
  is_active: boolean
  balance_updated_at: string
  updated_by_user: {
    name: string
    role: string
  } | null
  cards_available: boolean
}

interface Bank {
  id: string
  name: string
  country: string
  currency: string
  is_active: boolean
  accounts: BankAccount[]
}

interface BankStats {
  totalBanks: number
  totalAccounts: number
  totalBalance: number
  availableAccounts: number
}

export default function ManagerBanksPage() {
  const { addToast } = useToast()
  const [banks, setBanks] = useState<Bank[]>([])
  const [stats, setStats] = useState<BankStats>({
    totalBanks: 0,
    totalAccounts: 0,
    totalBalance: 0,
    availableAccounts: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBanks()
  }, [])

  async function loadBanks() {
    try {
      const response = await fetch('/api/banks')
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки банков')
      }

      const { banks: banksData } = await response.json()
      setBanks(banksData)

      // Рассчитываем статистику
      const totalBanks = banksData.length
      const totalAccounts = banksData.reduce((sum: number, bank: Bank) => sum + bank.accounts.length, 0)
      const totalBalance = banksData.reduce((sum: number, bank: Bank) => 
        sum + bank.accounts.reduce((accSum: number, acc: BankAccount) => accSum + acc.balance, 0), 0
      )
      const availableAccounts = banksData.reduce((sum: number, bank: Bank) => 
        sum + bank.accounts.filter((acc: BankAccount) => acc.cards_available).length, 0
      )

      setStats({
        totalBanks,
        totalAccounts,
        totalBalance,
        availableAccounts
      })

    } catch (error: any) {
      console.error('Ошибка загрузки банков:', error)
      addToast({
        type: 'error',
        title: 'Ошибка загрузки данных',
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

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
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Управление банками</h1>
        <button
          onClick={loadBanks}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ArrowPathIcon className="h-5 w-5 mr-2" />
          Обновить
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Всего банков"
          value={stats.totalBanks.toString()}
          icon={<BuildingLibraryIcon className="h-6 w-6" />}
        />
        <KPICard
          title="Всего аккаунтов"
          value={stats.totalAccounts.toString()}
          icon={<CreditCardIcon className="h-6 w-6" />}
        />
        <KPICard
          title="Общий баланс"
          value={`$${stats.totalBalance.toFixed(2)}`}
          color="green"
          icon={<span className="text-xl">💰</span>}
        />
        <KPICard
          title="Доступно аккаунтов"
          value={`${stats.availableAccounts}/${stats.totalAccounts}`}
          color={stats.availableAccounts === stats.totalAccounts ? "green" : "yellow"}
          icon={<CheckCircleIcon className="h-6 w-6" />}
        />
      </div>

      {/* Banks List */}
      <div className="space-y-6">
        {banks.map(bank => (
          <div key={bank.id} className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <BuildingLibraryIcon className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{bank.name}</h2>
                    <p className="text-gray-600">{bank.country} • {bank.currency}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Аккаунтов: {bank.accounts.length}</div>
                  <div className="text-sm text-gray-500">
                    Доступно: {bank.accounts.filter(acc => acc.cards_available).length}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              {bank.accounts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CreditCardIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Нет банковских аккаунтов</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bank.accounts.map(account => (
                    <BankBalanceEditor
                      key={account.id}
                      account={account}
                      userRole={userRole}
                      onUpdate={loadBanks}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {banks.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <BuildingLibraryIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Нет банков</h3>
          <p className="text-gray-600">Банки и аккаунты создаются через CFO панель</p>
        </div>
      )}

      {/* Warning about low balances */}
      {stats.availableAccounts < stats.totalAccounts && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-800">Внимание: Низкие балансы</h3>
              <p className="text-sm text-yellow-700 mt-1">
                {stats.totalAccounts - stats.availableAccounts} аккаунтов имеют баланс ниже $10. 
                Карты этих аккаунтов недоступны для Junior.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-medium text-blue-900 mb-3">💡 Управление балансами</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <div>• <strong>Нажмите "Изменить"</strong> для редактирования баланса аккаунта</div>
          <div>• <strong>Минимум $10</strong> - при балансе ниже карты автоматически скрываются</div>
          <div>• <strong>Комментарий</strong> - укажите причину изменения для аудита</div>
          <div>• <strong>История изменений</strong> - все изменения логируются автоматически</div>
          <div>• <strong>Уведомления</strong> - Junior получат уведомления о доступности карт</div>
        </div>
      </div>
    </div>
  )
}
