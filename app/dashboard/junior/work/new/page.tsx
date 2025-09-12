'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'
import KPICard from '@/components/ui/KPICard'
import { 
  BriefcaseIcon,
  CreditCardIcon,
  ComputerDesktopIcon,
  EyeIcon,
  ArrowLeftIcon,
  ClockIcon,
  BanknotesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface Casino {
  id: string
  name: string
  url: string
  promo?: string
  currency: string
  status: string
  allowed_bins: string[]
  auto_approve_limit: number
  payment_methods: string[] // ['card', 'paypal']
}

interface Card {
  id: string
  card_number_mask: string
  card_bin: string
  card_type: string
  status: string
  account_balance: number
  account_currency: string
  bank_account: {
    id: string
    holder_name: string
    currency: string
    bank: {
      name: string
      country: string
    } | null
  }
  casino_assignments: Array<{
    assignment_id: string
    casino_id: string
    casino_name: string
    casino_company?: string
    casino_currency?: string
    assignment_type: string
    status: string
    deposit_amount?: number
    has_deposit: boolean
  }>
}

interface PayPalAccount {
  id: string
  name: string
  email: string
  balance: number
  status: 'active' | 'blocked' | 'suspended'
  sender_paypal_email?: string
  balance_send?: number
  date_created: string
  info?: string
}

export default function NewWorkPageV2() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToast } = useToast()
  
  // Данные
  const [casinos, setCasinos] = useState<Casino[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [paypalAccounts, setPaypalAccounts] = useState<PayPalAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  // Форма создания работы
  const [workForm, setWorkForm] = useState({
    casino_id: '',
    payment_method: 'card', // 'card' или 'paypal'
    card_id: '',
    paypal_account_id: '',
    deposit_amount: 0,
    casino_login: '',
    casino_password: '',
    notes: ''
  })

  // Состояние для поиска казино
  const [casinoSearch, setCasinoSearch] = useState('')
  const [showCasinoDropdown, setShowCasinoDropdown] = useState(false)
  const [filteredCasinos, setFilteredCasinos] = useState<Casino[]>([])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    // Фильтрация казино по поиску
    if (casinoSearch) {
      const filtered = casinos.filter(casino =>
        casino.name.toLowerCase().includes(casinoSearch.toLowerCase()) ||
        casino.url.toLowerCase().includes(casinoSearch.toLowerCase())
      )
      setFilteredCasinos(filtered)
      setShowCasinoDropdown(true)
    } else {
      setFilteredCasinos(casinos)
        setShowCasinoDropdown(false)
    }
  }, [casinoSearch, casinos])

  async function loadData() {
    try {
      const preselectedCardId = searchParams.get('card_id')

      // Загружаем казино
      const casinosResponse = await fetch('/api/casinos?status=approved')
      if (casinosResponse.ok) {
        const { casinos: casinosData } = await casinosResponse.json()
        setCasinos(casinosData.filter((c: Casino) => c.status === 'approved'))
      }

      // Загружаем карты
      const cardsResponse = await fetch('/api/cards')
      if (cardsResponse.ok) {
        const { cards: cardsData } = await cardsResponse.json()
        const availableCards = cardsData.filter((c: Card) => c.status === 'active')
        setCards(availableCards)

        if (preselectedCardId && availableCards.find((c: Card) => c.id === preselectedCardId)) {
          setWorkForm(prev => ({ ...prev, card_id: preselectedCardId }))
        }
      }

      // Загружаем PayPal аккаунты
      const paypalResponse = await fetch('/api/junior/paypal')
      if (paypalResponse.ok) {
        const { accounts: paypalData } = await paypalResponse.json()
        setPaypalAccounts(paypalData.filter((p: PayPalAccount) => p.status === 'active'))
      }

    } catch (error: any) {
      console.error('Ошибка загрузки данных:', error)
      addToast({
        type: 'error',
        title: 'Ошибка загрузки данных',
        description: 'Проверьте подключение к серверу'
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateWork() {
    if (!workForm.casino_id || !workForm.deposit_amount) {
      addToast({ type: 'error', title: 'Заполните все обязательные поля' })
      return
    }

    if (workForm.payment_method === 'card' && !workForm.card_id) {
      addToast({ type: 'error', title: 'Выберите карту для оплаты' })
      return
    }

    if (workForm.payment_method === 'paypal' && !workForm.paypal_account_id) {
      addToast({ type: 'error', title: 'Выберите PayPal аккаунт для оплаты' })
      return
    }

    if (workForm.deposit_amount <= 0) {
      addToast({ type: 'error', title: 'Сумма депозита должна быть больше 0' })
      return
    }

    setCreating(true)

    try {
      const endpoint = workForm.payment_method === 'paypal' ? '/api/paypal-works' : '/api/works'
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          casino_id: workForm.casino_id,
          ...(workForm.payment_method === 'card' ? { card_id: workForm.card_id } : { paypal_account_id: workForm.paypal_account_id }),
          deposit_amount: workForm.deposit_amount,
          casino_login: workForm.casino_login,
          casino_password: workForm.casino_password,
          notes: workForm.notes
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'Работа создана',
        description: `${workForm.payment_method === 'paypal' ? 'PayPal' : 'Карточная'} работа успешно создана`
      })

      router.push('/dashboard/junior')

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка создания работы',
        description: error.message
      })
    } finally {
      setCreating(false)
    }
  }

  function selectCasino(casino: Casino) {
    setWorkForm(prev => ({ ...prev, casino_id: casino.id }))
    setCasinoSearch(casino.name)
    setShowCasinoDropdown(false)
    
    // Проверяем поддерживаемые методы оплаты
    if (casino.payment_methods && !casino.payment_methods.includes(workForm.payment_method)) {
      if (casino.payment_methods.includes('card')) {
        setWorkForm(prev => ({ ...prev, payment_method: 'card' }))
      } else if (casino.payment_methods.includes('paypal')) {
        setWorkForm(prev => ({ ...prev, payment_method: 'paypal' }))
      }
    }
  }

  const selectedCasino = casinos.find(c => c.id === workForm.casino_id)
  const selectedCard = cards.find(c => c.id === workForm.card_id)
  const selectedPayPal = paypalAccounts.find(p => p.id === workForm.paypal_account_id)

  // Сортировка PayPal аккаунтов
  const activePayPalAccounts = paypalAccounts.filter(p => p.balance > 0).sort((a, b) => b.balance - a.balance)
  const emptyPayPalAccounts = paypalAccounts.filter(p => p.balance <= 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => router.back()}
          className="btn-secondary"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Назад
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Создать новую работу</h1>
            <p className="text-gray-600">Выберите казино и способ оплаты для создания работы</p>
          </div>
        </div>
      </div>

      {/* Статистика методов оплаты */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Доступные карты"
          value={cards.length}
          icon={<CreditCardIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="PayPal с балансом"
          value={activePayPalAccounts.length}
          icon={<BanknotesIcon className="h-6 w-6" />}
          color="success"
        />
        <KPICard
          title="PayPal пустые"
          value={emptyPayPalAccounts.length}
          icon={<ExclamationTriangleIcon className="h-6 w-6" />}
          color="warning"
        />
        <KPICard
          title="Всего казино"
          value={casinos.length}
          icon={<ComputerDesktopIcon className="h-6 w-6" />}
          color="gray"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Форма создания работы */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Параметры работы</h3>
          </div>

          <div className="space-y-6">
            {/* Поиск казино */}
            <div className="casino-search-container relative">
              <label className="form-label">Казино *</label>
              <input
                type="text"
                value={casinoSearch}
                onChange={(e) => setCasinoSearch(e.target.value)}
                onFocus={() => setShowCasinoDropdown(true)}
                className="form-input"
                placeholder="Поиск казино по названию или URL..."
              />
              
              {showCasinoDropdown && filteredCasinos.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredCasinos.map((casino) => (
                    <button
                      key={casino.id}
                      onClick={() => selectCasino(casino)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">{casino.name}</div>
                      <div className="text-sm text-gray-500">{casino.url}</div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                          {casino.currency}
                        </span>
                        {casino.payment_methods?.includes('paypal') && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                            PayPal
                          </span>
                        )}
                    </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Выбор метода оплаты */}
            {selectedCasino && (
              <div>
                <label className="form-label">Метод оплаты *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setWorkForm(prev => ({ ...prev, payment_method: 'card', paypal_account_id: '' }))}
                    className={`p-4 border-2 rounded-lg transition-colors ${
                      workForm.payment_method === 'card'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    disabled={selectedCasino.payment_methods && !selectedCasino.payment_methods.includes('card')}
                  >
                    <CreditCardIcon className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <div className="font-medium">Банковская карта</div>
                    <div className="text-sm text-gray-500">{cards.length} доступно</div>
                  </button>
                  
                  <button
                    onClick={() => setWorkForm(prev => ({ ...prev, payment_method: 'paypal', card_id: '' }))}
                    className={`p-4 border-2 rounded-lg transition-colors ${
                      workForm.payment_method === 'paypal'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    disabled={selectedCasino.payment_methods && !selectedCasino.payment_methods.includes('paypal')}
                  >
                    <BanknotesIcon className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <div className="font-medium">PayPal</div>
                    <div className="text-sm text-gray-500">{activePayPalAccounts.length} с балансом</div>
                  </button>
                </div>
              </div>
            )}

            {/* Выбор карты */}
            {workForm.payment_method === 'card' && (
              <div>
                <label className="form-label">Карта *</label>
                <select
                  value={workForm.card_id}
                  onChange={(e) => setWorkForm(prev => ({ ...prev, card_id: e.target.value }))}
                  className="form-input"
                >
                  <option value="">Выберите карту</option>
                   {cards.map((card) => (
                    <option key={card.id} value={card.id}>
                       {card.card_number_mask} - {card.bank_account.holder_name} ({card.bank_account.bank?.name || 'Неизвестный банк'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Выбор PayPal */}
            {workForm.payment_method === 'paypal' && (
              <div>
                <label className="form-label">PayPal аккаунт *</label>
                
                {/* Активные PayPal с балансом */}
                {activePayPalAccounts.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <div className="text-sm font-medium text-green-700">💰 С балансом (рекомендуется)</div>
                    {activePayPalAccounts.map((paypal) => (
                      <button
                        key={paypal.id}
                        onClick={() => setWorkForm(prev => ({ ...prev, paypal_account_id: paypal.id }))}
                        className={`w-full p-3 border-2 rounded-lg text-left transition-colors ${
                          workForm.paypal_account_id === paypal.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-gray-900">{paypal.name}</div>
                            <div className="text-sm text-gray-500">{paypal.email}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600">${paypal.balance.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(paypal.date_created).toLocaleDateString('ru-RU')}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Пустые PayPal */}
                {emptyPayPalAccounts.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-orange-700">⚠️ Без баланса (требуется пополнение)</div>
                    {emptyPayPalAccounts.map((paypal) => (
                  <button
                        key={paypal.id}
                        onClick={() => setWorkForm(prev => ({ ...prev, paypal_account_id: paypal.id }))}
                        className={`w-full p-3 border-2 rounded-lg text-left transition-colors ${
                          workForm.paypal_account_id === paypal.id
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-gray-900">{paypal.name}</div>
                            <div className="text-sm text-gray-500">{paypal.email}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-orange-600">$0.00</div>
                            <div className="text-xs text-orange-500">Требует пополнения</div>
                          </div>
                        </div>
                  </button>
                    ))}
                </div>
              )}

                {paypalAccounts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <BanknotesIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>У вас нет PayPal аккаунтов</p>
                    <button
                      onClick={() => router.push('/dashboard/junior/paypal')}
                      className="btn-primary mt-4"
                    >
                      Добавить PayPal аккаунт
                    </button>
                </div>
              )}
            </div>
            )}

             {/* Сумма депозита */}
            <div>
               <label className="form-label">Сумма депозита *</label>
               <div className="relative">
              <input
                type="number"
                value={workForm.deposit_amount || ''}
                   onChange={(e) => setWorkForm(prev => ({ ...prev, deposit_amount: parseFloat(e.target.value) || 0 }))}
                   className="form-input pr-16"
                   placeholder="0.00"
                   min="0"
                step="0.01"
                 />
                 <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                   <span className="text-gray-500 text-sm font-medium bg-gray-100 px-2 py-1 rounded">
                     {selectedCasino?.currency || 'USD'}
                   </span>
                 </div>
               </div>
            </div>

            {/* Данные для входа в казино */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Логин казино</label>
                <input
                  type="text"
                  value={workForm.casino_login}
                  onChange={(e) => setWorkForm(prev => ({ ...prev, casino_login: e.target.value }))}
                  className="form-input"
                  placeholder="email или username"
                />
              </div>
              <div>
                <label className="form-label">Пароль казино</label>
                <input
                  type="password"
                  value={workForm.casino_password}
                  onChange={(e) => setWorkForm(prev => ({ ...prev, casino_password: e.target.value }))}
                  className="form-input"
                  placeholder="пароль"
                />
              </div>
            </div>

            {/* Заметки */}
            <div>
              <label className="form-label">Заметки</label>
              <textarea
                value={workForm.notes}
                onChange={(e) => setWorkForm(prev => ({ ...prev, notes: e.target.value }))}
                className="form-input"
                rows={3}
                placeholder="Дополнительная информация о работе..."
              />
      </div>

            {/* Кнопка создания */}
            <div className="flex space-x-3 pt-4">
        <button
                onClick={() => router.back()}
                className="btn-secondary flex-1"
                disabled={creating}
        >
          Отмена
        </button>
        <button
          onClick={handleCreateWork}
                className="btn-primary flex-1"
                disabled={creating || !workForm.casino_id || !workForm.deposit_amount || 
                  (workForm.payment_method === 'card' && !workForm.card_id) ||
                  (workForm.payment_method === 'paypal' && !workForm.paypal_account_id)}
        >
          {creating ? 'Создание...' : 'Создать работу'}
        </button>
      </div>
          </div>
        </div>

        {/* Превью работы */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Превью работы</h3>
          </div>

          <div className="space-y-4">
            {selectedCasino ? (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-700">Казино</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-900">{selectedCasino.name}</div>
                    <div className="text-sm text-gray-500">{selectedCasino.url}</div>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                        {selectedCasino.currency}
                      </span>
                      {selectedCasino.payment_methods?.includes('paypal') && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                          PayPal поддерживается
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Метод оплаты</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      {workForm.payment_method === 'card' ? (
                        <CreditCardIcon className="h-5 w-5 mr-2 text-blue-600" />
                      ) : (
                        <BanknotesIcon className="h-5 w-5 mr-2 text-green-600" />
                      )}
                      <span className="font-medium">
                        {workForm.payment_method === 'card' ? 'Банковская карта' : 'PayPal'}
                      </span>
                    </div>
                  </div>
                </div>

                {workForm.payment_method === 'card' && selectedCard && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Выбранная карта</label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                     <div className="font-medium text-gray-900">{selectedCard.card_number_mask}</div>
                     <div className="text-sm text-gray-500">{selectedCard.bank_account.holder_name}</div>
                     <div className="text-sm text-blue-600">
                       Банк: {selectedCard.bank_account.bank?.name || 'Неизвестный банк'}
                     </div>
                    </div>
                  </div>
                )}

                {workForm.payment_method === 'paypal' && selectedPayPal && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Выбранный PayPal</label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900">{selectedPayPal.name}</div>
                      <div className="text-sm text-gray-500">{selectedPayPal.email}</div>
                      <div className={`text-sm ${selectedPayPal.balance > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                        Баланс: ${selectedPayPal.balance.toFixed(2)}
                        {selectedPayPal.balance <= 0 && ' (требует пополнения)'}
                      </div>
                    </div>
                  </div>
                )}

                {workForm.deposit_amount > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Сумма депозита</label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {selectedCasino.currency} {workForm.deposit_amount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ComputerDesktopIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Выберите казино для создания работы</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
