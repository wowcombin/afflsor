'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import {
  BuildingLibraryIcon,
  CreditCardIcon,
  PlusIcon,
  EyeIcon,
  EyeSlashIcon,
  BanknotesIcon,
  CalendarIcon,
  UserIcon,
  LinkIcon,
  KeyIcon
} from '@heroicons/react/24/outline'

interface BankAccount {
  id: string
  holder_name: string
  account_number: string
  balance: number
  currency: string
  is_active: boolean
  sort_code?: string
  bank_url?: string
  login_password?: string
  balance_updated_at: string
  cards: Card[]
}

interface Bank {
  id: string
  name: string
  country: string
  currency: string
  is_active: boolean
  assigned_at: string
  accounts: BankAccount[]
}

interface Card {
  id: string
  card_number_mask: string
  card_bin: string
  card_type: 'grey' | 'pink'
  status: string
  assigned_to?: string
  exp_month: number
  exp_year: number
  daily_limit?: number
  notes?: string
  created_at: string
}

interface Stats {
  totalBanks: number
  totalAccounts: number
  totalBalance: number
  totalCards: number
  activeCards: number
}

interface IssueCardForm {
  bank_account_id: string
  card_number_mask: string
  card_bin: string
  exp_month: string
  exp_year: string
  daily_limit: string
  notes: string
}

