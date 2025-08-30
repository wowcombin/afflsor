'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import BankBalanceEditor from '@/components/ui/BankBalanceEditor'
import KPICard from '@/components/ui/KPICard'
import FormCard from '@/components/ui/FormCard'
import { 
  BuildingLibraryIcon,
  CreditCardIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  PlusIcon
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

export default function CFOBanksPage() {
  const { addToast } = useToast()
  const [banks, setBanks] = useState<Bank[]>([])
  const [stats, setStats] = useState<BankStats>({
    totalBanks: 0,
    totalAccounts: 0,
    totalBalance: 0,
    availableAccounts: 0
  })
  const [loading, setLoading] = useState(true)
  const [showNewBankForm, setShowNewBankForm] = useState(false)
  const [showNewAccountForm, setShowNewAccountForm] = useState(false)
  const [selectedBankId, setSelectedBankId] = useState('')

  // Формы для создания
  const [newBank, setNewBank] = useState({
    name: '',
    country: '',
    currency: 'USD'
  })

  const [newAccount, setNewAccount] = useState({
    bank_id: '',
    holder_name: '',
    account_number: '',
    balance: 0
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadBanks()
    } else {
      setLoading(false)
    }
  }, [])

  async function loadBanks() {
    try {
      console.log('🏦 Loading banks for CFO...')
      
      const response = await fetch('/api/banks')
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Banks API error:', errorData)
        throw new Error(errorData.error || 'Ошибка загрузки банков')
      }

      const { banks: banksData } = await response.json()
      console.log('✅ Banks loaded:', banksData)
      
      setBanks(banksData || [])

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
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Управление банками</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowNewAccountForm(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Новый аккаунт
          </button>
          <button
            onClick={() => setShowNewBankForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Новый банк
          </button>
          <button
            onClick={loadBanks}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            Обновить
          </button>
        </div>
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

      {/* New Bank Form */}
      {showNewBankForm && (
        <FormCard title="Создать новый банк">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название банка
              </label>
              <input
                type="text"
                value={newBank.name}
                onChange={(e) => setNewBank({...newBank, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Bank of America"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Страна
                </label>
                <input
                  type="text"
                  value={newBank.country}
                  onChange={(e) => setNewBank({...newBank, country: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="USA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Валюта
                </label>
                <select
                  value={newBank.currency}
                  onChange={(e) => setNewBank({...newBank, currency: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowNewBankForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  // TODO: Implement create bank
                  addToast({ type: 'info', title: 'Создание банка - в разработке' })
                  setShowNewBankForm(false)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Создать банк
              </button>
            </div>
          </div>
        </FormCard>
      )}

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
                  <button
                    onClick={() => {
                      setSelectedBankId(bank.id)
                      setNewAccount({...newAccount, bank_id: bank.id})
                      setShowNewAccountForm(true)
                    }}
                    className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Добавить аккаунт
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bank.accounts.map(account => (
                    <BankBalanceEditor
                      key={account.id}
                      account={account}
                      userRole="cfo"
                      onUpdate={loadBanks}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
