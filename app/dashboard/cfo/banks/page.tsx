'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import BankBalanceEditor from '@/components/ui/BankBalanceEditor'
import KPICard from '@/components/ui/KPICard'
import StatusBadge from '@/components/ui/StatusBadge'
import Modal from '@/components/ui/Modal'
import { 
  BuildingLibraryIcon,
  CreditCardIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  PlusIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline'

interface Card {
  id: string
  card_number_mask: string
  card_bin: string
  card_type: string
  status: string
  assigned_to: string | null
  exp_month: number
  exp_year: number
  daily_limit: number | null
  full_card_number?: string  // Для редактирования
  full_cvv?: string          // Для редактирования
}

interface BankAccount {
  id: string
  holder_name: string
  account_number: string
  balance: number
  currency: string
  is_active: boolean
  balance_updated_at: string
  last_updated: string
  cards_available: boolean
  cards: Card[]
  sort_code?: string
  bank_url?: string
  login_password?: string
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
  total_banks: number
  total_accounts: number
  active_accounts: number
  blocked_accounts: number
  total_balance: number
  blocked_balance: number
  total_cards: number
  available_cards: number
  low_balance_accounts: number
}

export default function CFOBanksPage() {
  const { addToast } = useToast()
  const [banks, setBanks] = useState<Bank[]>([])
  const [stats, setStats] = useState<BankStats>({
    total_banks: 0,
    total_accounts: 0,
    active_accounts: 0,
    blocked_accounts: 0,
    total_balance: 0,
    blocked_balance: 0,
    total_cards: 0,
    available_cards: 0,
    low_balance_accounts: 0
  })
  const [loading, setLoading] = useState(true)
  const [showNewBankModal, setShowNewBankModal] = useState(false)
  const [showNewAccountModal, setShowNewAccountModal] = useState(false)
  const [showNewCardModal, setShowNewCardModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selectedBankId, setSelectedBankId] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [showBlockedAccounts, setShowBlockedAccounts] = useState(false)
  const [showEditCardModal, setShowEditCardModal] = useState(false)
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [showCardDetailsModal, setShowCardDetailsModal] = useState(false)
  const [viewingCard, setViewingCard] = useState<Card | null>(null)
  const [cardSecrets, setCardSecrets] = useState<{card_number: string, cvv: string} | null>(null)
  const [showEditAccountModal, setShowEditAccountModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set())
  const [showGlobalHistoryModal, setShowGlobalHistoryModal] = useState(false)
  const [globalHistory, setGlobalHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showBalanceEditModal, setShowBalanceEditModal] = useState(false)
  const [editingBalance, setEditingBalance] = useState<BankAccount | null>(null)
  const [newBalance, setNewBalance] = useState(0)
  const [balanceComment, setBalanceComment] = useState('')
  const [exchangeRates, setExchangeRates] = useState<any>(null)
  const [showAccountHistoryModal, setShowAccountHistoryModal] = useState(false)
  const [accountHistory, setAccountHistory] = useState<any[]>([])
  const [viewingAccountHistory, setViewingAccountHistory] = useState<BankAccount | null>(null)

  // Функция для получения символа валюты
  const getCurrencySymbol = (currency: string) => {
    const symbols = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'CAD': 'C$'
    }
    return symbols[currency as keyof typeof symbols] || currency
  }

  // Форма для создания банка
  const [newBank, setNewBank] = useState({
    name: '',
    country: '',
    currency: 'USD'
  })

  // Форма для создания аккаунта
  const [newAccount, setNewAccount] = useState({
    bank_id: '',
    holder_name: '',
    account_number: '',
    balance: 0,
    currency: 'USD',
    sort_code: '',
    bank_url: '',
    login_password: ''
  })

  // Форма для создания карты
  const [newCard, setNewCard] = useState({
    bank_account_id: '',
    card_number: '',
    cvv: '',
    exp_month: new Date().getMonth() + 1,
    exp_year: 2030,
    card_type: 'grey',
    daily_limit: 0
  })

  useEffect(() => {
    loadBanks()
  }, [])

  async function loadBanks() {
    try {
      const response = await fetch('/api/banks')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка загрузки банков')
      }

      const responseData = await response.json()
      console.log('Banks API response:', responseData) // Отладка
      
      const { banks: banksData, statistics, exchange_rates } = responseData
      
      if (banksData && banksData.length > 0) {
        console.log('First bank:', banksData[0]) // Отладка
        console.log('First bank accounts:', banksData[0]?.accounts) // Отладка аккаунтов
      }
      
      setBanks(banksData || [])
      setStats(statistics || stats)
      setExchangeRates(exchange_rates || null)

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

  async function handleCreateBank() {
    if (!newBank.name.trim()) {
      addToast({ type: 'error', title: 'Укажите название банка' })
      return
    }

    setCreating(true)

    try {
      const response = await fetch('/api/banks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newBank)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'Банк создан',
        description: data.message
      })

      setShowNewBankModal(false)
      setNewBank({ name: '', country: '', currency: 'USD' })
      await loadBanks()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка создания банка',
        description: error.message
      })
    } finally {
      setCreating(false)
    }
  }

  async function handleCreateAccount() {
    if (!newAccount.holder_name.trim() || !newAccount.bank_id) {
      addToast({ type: 'error', title: 'Заполните обязательные поля' })
      return
    }

    setCreating(true)

    try {
      const response = await fetch(`/api/banks/${newAccount.bank_id}/accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAccount)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'Аккаунт создан',
        description: data.message
      })

      setShowNewAccountModal(false)
      setNewAccount({
        bank_id: '',
        holder_name: '',
        account_number: '',
        balance: 0,
        currency: 'USD',
        sort_code: '',
        bank_url: '',
        login_password: ''
      })
      await loadBanks()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка создания аккаунта',
        description: error.message
      })
    } finally {
      setCreating(false)
    }
  }

  async function handleCreateCard() {
    if (!newCard.bank_account_id || !newCard.card_number || !newCard.cvv) {
      addToast({ type: 'error', title: 'Заполните все обязательные поля' })
      return
    }

    setCreating(true)

    try {
      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newCard)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'Карта создана',
        description: data.message
      })

      setShowNewCardModal(false)
      setNewCard({
        bank_account_id: '',
        card_number: '',
        cvv: '',
        exp_month: new Date().getMonth() + 1,
        exp_year: 2030,
        card_type: 'grey',
        daily_limit: 0
      })
      await loadBanks()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка создания карты',
        description: error.message
      })
    } finally {
      setCreating(false)
    }
  }



  async function handleBlockAccount(account: BankAccount) {
    if (!confirm(`Заблокировать аккаунт ${account.holder_name}? Все карты будут деактивированы.`)) {
      return
    }

    try {
      const response = await fetch(`/api/bank-accounts/${account.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: false })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'warning',
        title: 'Аккаунт заблокирован',
        description: data.message
      })

      await loadBanks()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка блокировки аккаунта',
        description: error.message
      })
    }
  }

  async function handleUnblockAccount(account: BankAccount) {
    if (!confirm(`Разблокировать аккаунт ${account.holder_name}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/bank-accounts/${account.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: true })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'Аккаунт разблокирован',
        description: data.message
      })

      await loadBanks()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка разблокировки аккаунта',
        description: error.message
      })
    }
  }

  async function handleDeleteAccount(account: BankAccount) {
    if (!confirm(`Удалить аккаунт ${account.holder_name} навсегда? Все карты и история будут удалены.`)) {
      return
    }

    try {
      const response = await fetch(`/api/bank-accounts/${account.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'Аккаунт удален',
        description: data.message
      })

      await loadBanks()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка удаления аккаунта',
        description: error.message
      })
    }
  }



  async function handleEditAccount(account: BankAccount) {
    setEditingAccount(account)
    setShowEditAccountModal(true)
  }

  async function handleUpdateAccount() {
    if (!editingAccount) return

    try {
      setCreating(true)
      
      const response = await fetch(`/api/bank-accounts/${editingAccount.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          holder_name: editingAccount.holder_name,
          account_number: editingAccount.account_number,
          sort_code: editingAccount.sort_code,
          bank_url: editingAccount.bank_url,
          login_password: editingAccount.login_password
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'Аккаунт обновлен',
        description: data.message
      })

      setShowEditAccountModal(false)
      setEditingAccount(null)
      await loadBanks()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка обновления аккаунта',
        description: error.message
      })
    } finally {
      setCreating(false)
    }
  }

  async function handleViewCardDetails(card: Card) {
    try {
      setCreating(true)
      setViewingCard(card)
      
      // Получаем полные данные карты через API reveal
      const response = await fetch(`/api/cards/${card.id}/reveal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pin_code: '0000', context: { source: 'cfo_dashboard' } }) // Для CFO используем специальный PIN
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      console.log('Card reveal data:', data) // Отладка

      setCardSecrets({
        card_number: data.card_data?.pan || data.card_number || 'Не удалось получить',
        cvv: data.card_data?.cvv || data.cvv || 'Не удалось получить'
      })
      setShowCardDetailsModal(true)

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка получения данных карты',
        description: error.message
      })
    } finally {
      setCreating(false)
    }
  }

  async function handleEditCard(card: Card) {
    // Получаем полные данные карты для редактирования
    try {
      setCreating(true)
      
      const response = await fetch(`/api/cards/${card.id}/reveal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pin_code: '0000', context: { source: 'cfo_edit' } })
      })

      const data = await response.json()

      if (response.ok && data.card_data) {
        // Расширяем карту полными данными для редактирования
        setEditingCard({
          ...card,
          full_card_number: data.card_data.pan,
          full_cvv: data.card_data.cvv
        })
      } else {
        // Если не удалось получить полные данные, используем базовые
        setEditingCard({
          ...card,
          full_card_number: '',
          full_cvv: ''
        })
      }
      
      setShowEditCardModal(true)
    } catch (error) {
      console.error('Error loading card for edit:', error)
      setEditingCard({
        ...card,
        full_card_number: '',
        full_cvv: ''
      })
      setShowEditCardModal(true)
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteCard(card: Card) {
    if (!confirm(`Удалить карту ${card.card_number_mask}? Это действие нельзя отменить.`)) {
      return
    }

    try {
      const response = await fetch(`/api/cards/${card.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'Карта удалена',
        description: data.message
      })

      await loadBanks()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка удаления карты',
        description: error.message
      })
    }
  }

  async function handleUpdateCard() {
    if (!editingCard) return

    try {
      setCreating(true)
      
      // Подготавливаем данные для обновления
      const updateData = {
        ...editingCard,
        // Добавляем полные данные карты если они есть
        ...(editingCard.full_card_number && { card_number: editingCard.full_card_number }),
        ...(editingCard.full_cvv && { cvv: editingCard.full_cvv })
      }
      
      const response = await fetch(`/api/cards/${editingCard.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'Карта обновлена',
        description: data.message
      })

      setShowEditCardModal(false)
      setEditingCard(null)
      await loadBanks()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка обновления карты',
        description: error.message
      })
    } finally {
      setCreating(false)
    }
  }

  function toggleAccountCards(accountId: string) {
    const newExpanded = new Set(expandedAccounts)
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId)
    } else {
      newExpanded.add(accountId)
    }
    setExpandedAccounts(newExpanded)
  }

  async function loadGlobalHistory() {
    try {
      setLoadingHistory(true)
      
      const response = await fetch('/api/global-history')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка загрузки истории')
      }

      const data = await response.json()
      setGlobalHistory(data.history || [])

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка загрузки истории',
        description: error.message
      })
    } finally {
      setLoadingHistory(false)
    }
  }

  function handleEditBalance(account: BankAccount) {
    setEditingBalance(account)
    setNewBalance(account.balance)
    setBalanceComment('')
    setShowBalanceEditModal(true)
  }

  async function handleUpdateBalance() {
    if (!editingBalance) return

    try {
      setCreating(true)
      
      const response = await fetch(`/api/bank-accounts/${editingBalance.id}/balance`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          balance: newBalance,
          comment: balanceComment
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'Баланс обновлен',
        description: data.message
      })

      setShowBalanceEditModal(false)
      setEditingBalance(null)
      await loadBanks()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка обновления баланса',
        description: error.message
      })
    } finally {
      setCreating(false)
    }
  }

  async function handleShowAccountHistory(account: BankAccount) {
    try {
      setViewingAccountHistory(account)
      setLoadingHistory(true)
      setShowAccountHistoryModal(true)
      
      const response = await fetch(`/api/bank-accounts/${account.id}/balance`)
      
      if (response.ok) {
        const data = await response.json()
        setAccountHistory(data.history || [])
      } else {
        addToast({
          type: 'error',
          title: 'Ошибка загрузки истории',
          description: 'Не удалось загрузить историю аккаунта'
        })
      }

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка загрузки истории',
        description: error.message
      })
    } finally {
      setLoadingHistory(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-6 gap-4 mb-6">
            {[...Array(6)].map((_, i) => (
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Управление банками</h1>
          <p className="text-gray-600">Банки, аккаунты и управление балансами</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              setShowGlobalHistoryModal(true)
              loadGlobalHistory()
            }}
            className="btn-info"
          >
            📚 Общая история
          </button>
          <button
            onClick={() => setShowBlockedAccounts(!showBlockedAccounts)}
            className={showBlockedAccounts ? "btn-info" : "btn-danger"}
          >
            {showBlockedAccounts ? 'Показать активные' : 'Заблокированные аккаунты'}
          </button>
          <button
            onClick={() => setShowNewBankModal(true)}
            className="btn-success"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Новый банк
          </button>
        </div>
      </div>

      {/* Курсы валют */}
      {exchangeRates && (
        <div className="bg-info-50 border border-info-200 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-info-800">
                💱 Курсы валют к USD ({exchangeRates.source === 'exchangerate-api.com' ? 'Актуальные' : 'Резервные'})
              </span>
              <div className="flex items-center space-x-3 text-xs text-info-600">
                <span>💶 EUR: {exchangeRates.rates.EUR?.toFixed(3)}</span>
                <span>💷 GBP: {exchangeRates.rates.GBP?.toFixed(3)}</span>
                <span>🍁 CAD: {exchangeRates.rates.CAD?.toFixed(3)}</span>
              </div>
            </div>
            <div className="text-xs text-info-600">
              Обновлено: {new Date(exchangeRates.last_updated).toLocaleTimeString('ru-RU')}
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <KPICard
          title="Банки"
          value={stats.total_banks}
          icon={<BuildingLibraryIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title={showBlockedAccounts ? "Заблокированных" : "Активных аккаунтов"}
          value={showBlockedAccounts ? stats.blocked_accounts : stats.active_accounts}
          icon={<BanknotesIcon className="h-6 w-6" />}
          color={showBlockedAccounts ? "warning" : "success"}
        />
        <KPICard
          title={showBlockedAccounts ? "Заблок. баланс" : "Общий баланс"}
          value={`$${Number(showBlockedAccounts ? stats.blocked_balance : stats.total_balance).toFixed(2)}`}
          icon={<span className="text-xl">💰</span>}
          color={showBlockedAccounts ? "warning" : "success"}
        />
        <KPICard
          title="Всего карт"
          value={stats.total_cards}
          icon={<CreditCardIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Доступные карты"
          value={stats.available_cards}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="success"
        />
        <KPICard
          title="Низкий баланс"
          value={stats.low_balance_accounts}
          icon={<ExclamationTriangleIcon className="h-6 w-6" />}
          color="danger"
        />
      </div>

      {/* Banks List */}
      <div className="space-y-6">
        {(showBlockedAccounts ? (
          // Показываем только банки с заблокированными аккаунтами
          banks
            .filter(bank => bank.accounts.some(acc => !acc.is_active))
            .map(bank => ({
              ...bank,
              accounts: bank.accounts.filter(acc => !acc.is_active) // Только заблокированные аккаунты
            }))
        ) : (
          // Показываем банки с активными аккаунтами
          banks
            .filter(bank => bank.accounts.some(acc => acc.is_active))
            .map(bank => ({
              ...bank,
              accounts: bank.accounts.filter(acc => acc.is_active) // Только активные аккаунты
            }))
        )).map(bank => (
          <div key={bank.id} className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <BuildingLibraryIcon className="h-8 w-8 text-primary-600 mr-3" />
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
                  <div className="mt-2">
                    <span className="text-xs text-success-600 font-medium">
                      ✅ Активный банк
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              {/* Кнопка добавления аккаунта для активных банков */}
              {bank.is_active && (
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <button
                    onClick={() => {
                      setSelectedBankId(bank.id)
                      setNewAccount({...newAccount, bank_id: bank.id})
                      setShowNewAccountModal(true)
                    }}
                    className="btn-success text-sm"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Добавить аккаунт
                  </button>
                </div>
              )}

              {bank.accounts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BanknotesIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Нет банковских аккаунтов</p>
                  <p className="text-xs mt-2">Создайте первый аккаунт для этого банка</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bank.accounts.map(account => (
                    <div key={account.id} className="border border-gray-200 rounded-lg p-4">
                      {/* Заголовок аккаунта */}
                      <div className="mb-3 pb-2 border-b border-gray-100">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-lg font-semibold text-gray-900">
                                {account.holder_name}
                              </h4>
                              {/* Кнопки управления в одну линию */}
                              <div className="flex items-center space-x-2">
                                {account.is_active ? (
                                  <>
                                    <button
                                      onClick={() => {
                                        setSelectedAccountId(account.id)
                                        setNewCard({...newCard, bank_account_id: account.id})
                                        setShowNewCardModal(true)
                                      }}
                                      className="btn-success text-xs px-2 py-1"
                                      title="Добавить карту"
                                    >
                                      🃏+
                                    </button>
                                    <button
                                      onClick={() => handleShowAccountHistory(account)}
                                      className="btn-info text-xs px-2 py-1"
                                      title="История аккаунта"
                                    >
                                      📊
                                    </button>
                                    <button
                                      onClick={() => handleEditBalance(account)}
                                      className="btn-info text-xs px-2 py-1"
                                      title="Изменить баланс"
                                    >
                                      💰
                                    </button>
                                    <button
                                      onClick={() => handleEditAccount(account)}
                                      className="btn-info text-xs px-2 py-1"
                                      title="Редактировать"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() => handleBlockAccount(account)}
                                      className="btn-danger text-xs px-2 py-1"
                                      title="Заблокировать"
                                    >
                                      🚫
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-xs text-danger-600 font-medium">
                                      🚫 Заблокирован
                                    </span>
                                    <button
                                      onClick={() => handleUnblockAccount(account)}
                                      className="btn-success text-xs px-2 py-1"
                                      title="Разблокировать"
                                    >
                                      ✅
                                    </button>
                                    <button
                                      onClick={() => handleDeleteAccount(account)}
                                      className="btn-danger text-xs px-2 py-1"
                                      title="Удалить навсегда"
                                    >
                                      🗑️
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            <div className="space-y-2 text-sm text-gray-600 mt-2">
                              {/* Первая строка - основные данные */}
                              <div className="flex items-center space-x-4">
                                <span>
                                  <span className="font-medium">Acc number:</span> {account.account_number || 'Не указан'}
                                </span>
                                {account.sort_code && (
                                  <span>
                                    <span className="font-medium">Sort:</span> {account.sort_code}
                                  </span>
                                )}
                                <span>
                                  <span className="font-medium">Баланс:</span> 
                                  <span className={`ml-1 font-semibold ${(account.balance || 0) >= 10 ? 'text-success-600' : 'text-danger-600'}`}>
                                    {getCurrencySymbol(account.currency || 'USD')}{(account.balance || 0).toFixed(2)}
                                  </span>
                                </span>
                              </div>
                              
                              {/* Вторая строка - ссылка и пароль */}
                              <div className="flex items-center space-x-4">
                                {account.bank_url ? (
                                  <a 
                                    href={account.bank_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary-600 hover:text-primary-800 flex items-center text-sm"
                                  >
                                    🔗 Онлайн банкинг
                                  </a>
                                ) : (
                                  <span className="text-gray-400 text-sm">🔗 Ссылка не указана</span>
                                )}
                                
                                {account.login_password ? (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm">
                                      <span className="font-medium">Пароль:</span> {'•'.repeat(8)}
                                    </span>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(account.login_password!)
                                        addToast({ type: 'success', title: 'Пароль скопирован' })
                                      }}
                                      className="text-primary-600 hover:text-primary-800 text-sm"
                                      title="Скопировать пароль"
                                    >
                                      📋
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-sm">🔑 Пароль не указан</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>



                      {/* Карты аккаунта */}
                      {account.cards && account.cards.length > 0 && (
                        <div className="border-t border-gray-100 pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium text-gray-700">
                              Карты ({account.cards.length})
                            </h4>
                            <button
                              onClick={() => toggleAccountCards(account.id)}
                              className="text-xs text-primary-600 hover:text-primary-800 flex items-center"
                            >
                              {expandedAccounts.has(account.id) ? (
                                <>▼ Скрыть карты</>
                              ) : (
                                <>▶ Показать карты</>
                              )}
                            </button>
                          </div>
                          {expandedAccounts.has(account.id) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {account.cards.map(card => (
                              <div key={card.id} className="bg-gray-50 rounded-lg p-3">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-mono text-sm font-medium text-gray-900">
                                      {card.card_number_mask}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      BIN: {card.card_bin} • {card.card_type === 'pink' ? '🌸 Pink' : '⚫ Grey'}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {card.exp_month.toString().padStart(2, '0')}/{card.exp_year}
                                    </div>
                                    {card.assigned_to && (
                                      <div className="text-xs text-primary-600 mt-1">
                                        👤 Назначена Junior
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <StatusBadge status={card.status} size="sm" />
                                    {card.daily_limit && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        Лимит: ${card.daily_limit}
                                      </div>
                                    )}
                                    <div className="flex space-x-1 mt-2">
                                      <button
                                        onClick={() => handleViewCardDetails(card)}
                                        className="text-xs text-info-600 hover:text-info-800"
                                        title="Показать полные данные"
                                      >
                                        👁️
                                      </button>
                                      <button
                                        onClick={() => handleEditCard(card)}
                                        className="text-xs text-primary-600 hover:text-primary-800"
                                        title="Редактировать"
                                      >
                                        ✏️
                                      </button>
                                      <button
                                        onClick={() => handleDeleteCard(card)}
                                        className="text-xs text-danger-600 hover:text-danger-800"
                                        title="Удалить"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {banks.length === 0 && (
        <div className="card text-center py-12">
          <BuildingLibraryIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Нет банков</h3>
          <p className="text-gray-600">Создайте первый банк для начала работы</p>
        </div>
      )}

      {/* Warning about low balances */}
      {stats.low_balance_accounts > 0 && (
        <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-warning-600 mr-2 mt-0.5" />
            <div>
              <h3 className="font-medium text-warning-800">Внимание: Низкие балансы</h3>
              <p className="text-sm text-warning-700 mt-1">
                {stats.low_balance_accounts} аккаунтов имеют баланс ниже $10. 
                Карты этих аккаунтов недоступны для Junior.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal создания банка */}
      <Modal
        isOpen={showNewBankModal}
        onClose={() => setShowNewBankModal(false)}
        title="Создать новый банк"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="form-label">Название банка *</label>
            <input
              type="text"
              value={newBank.name}
              onChange={(e) => setNewBank({...newBank, name: e.target.value})}
              className="form-input"
              placeholder="Bank of America"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Страна</label>
              <input
                type="text"
                value={newBank.country}
                onChange={(e) => setNewBank({...newBank, country: e.target.value})}
                className="form-input"
                placeholder="USA"
              />
            </div>

            <div>
              <label className="form-label">Валюта</label>
              <select
                value={newBank.currency}
                onChange={(e) => setNewBank({...newBank, currency: e.target.value})}
                className="form-input"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowNewBankModal(false)}
              className="btn-secondary"
              disabled={creating}
            >
              Отмена
            </button>
            <button
              onClick={handleCreateBank}
              className="btn-primary"
              disabled={creating || !newBank.name.trim()}
            >
              {creating ? 'Создание...' : 'Создать банк'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal создания аккаунта */}
      <Modal
        isOpen={showNewAccountModal}
        onClose={() => {
          setShowNewAccountModal(false)
          setNewAccount({
            bank_id: '',
            holder_name: '',
            account_number: '',
            balance: 0,
            currency: 'USD',
            sort_code: '',
            bank_url: '',
            login_password: ''
          })
        }}
        title="Создать банковский аккаунт"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="form-label">Банк *</label>
            <select
              value={newAccount.bank_id}
              onChange={(e) => setNewAccount({...newAccount, bank_id: e.target.value})}
              className="form-input"
              required
            >
              <option value="">Выберите банк</option>
              {banks.map(bank => (
                <option key={bank.id} value={bank.id}>
                  {bank.name} ({bank.country})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Имя держателя аккаунта *</label>
            <input
              type="text"
              value={newAccount.holder_name}
              onChange={(e) => setNewAccount({...newAccount, holder_name: e.target.value})}
              className="form-input"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label className="form-label">Номер аккаунта</label>
            <input
              type="text"
              value={newAccount.account_number}
              onChange={(e) => setNewAccount({...newAccount, account_number: e.target.value})}
              className="form-input"
              placeholder="1234567890"
            />
          </div>



          <div>
            <label className="form-label">Sort Code</label>
            <input
              type="text"
              value={newAccount.sort_code}
              onChange={(e) => setNewAccount({...newAccount, sort_code: e.target.value})}
              className="form-input"
              placeholder="12-34-56"
            />
          </div>

          <div>
            <label className="form-label">Ссылка на банк</label>
            <input
              type="url"
              value={newAccount.bank_url}
              onChange={(e) => setNewAccount({...newAccount, bank_url: e.target.value})}
              className="form-input"
              placeholder="https://example-bank.com"
            />
          </div>

          <div>
            <label className="form-label">Пароль для входа</label>
            <input
              type="password"
              value={newAccount.login_password}
              onChange={(e) => setNewAccount({...newAccount, login_password: e.target.value})}
              className="form-input"
              placeholder="Пароль для онлайн банкинга"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Начальный баланс ($)</label>
              <input
                type="number"
                value={newAccount.balance}
                onChange={(e) => setNewAccount({...newAccount, balance: parseFloat(e.target.value) || 0})}
                className="form-input"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="form-label">Валюта</label>
              <select
                value={newAccount.currency}
                onChange={(e) => setNewAccount({...newAccount, currency: e.target.value})}
                className="form-input"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowNewAccountModal(false)}
              className="btn-secondary"
              disabled={creating}
            >
              Отмена
            </button>
            <button
              onClick={handleCreateAccount}
              className="btn-primary"
              disabled={creating || !newAccount.holder_name.trim() || !newAccount.bank_id}
            >
              {creating ? 'Создание...' : 'Создать аккаунт'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal создания карты */}
      <Modal
        isOpen={showNewCardModal}
        onClose={() => {
          setShowNewCardModal(false)
          setNewCard({
            bank_account_id: '',
            card_number: '',
            cvv: '',
            exp_month: new Date().getMonth() + 1,
            exp_year: 2030,
            card_type: 'grey',
            daily_limit: 0
          })
        }}
        title="Создать новую карту"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="form-label">Банковский аккаунт *</label>
            <select
              value={newCard.bank_account_id}
              onChange={(e) => setNewCard({...newCard, bank_account_id: e.target.value})}
              className="form-input"
              required
            >
              <option value="">Выберите аккаунт</option>
              {banks.flatMap(bank => 
                bank.accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {bank.name} - {account.holder_name} (${account.balance})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Номер карты (16 цифр) *</label>
              <input
                type="text"
                value={newCard.card_number}
                onChange={(e) => setNewCard({...newCard, card_number: e.target.value.replace(/\D/g, '')})}
                className="form-input font-mono"
                placeholder="1234567890123456"
                maxLength={16}
                required
              />
            </div>

            <div>
              <label className="form-label">CVV *</label>
              <input
                type="text"
                value={newCard.cvv}
                onChange={(e) => setNewCard({...newCard, cvv: e.target.value.replace(/\D/g, '')})}
                className="form-input font-mono"
                placeholder="123"
                maxLength={4}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="form-label">Месяц истечения *</label>
              <select
                value={newCard.exp_month}
                onChange={(e) => setNewCard({...newCard, exp_month: parseInt(e.target.value)})}
                className="form-input"
                required
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {String(i + 1).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Год истечения *</label>
              <select
                value={newCard.exp_year}
                onChange={(e) => setNewCard({...newCard, exp_year: parseInt(e.target.value)})}
                className="form-input"
                required
              >
                {[...Array(10)].map((_, i) => {
                  const year = new Date().getFullYear() + i
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  )
                })}
              </select>
            </div>

            <div>
              <label className="form-label">Тип карты</label>
              <select
                value={newCard.card_type}
                onChange={(e) => setNewCard({...newCard, card_type: e.target.value})}
                className="form-input"
              >
                <option value="grey">⚫ Серая</option>
                <option value="pink">🌸 Розовая</option>
              </select>
            </div>
          </div>

          {newCard.card_type === 'pink' && (
            <div>
              <label className="form-label">Дневной лимит ($)</label>
              <input
                type="number"
                value={newCard.daily_limit}
                onChange={(e) => setNewCard({...newCard, daily_limit: parseFloat(e.target.value) || 0})}
                className="form-input"
                placeholder="1000.00"
                min="0"
                step="0.01"
              />
            </div>
          )}

          <div className="bg-warning-50 border border-warning-200 rounded-lg p-3">
            <div className="text-sm text-warning-800">
              <p className="font-medium">⚠️ Безопасность</p>
              <p>Секреты карты будут зашифрованы и сохранены в защищенном хранилище.</p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowNewCardModal(false)}
              className="btn-secondary"
              disabled={creating}
            >
              Отмена
            </button>
            <button
              onClick={handleCreateCard}
              className="btn-primary"
              disabled={creating || !newCard.bank_account_id || !newCard.card_number || !newCard.cvv}
            >
              {creating ? 'Создание...' : 'Создать карту'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal редактирования карты */}
      <Modal
        isOpen={showEditCardModal}
        onClose={() => {
          setShowEditCardModal(false)
          setEditingCard(null)
        }}
        title="Редактировать карту"
        size="lg"
      >
        {editingCard && (
          <div className="space-y-4">
            <div className="bg-info-50 border border-info-200 rounded-lg p-3">
              <div className="text-sm text-info-800">
                <p className="font-medium text-gray-800">📝 Редактирование карты</p>
                <p className="text-gray-700">Карта: {editingCard.card_number_mask}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Полный номер карты</label>
                <input
                  type="text"
                  value={editingCard.full_card_number || ''}
                  onChange={(e) => setEditingCard({...editingCard, full_card_number: e.target.value})}
                  className="form-input font-mono"
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                />
              </div>

              <div>
                <label className="form-label">CVV</label>
                <input
                  type="text"
                  value={editingCard.full_cvv || ''}
                  onChange={(e) => setEditingCard({...editingCard, full_cvv: e.target.value})}
                  className="form-input font-mono text-center"
                  placeholder="123"
                  maxLength={4}
                />
              </div>
            </div>

            <div>
              <label className="form-label">BIN код</label>
              <input
                type="text"
                value={editingCard.card_bin}
                onChange={(e) => setEditingCard({...editingCard, card_bin: e.target.value})}
                className="form-input"
                placeholder="123456"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Месяц истечения</label>
                <select
                  value={editingCard.exp_month}
                  onChange={(e) => setEditingCard({...editingCard, exp_month: parseInt(e.target.value)})}
                  className="form-input"
                >
                  {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>
                      {month.toString().padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Год истечения</label>
                <select
                  value={editingCard.exp_year}
                  onChange={(e) => setEditingCard({...editingCard, exp_year: parseInt(e.target.value)})}
                  className="form-input"
                >
                  {Array.from({length: 10}, (_, i) => new Date().getFullYear() + i).map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Тип карты</label>
                <select
                  value={editingCard.card_type}
                  onChange={(e) => setEditingCard({...editingCard, card_type: e.target.value})}
                  className="form-input"
                >
                  <option value="grey">⚫ Серая</option>
                  <option value="pink">🌸 Розовая</option>
                </select>
              </div>

              <div>
                <label className="form-label">Статус</label>
                <select
                  value={editingCard.status}
                  onChange={(e) => setEditingCard({...editingCard, status: e.target.value})}
                  className="form-input"
                >
                  <option value="active">✅ Активна</option>
                  <option value="blocked">🚫 Заблокирована</option>
                  <option value="inactive">⏸️ Неактивна</option>
                </select>
              </div>
            </div>

            {editingCard.card_type === 'pink' && (
              <div>
                <label className="form-label">Дневной лимит ($)</label>
                <input
                  type="number"
                  value={editingCard.daily_limit || 0}
                  onChange={(e) => setEditingCard({...editingCard, daily_limit: parseFloat(e.target.value) || 0})}
                  className="form-input"
                  placeholder="1000.00"
                  min="0"
                  step="0.01"
                />
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => setShowEditCardModal(false)}
                className="btn-secondary"
                disabled={creating}
              >
                Отмена
              </button>
              <button
                onClick={handleUpdateCard}
                className="btn-primary"
                disabled={creating}
              >
                {creating ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal просмотра полных данных карты */}
      <Modal
        isOpen={showCardDetailsModal}
        onClose={() => {
          setShowCardDetailsModal(false)
          setViewingCard(null)
          setCardSecrets(null)
        }}
        title="Полные данные карты"
        size="md"
      >
        {viewingCard && cardSecrets && (
          <div className="space-y-4">
            <div className="bg-warning-50 border border-warning-200 rounded-lg p-3">
              <div className="text-sm text-warning-800">
                <p className="font-medium">⚠️ Конфиденциальные данные</p>
                <p>Не передавайте эти данные третьим лицам</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Основная информация</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Тип:</span>
                    <span>{viewingCard.card_type === 'pink' ? '🌸 Розовая' : '⚫ Серая'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Статус:</span>
                    <StatusBadge status={viewingCard.status} size="sm" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">BIN:</span>
                    <span className="font-mono">{viewingCard.card_bin}</span>
                  </div>
                  {viewingCard.daily_limit && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Дневной лимит:</span>
                      <span>${viewingCard.daily_limit}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Секретные данные</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Номер карты
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={cardSecrets.card_number}
                        readOnly
                        className="form-input font-mono text-lg"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(cardSecrets.card_number)
                          addToast({ type: 'success', title: 'Номер карты скопирован' })
                        }}
                        className="text-primary-600 hover:text-primary-800"
                        title="Скопировать номер"
                      >
                        📋
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        CVV
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={cardSecrets.cvv}
                          readOnly
                          className="form-input font-mono text-center"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(cardSecrets.cvv)
                            addToast({ type: 'success', title: 'CVV скопирован' })
                          }}
                          className="text-primary-600 hover:text-primary-800"
                          title="Скопировать CVV"
                        >
                          📋
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Срок действия
                      </label>
                      <input
                        type="text"
                        value={`${viewingCard.exp_month.toString().padStart(2, '0')}/${viewingCard.exp_year}`}
                        readOnly
                        className="form-input font-mono text-center"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {viewingCard.assigned_to && (
                <div className="bg-info-50 border border-info-200 rounded-lg p-3">
                  <div className="text-sm text-info-800">
                    <p className="font-medium">👤 Назначение</p>
                    <p>Карта назначена Junior пользователю</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => {
                  setShowCardDetailsModal(false)
                  setViewingCard(null)
                  setCardSecrets(null)
                }}
                className="btn-secondary"
              >
                Закрыть
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal редактирования аккаунта */}
      <Modal
        isOpen={showEditAccountModal}
        onClose={() => {
          setShowEditAccountModal(false)
          setEditingAccount(null)
        }}
        title="Редактировать аккаунт"
        size="md"
      >
        {editingAccount && (
          <div className="space-y-4">
            <div className="bg-info-50 border border-info-200 rounded-lg p-3">
              <div className="text-sm text-info-800">
                <p className="font-medium text-gray-800">✏️ Редактирование аккаунта</p>
                <p className="text-gray-700">Аккаунт: {editingAccount.holder_name}</p>
              </div>
            </div>

            <div>
              <label className="form-label">Имя держателя аккаунта *</label>
              <input
                type="text"
                value={editingAccount.holder_name}
                onChange={(e) => setEditingAccount({...editingAccount, holder_name: e.target.value})}
                className="form-input"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label className="form-label">Acc number</label>
              <input
                type="text"
                value={editingAccount.account_number || ''}
                onChange={(e) => setEditingAccount({...editingAccount, account_number: e.target.value})}
                className="form-input"
                placeholder="1234567890"
              />
            </div>

            <div>
              <label className="form-label">Sort Code</label>
              <input
                type="text"
                value={editingAccount.sort_code || ''}
                onChange={(e) => setEditingAccount({...editingAccount, sort_code: e.target.value})}
                className="form-input"
                placeholder="12-34-56"
              />
            </div>

            <div>
              <label className="form-label">Ссылка на банк</label>
              <input
                type="url"
                value={editingAccount.bank_url || ''}
                onChange={(e) => setEditingAccount({...editingAccount, bank_url: e.target.value})}
                className="form-input"
                placeholder="https://example-bank.com"
              />
            </div>

            <div>
              <label className="form-label">Пароль для входа</label>
              <input
                type="password"
                value={editingAccount.login_password || ''}
                onChange={(e) => setEditingAccount({...editingAccount, login_password: e.target.value})}
                className="form-input"
                placeholder="Пароль для онлайн банкинга"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => setShowEditAccountModal(false)}
                className="btn-secondary"
                disabled={creating}
              >
                Отмена
              </button>
              <button
                onClick={handleUpdateAccount}
                className="btn-primary"
                disabled={creating || !editingAccount.holder_name.trim()}
              >
                {creating ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal общей истории */}
      <Modal
        isOpen={showGlobalHistoryModal}
        onClose={() => {
          setShowGlobalHistoryModal(false)
          setGlobalHistory([])
        }}
        title="Общая история действий"
        size="xl"
      >
        <div className="space-y-4">
          <div className="bg-info-50 border border-info-200 rounded-lg p-3">
            <div className="text-sm text-info-800">
              <p className="font-medium text-gray-800">📚 История всех действий</p>
              <p className="text-gray-700">Создание банков, аккаунтов, карт, изменения балансов</p>
            </div>
          </div>

          {loadingHistory ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Загрузка истории...</p>
            </div>
          ) : globalHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>История действий пуста</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-3">
              {globalHistory.map((entry, index) => (
                <div key={entry.id || index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          entry.action_type?.includes('card') 
                            ? 'bg-success-100 text-success-800' 
                            : entry.action_type?.includes('bank')
                            ? 'bg-warning-100 text-warning-800'
                            : entry.action_type?.includes('account')
                            ? 'bg-info-100 text-info-800'
                            : 'bg-primary-100 text-primary-800'
                        }`}>
                          {entry.action_type?.includes('card') && '🃏'}
                          {entry.action_type?.includes('bank') && '🏦'}
                          {entry.action_type?.includes('account') && '👤'}
                          {entry.action_type?.includes('balance') && '💰'}
                          {' '}
                          {entry.entity_type?.charAt(0).toUpperCase() + entry.entity_type?.slice(1) || 'Действие'}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {entry.action}
                        </span>
                      </div>
                      
                      <div className="text-xs text-gray-600 space-y-1">
                        <div>
                          <span className="font-medium">Объект:</span> {entry.entity_name}
                        </div>
                        {entry.entity_details && (
                          <div>
                            <span className="font-medium">Детали:</span> 
                            {entry.entity_details.bank_name && ` Банк: ${entry.entity_details.bank_name}`}
                            {entry.entity_details.account_name && ` Аккаунт: ${entry.entity_details.account_name}`}
                            {entry.entity_details.card_type && ` Тип: ${entry.entity_details.card_type}`}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Выполнил:</span> {entry.user.name} ({entry.user.role})
                        </div>
                        {entry.ip_address && (
                          <div>
                            <span className="font-medium">IP:</span> {entry.ip_address}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 text-right">
                      {new Date(entry.created_at).toLocaleString('ru-RU')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setShowGlobalHistoryModal(false)}
              className="btn-secondary"
            >
              Закрыть
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal редактирования баланса */}
      <Modal
        isOpen={showBalanceEditModal}
        onClose={() => {
          setShowBalanceEditModal(false)
          setEditingBalance(null)
          setNewBalance(0)
          setBalanceComment('')
        }}
        title="Изменить баланс"
        size="md"
      >
        {editingBalance && (
          <div className="space-y-4">
            <div className="bg-info-50 border border-info-200 rounded-lg p-3">
              <div className="text-sm text-info-800">
                <p className="font-medium text-gray-800">💰 Изменение баланса</p>
                <p className="text-gray-700">Аккаунт: {editingBalance.holder_name}</p>
                <p className="text-gray-700">Текущий: {getCurrencySymbol(editingBalance.currency || 'USD')}{editingBalance.balance.toFixed(2)}</p>
              </div>
            </div>

            <div>
              <label className="form-label">Новый баланс</label>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-medium">{getCurrencySymbol(editingBalance.currency || 'USD')}</span>
                <input
                  type="number"
                  value={newBalance}
                  onChange={(e) => setNewBalance(parseFloat(e.target.value) || 0)}
                  className="form-input flex-1"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                <span className="text-sm text-gray-500">{editingBalance.currency}</span>
              </div>
            </div>

            <div>
              <label className="form-label">Причина изменения *</label>
              <textarea
                value={balanceComment}
                onChange={(e) => setBalanceComment(e.target.value)}
                className="form-input"
                placeholder="Укажите причину изменения баланса..."
                rows={3}
                required
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => setShowBalanceEditModal(false)}
                className="btn-secondary"
                disabled={creating}
              >
                Отмена
              </button>
              <button
                onClick={handleUpdateBalance}
                className="btn-primary"
                disabled={creating || !balanceComment.trim()}
              >
                {creating ? 'Сохранение...' : 'Сохранить баланс'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal истории аккаунта */}
      <Modal
        isOpen={showAccountHistoryModal}
        onClose={() => {
          setShowAccountHistoryModal(false)
          setViewingAccountHistory(null)
          setAccountHistory([])
        }}
        title="История аккаунта"
        size="lg"
      >
        {viewingAccountHistory && (
          <div className="space-y-4">
            <div className="bg-info-50 border border-info-200 rounded-lg p-3">
              <div className="text-sm text-info-800">
                <p className="font-medium text-gray-800">📊 История аккаунта</p>
                <p className="text-gray-700">Аккаунт: {viewingAccountHistory.holder_name}</p>
                <p className="text-gray-700">Текущий баланс: {getCurrencySymbol(viewingAccountHistory.currency || 'USD')}{viewingAccountHistory.balance.toFixed(2)}</p>
              </div>
            </div>

            {loadingHistory ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Загрузка истории...</p>
              </div>
            ) : accountHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>История изменений пуста</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-3">
                {accountHistory.map((entry, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                            💰 Баланс
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {entry.change_reason || 'Изменение баланса'}
                          </span>
                        </div>
                        
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>
                            <span className="font-medium">Изменение:</span> 
                            <span className={entry.change_amount >= 0 ? 'text-success-600' : 'text-danger-600'}>
                              {getCurrencySymbol(viewingAccountHistory.currency || 'USD')}{entry.old_balance} → {getCurrencySymbol(viewingAccountHistory.currency || 'USD')}{entry.new_balance} 
                              ({entry.change_amount >= 0 ? '+' : ''}{getCurrencySymbol(viewingAccountHistory.currency || 'USD')}{entry.change_amount})
                            </span>
                          </div>
                          {entry.changed_by_name && (
                            <div>
                              <span className="font-medium">Выполнил:</span> {entry.changed_by_name}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 text-right">
                        {new Date(entry.created_at).toLocaleString('ru-RU')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setShowAccountHistoryModal(false)}
                className="btn-info"
              >
                Закрыть
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}