export default function TeamLeadBanksPage() {
  const { addToast } = useToast()
  const [banks, setBanks] = useState<Bank[]>([])
  const [stats, setStats] = useState<Stats>({
    totalBanks: 0,
    totalAccounts: 0,
    totalBalance: 0,
    totalCards: 0,
    activeCards: 0
  })
  const [loading, setLoading] = useState(true)
  const [showPasswords, setShowPasswords] = useState<Set<string>>(new Set())
  const [showIssueCardModal, setShowIssueCardModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null)
  const [issueCardForm, setIssueCardForm] = useState<IssueCardForm>({
    bank_account_id: '',
    card_number_mask: '',
    card_bin: '',
    exp_month: '',
    exp_year: '',
    daily_limit: '',
    notes: ''
  })
  const [issuingCard, setIssuingCard] = useState(false)

  useEffect(() => {
    loadAssignedBanks()
  }, [])

  const loadAssignedBanks = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/teamlead/assigned-banks')
      const data = await response.json()

      if (data.success) {
        setBanks(data.banks || [])
        setStats(data.stats || stats)
      } else {
        addToast({ type: 'error', title: 'Ошибка', description: data.error || 'Не удалось загрузить банки' })
      }
    } catch (error) {
      console.error('Error loading assigned banks:', error)
      addToast({ type: 'error', title: 'Ошибка', description: 'Ошибка сети' })
    } finally {
      setLoading(false)
    }
  }

  const togglePasswordVisibility = (accountId: string) => {
    const newShowPasswords = new Set(showPasswords)
    if (newShowPasswords.has(accountId)) {
      newShowPasswords.delete(accountId)
    } else {
      newShowPasswords.add(accountId)
    }
    setShowPasswords(newShowPasswords)
  }

  const openIssueCardModal = (account: BankAccount) => {
    setSelectedAccount(account)
    setIssueCardForm({
      bank_account_id: account.id,
      card_number_mask: '',
      card_bin: '',
      exp_month: '',
      exp_year: '',
      daily_limit: '1000',
      notes: `Розовая карта для ${account.holder_name}`
    })
    setShowIssueCardModal(true)
  }

  const issueCard = async () => {
    if (!selectedAccount) return

    try {
      setIssuingCard(true)
      
      const response = await fetch('/api/teamlead/issue-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(issueCardForm)
      })

      const data = await response.json()

      if (data.success) {
        addToast({ type: 'success', title: 'Карта выпущена', description: 'Розовая карта успешно создана' })
        setShowIssueCardModal(false)
        loadAssignedBanks() // Перезагружаем данные
      } else {
        addToast({ type: 'error', title: 'Ошибка', description: data.error || 'Не удалось выпустить карту' })
      }
    } catch (error) {
      console.error('Error issuing card:', error)
      addToast({ type: 'error', title: 'Ошибка', description: 'Ошибка сети' })
    } finally {
      setIssuingCard(false)
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    const symbol = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$'
    return `${symbol}${amount.toFixed(2)}`
  }

  const getCardTypeColor = (type: string) => {
    return type === 'pink' ? 'text-pink-600 bg-pink-50' : 'text-gray-600 bg-gray-50'
  }

  const getCardStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50'
      case 'blocked': return 'text-red-600 bg-red-50'
      case 'expired': return 'text-orange-600 bg-orange-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Загрузка назначенных банков...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BuildingLibraryIcon className="h-8 w-8 text-gray-700" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Мои банки</h1>
          <p className="text-gray-600">Назначенные банки и аккаунты с возможностью выпуска розовых карт</p>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <BuildingLibraryIcon className="h-8 w-8 text-blue-600" />
            <div>
              <div className="text-2xl font-bold text-blue-900">{stats.totalBanks}</div>
              <div className="text-sm text-blue-700">Банков</div>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <UserIcon className="h-8 w-8 text-green-600" />
            <div>
              <div className="text-2xl font-bold text-green-900">{stats.totalAccounts}</div>
              <div className="text-sm text-green-700">Аккаунтов</div>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <BanknotesIcon className="h-8 w-8 text-purple-600" />
            <div>
              <div className="text-2xl font-bold text-purple-900">${stats.totalBalance.toFixed(0)}</div>
              <div className="text-sm text-purple-700">Общий баланс</div>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CreditCardIcon className="h-8 w-8 text-orange-600" />
            <div>
              <div className="text-2xl font-bold text-orange-900">{stats.totalCards}</div>
              <div className="text-sm text-orange-700">Всего карт</div>
            </div>
          </div>
        </div>

        <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CreditCardIcon className="h-8 w-8 text-pink-600" />
            <div>
              <div className="text-2xl font-bold text-pink-900">{stats.activeCards}</div>
              <div className="text-sm text-pink-700">Активных карт</div>
            </div>
          </div>
        </div>
      </div>

      {/* Банки и аккаунты */}
      {banks.length === 0 ? (
        <div className="text-center py-12">
          <BuildingLibraryIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Нет назначенных банков</h3>
          <p className="mt-1 text-sm text-gray-500">
            Обратитесь к Manager для назначения банков
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {banks.map((bank) => (
            <div key={bank.id} className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <BuildingLibraryIcon className="h-6 w-6 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{bank.name}</h3>
                    <p className="text-sm text-gray-500">
                      {bank.country} • {bank.currency} • Назначен {new Date(bank.assigned_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">{bank.accounts.length} аккаунтов</div>
                  <div className="text-sm text-gray-500">
                    {bank.accounts.reduce((sum, acc) => sum + (acc.cards?.length || 0), 0)} карт
                  </div>
                </div>
              </div>

              {/* Аккаунты банка */}
              <div className="space-y-4">
                {bank.accounts.map((account) => (
                  <div key={account.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <UserIcon className="h-5 w-5 text-gray-600" />
                        <div>
                          <h4 className="font-medium text-gray-900">{account.holder_name}</h4>
                          <p className="text-sm text-gray-500">
                            {account.account_number} 
                            {account.sort_code && ` • ${account.sort_code}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(account.balance, account.currency)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Обновлен {new Date(account.balance_updated_at).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={() => openIssueCardModal(account)}
                          className="btn-primary text-sm"
                          disabled={!account.is_active}
                        >
                          <PlusIcon className="h-4 w-4 mr-1" />
                          Выпустить карту
                        </button>
                      </div>
                    </div>

                    {/* Данные доступа */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                      {account.bank_url && (
                        <div>
                          <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                            <LinkIcon className="h-3 w-3" />
                            Банк URL
                          </label>
                          <a 
                            href={account.bank_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 break-all"
                          >
                            {account.bank_url}
                          </a>
                        </div>
                      )}
                      
                      {account.login_password && (
                        <div>
                          <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                            <KeyIcon className="h-3 w-3" />
                            Пароль
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono">
                              {showPasswords.has(account.id) ? account.login_password : '••••••••'}
                            </span>
                            <button
                              onClick={() => togglePasswordVisibility(account.id)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              {showPasswords.has(account.id) ? (
                                <EyeSlashIcon className="h-4 w-4" />
                              ) : (
                                <EyeIcon className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Карты аккаунта */}
                    {account.cards && account.cards.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">
                          Карты ({account.cards.length})
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {account.cards.map((card) => (
                            <div key={card.id} className="border border-gray-200 rounded p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-mono text-sm">{card.card_number_mask}</span>
                                <div className="flex gap-1">
                                  <span className={`px-2 py-1 text-xs rounded ${getCardTypeColor(card.card_type)}`}>
                                    {card.card_type === 'pink' ? 'Розовая' : 'Серая'}
                                  </span>
                                  <span className={`px-2 py-1 text-xs rounded ${getCardStatusColor(card.status)}`}>
                                    {card.status}
                                  </span>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500">
                                <div>Истекает: {card.exp_month.toString().padStart(2, '0')}/{card.exp_year}</div>
                                {card.daily_limit && <div>Лимит: ${card.daily_limit}</div>}
                                <div>Создана: {new Date(card.created_at).toLocaleDateString()}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модал выпуска карты */}
      {showIssueCardModal && selectedAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Выпустить розовую карту для {selectedAccount.holder_name}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Маска номера карты
                </label>
                <input
                  type="text"
                  value={issueCardForm.card_number_mask}
                  onChange={(e) => setIssueCardForm(prev => ({ ...prev, card_number_mask: e.target.value }))}
                  placeholder="1234****5678"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  BIN (первые 6-8 цифр)
                </label>
                <input
                  type="text"
                  value={issueCardForm.card_bin}
                  onChange={(e) => setIssueCardForm(prev => ({ ...prev, card_bin: e.target.value }))}
                  placeholder="12345678"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Месяц
                  </label>
                  <select
                    value={issueCardForm.exp_month}
                    onChange={(e) => setIssueCardForm(prev => ({ ...prev, exp_month: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Месяц</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month}>
                        {month.toString().padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Год
                  </label>
                  <select
                    value={issueCardForm.exp_year}
                    onChange={(e) => setIssueCardForm(prev => ({ ...prev, exp_year: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Год</option>
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Дневной лимит ($)
                </label>
                <input
                  type="number"
                  value={issueCardForm.daily_limit}
                  onChange={(e) => setIssueCardForm(prev => ({ ...prev, daily_limit: e.target.value }))}
                  placeholder="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Заметки
                </label>
                <textarea
                  value={issueCardForm.notes}
                  onChange={(e) => setIssueCardForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowIssueCardModal(false)}
                className="btn-secondary flex-1"
                disabled={issuingCard}
              >
                Отмена
              </button>
              <button
                onClick={issueCard}
                className="btn-primary flex-1"
                disabled={issuingCard || !issueCardForm.card_number_mask || !issueCardForm.card_bin || !issueCardForm.exp_month || !issueCardForm.exp_year}
              >
                {issuingCard ? 'Выпускаем...' : 'Выпустить карту'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
