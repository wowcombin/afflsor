'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'
import { 
  BriefcaseIcon,
  CreditCardIcon,
  ComputerDesktopIcon,
  EyeIcon,
  ArrowLeftIcon,
  ClockIcon
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

// Компонент для показа реквизитов карты
function CardDetailsModal({ card, onClose }: { card: Card, onClose: () => void }) {
  const { addToast } = useToast()
  const [pinCode, setPinCode] = useState('')
  const [revealing, setRevealing] = useState(false)
  const [revealedData, setRevealedData] = useState<any>(null)
  const [timeLeft, setTimeLeft] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setRevealedData(null)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [timeLeft])

  async function handleRevealCard() {
    if (!pinCode) {
      addToast({ type: 'error', title: 'Введите PIN код' })
      return
    }

    setRevealing(true)

    try {
      const response = await fetch(`/api/cards/${card.id}/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin_code: pinCode,
          context: { purpose: 'work_creation', timestamp: new Date().toISOString() }
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      setRevealedData(data.card_data)
      setTimeLeft(data.ttl || 60)
      setPinCode('')

      addToast({
        type: 'success',
        title: 'Реквизиты получены',
        description: `Доступ на ${data.ttl} секунд`
      })

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка получения реквизитов',
        description: error.message
      })
    } finally {
      setRevealing(false)
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text)
    addToast({
      type: 'success',
      title: `${label} скопирован`,
      description: 'Данные в буфере обмена'
    })
  }

  return (
    <div className="space-y-4">
      {!revealedData ? (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-800">
              <p className="font-medium text-blue-900">Информация о карте</p>
              <div className="mt-2 space-y-1 text-blue-700">
                <p>Номер: {card.card_number_mask}</p>
                <p>Тип: {card.card_type}</p>
                <p>Банк: {card.bank_account?.bank?.name}</p>
                <p>Аккаунт: {card.bank_account?.holder_name}</p>
                <p>Валюта: {card.account_currency}</p>
              </div>
            </div>
          </div>

          <div>
            <label className="form-label">PIN код для получения реквизитов</label>
            <input
              type="password"
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
              className="form-input"
              placeholder="Введите PIN (1234)"
              maxLength={4}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button onClick={onClose} className="btn-secondary" disabled={revealing}>
              Отмена
            </button>
            <button
              onClick={handleRevealCard}
              className="btn-primary"
              disabled={revealing || !pinCode}
            >
              {revealing ? 'Получение...' : 'Показать реквизиты'}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="bg-success-50 border border-success-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-success-900">Реквизиты карты</h4>
              <div className="flex items-center text-success-700">
                <ClockIcon className="h-4 w-4 mr-1" />
                <span className="font-mono">{timeLeft}s</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-green-800">Номер карты</label>
                <div className="flex items-center space-x-2">
                  <code className="bg-white px-3 py-2 rounded border font-mono text-lg text-gray-900">
                    {revealedData.pan}
                  </code>
                  <button
                    onClick={() => copyToClipboard(revealedData.pan, 'Номер карты')}
                    className="btn-secondary text-xs"
                  >
                    Копировать
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-green-800">CVV</label>
                  <div className="flex items-center space-x-2">
                    <code className="bg-white px-3 py-2 rounded border font-mono text-gray-900">
                      {revealedData.cvv}
                    </code>
                    <button
                      onClick={() => copyToClipboard(revealedData.cvv, 'CVV')}
                      className="btn-secondary text-xs"
                    >
                      Копировать
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-green-800">Срок действия</label>
                  <div className="bg-white px-3 py-2 rounded border font-mono text-gray-900">
                    {String(revealedData.exp_month).padStart(2, '0')}/{revealedData.exp_year}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-green-700">
              ⚠️ Данные автоматически скроются через {timeLeft} секунд
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function NewWorkPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToast } = useToast()
  const [casinos, setCasinos] = useState<Casino[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [activeWorks, setActiveWorks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  
  // Состояние для поиска казино
  const [casinoSearch, setCasinoSearch] = useState('')
  const [showCasinoDropdown, setShowCasinoDropdown] = useState(false)
  const [filteredCasinos, setFilteredCasinos] = useState<Casino[]>([])
  
  // Состояние для просмотра карты
  const [showCardDetailsModal, setShowCardDetailsModal] = useState(false)
  const [selectedCardForDetails, setSelectedCardForDetails] = useState<Card | null>(null)

  // Форма создания работы
  const [workForm, setWorkForm] = useState({
    casino_id: '',
    card_id: '',
    deposit_amount: 0,
    casino_login: '',
    casino_password: '',
    notes: ''
  })

  const [showCardModal, setShowCardModal] = useState(false)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  // Закрытие выпадающего списка при клике вне его
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement
      if (!target.closest('.casino-search-container')) {
        setShowCasinoDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  async function loadData() {
    try {
      // Получаем card_id из URL параметров
      const preselectedCardId = searchParams.get('card_id')

      // Загружаем доступные казино
      const casinosResponse = await fetch('/api/casinos?status=approved')
      if (casinosResponse.ok) {
        const { casinos: casinosData } = await casinosResponse.json()
        setCasinos(casinosData.filter((c: Casino) => c.status === 'approved'))
      }

      // Загружаем назначенные карты
      const cardsResponse = await fetch('/api/cards')
      if (cardsResponse.ok) {
        const { cards: cardsData } = await cardsResponse.json()
        const availableCards = cardsData.filter((c: Card) => c.status === 'active')
        setCards(availableCards)

        // Предзаполняем карту из URL параметра
        if (preselectedCardId && availableCards.find((c: Card) => c.id === preselectedCardId)) {
          setWorkForm(prev => ({ ...prev, card_id: preselectedCardId }))
          addToast({
            type: 'success',
            title: 'Карта выбрана',
            description: 'Карта автоматически выбрана из ссылки'
          })
        }
      }

      // Загружаем все работы для проверки уже используемых карт
      const worksResponse = await fetch('/api/works')
      if (worksResponse.ok) {
        const { works: worksData } = await worksResponse.json()
        // Теперь сохраняем все работы, не только активные
        setActiveWorks(worksData)
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
    if (!workForm.casino_id || !workForm.card_id || !workForm.deposit_amount) {
      addToast({ type: 'error', title: 'Заполните все обязательные поля' })
      return
    }

    if (workForm.deposit_amount <= 0) {
      addToast({ type: 'error', title: 'Сумма депозита должна быть больше 0' })
      return
    }

    setCreating(true)

    try {
      const response = await fetch('/api/works', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          casino_id: workForm.casino_id,
          card_id: workForm.card_id,
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
        description: data.message
      })

      // Перенаправляем на дашборд
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

  function getSelectedCasino() {
    return casinos.find(c => c.id === workForm.casino_id)
  }

  function getSelectedCard() {
    return cards.find(c => c.id === workForm.card_id)
  }

  // Фильтрация казино по поиску
  function handleCasinoSearch(value: string) {
    setCasinoSearch(value)
    const filtered = casinos.filter(casino => 
      casino.name.toLowerCase().includes(value.toLowerCase())
    )
    setFilteredCasinos(filtered)
    setShowCasinoDropdown(value.length > 0 && filtered.length > 0)
  }

  // Выбор казино из поиска
  function selectCasino(casino: Casino) {
    // Находим первую доступную карту для этого казино
    const availableCards = cards.filter(card => 
      card.casino_assignments.some(assignment => 
        assignment.casino_id === casino.id && 
        assignment.status === 'active'
      )
    )
    
    const firstCard = availableCards[0]
    
    setWorkForm({ 
      ...workForm, 
      casino_id: casino.id, 
      card_id: firstCard ? firstCard.id : '' // Автоматически выбираем первую карту
    })
    setCasinoSearch(casino.name)
    setShowCasinoDropdown(false)
  }

  // Получить карты, назначенные на выбранное казино и не используемые в активных работах
  function getAvailableCards() {
    if (!workForm.casino_id) return []
    
    // Получаем карты, назначенные на выбранное казино
    const assignedCards = cards.filter(card => 
      card.casino_assignments.some(assignment => 
        assignment.casino_id === workForm.casino_id && 
        assignment.status === 'active'
      )
    )
    
    // Исключаем карты, которые уже используются в работах для этого казино
    // Карта считается используемой если:
    // 1. Работа активна (status === 'active')
    // 2. Есть выводы в статусе 'new', 'waiting', 'received'
    const usedCardIds = activeWorks
      .filter(work => {
        if (work.casino?.id !== workForm.casino_id) return false
        
        // Если работа активна - карта используется
        if (work.status === 'active') return true
        
        // Если есть активные выводы - карта используется
        const hasActiveWithdrawals = work.withdrawals && work.withdrawals.some((w: any) => 
          ['new', 'waiting', 'received'].includes(w.status)
        )
        
        return hasActiveWithdrawals
      })
      .map(work => work.card?.id)
    
    return assignedCards.filter(card => !usedCardIds.includes(card.id))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
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
          <p className="text-gray-600">Выберите казино и карту для создания депозита</p>
        </div>
      </div>

      <div className="max-w-2xl">
        {/* Форма создания */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Параметры работы</h3>
          </div>

          <div className="space-y-4">
            <div className="relative casino-search-container">
              <label className="form-label">Казино *</label>
              <input
                type="text"
                value={casinoSearch}
                onChange={(e) => handleCasinoSearch(e.target.value)}
                onFocus={() => {
                  if (casinoSearch && filteredCasinos.length > 0) {
                    setShowCasinoDropdown(true)
                  }
                }}
                className="form-input"
                placeholder="Начните вводить название казино..."
                required
              />
              
              {/* Выпадающий список казино */}
              {showCasinoDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredCasinos.map(casino => (
                    <div
                      key={casino.id}
                      onClick={() => selectCasino(casino)}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium">{casino.name}</div>
                      <div className="text-sm text-gray-500">{casino.currency}</div>
                    </div>
                  ))}
                </div>
              )}
              
              {getSelectedCasino() && (
                <div className="mt-2">
                  <button
                    onClick={() => {
                      const casino = getSelectedCasino()!
                      const promoText = casino.promo || 'Промо-код не указан'
                      navigator.clipboard.writeText(promoText)
                      addToast({
                        type: 'success',
                        title: 'Скопировано!',
                        description: casino.promo ? 'Промо-код скопирован в буфер обмена' : 'Промо-код не найден'
                      })
                    }}
                    className="btn-secondary text-xs"
                    disabled={!getSelectedCasino()?.promo}
                  >
                    📋 Скопировать промо
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="form-label">Карта *</label>
              {workForm.card_id ? (
                // Показываем выбранную карту как readonly
                <div className="form-input bg-gray-50 flex items-center justify-between">
                  <span>
                    {getSelectedCard()?.card_number_mask} - {getSelectedCard()?.bank_account?.bank?.name || 'Неизвестный банк'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setWorkForm({ ...workForm, card_id: '' })}
                    className="text-gray-400 hover:text-gray-600 text-sm"
                  >
                    Изменить
                  </button>
                </div>
              ) : (
                // Показываем select только если карта не выбрана
                <select
                  value={workForm.card_id}
                  onChange={(e) => setWorkForm({ ...workForm, card_id: e.target.value })}
                  className="form-input"
                  required
                  disabled={!workForm.casino_id}
                >
                  <option value="">
                    {!workForm.casino_id ? 'Сначала выберите казино' : 'Выберите карту'}
                  </option>
                  {getAvailableCards().map(card => (
                    <option key={card.id} value={card.id}>
                      {card.card_number_mask} - {card.bank_account?.bank?.name || 'Неизвестный банк'}
                    </option>
                  ))}
                </select>
              )}
              {getSelectedCard() && (
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <div>Тип: {getSelectedCard()!.card_type}</div>
                    <div>Аккаунт: {getSelectedCard()!.bank_account?.holder_name || 'Неизвестный аккаунт'}</div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCardForDetails(getSelectedCard()!)
                      setShowCardDetailsModal(true)
                    }}
                    className="btn-secondary text-xs"
                  >
                    👁️ Реквизиты
                  </button>
                </div>
              )}
              {!workForm.casino_id && (
                <div className="mt-2 text-sm text-gray-500">
                  Выберите казино, чтобы увидеть назначенные карты
                </div>
              )}
              {workForm.casino_id && getAvailableCards().length === 0 && (
                <div className="mt-2 text-sm text-orange-600">
                  На это казино не назначено ни одной карты
                </div>
              )}
            </div>

            <div>
              <label className="form-label">
                Сумма депозита ({getSelectedCasino()?.currency || '$'}) *
              </label>
              <input
                type="number"
                value={workForm.deposit_amount || ''}
                onChange={(e) => setWorkForm({ ...workForm, deposit_amount: parseFloat(e.target.value) || 0 })}
                className="form-input"
                placeholder="Введите сумму депозита"
                min="1"
                step="0.01"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Логин для казино</label>
                <input
                  type="text"
                  value={workForm.casino_login}
                  onChange={(e) => setWorkForm({ ...workForm, casino_login: e.target.value })}
                  className="form-input"
                  placeholder="username"
                />
              </div>
              <div>
                <label className="form-label">Пароль для казино</label>
                <input
                  type="password"
                  value={workForm.casino_password}
                  onChange={(e) => setWorkForm({ ...workForm, casino_password: e.target.value })}
                  className="form-input"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Заметки</label>
              <textarea
                value={workForm.notes}
                onChange={(e) => setWorkForm({ ...workForm, notes: e.target.value })}
                className="form-input"
                rows={3}
                placeholder="Особенности, заметки по работе..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Кнопки действий */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={() => router.push('/dashboard/junior')}
          className="btn-secondary"
        >
          Отмена
        </button>
        <button
          onClick={handleCreateWork}
          disabled={creating || !workForm.casino_id || !workForm.card_id || !workForm.deposit_amount}
          className="btn-primary"
        >
          {creating ? 'Создание...' : 'Создать работу'}
        </button>
      </div>

      {/* Modal показа реквизитов карты */}
      <Modal
        isOpen={showCardDetailsModal}
        onClose={() => {
          setShowCardDetailsModal(false)
          setSelectedCardForDetails(null)
        }}
        title={`Реквизиты карты ${selectedCardForDetails?.card_number_mask}`}
        size="md"
      >
        {selectedCardForDetails && (
          <CardDetailsModal 
            card={selectedCardForDetails}
            onClose={() => setShowCardDetailsModal(false)}
          />
        )}
      </Modal>

      {/* Инструкции */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
        <h3 className="font-medium text-primary-900 mb-3">📋 Создание работы</h3>
        <div className="text-sm text-primary-800 space-y-2">
          <div>1. <strong>Выберите одобренное казино</strong> из списка</div>
          <div>2. <strong>Выберите доступную карту</strong> с достаточным балансом</div>
          <div>3. <strong>Укажите сумму депозита</strong> для работы</div>
          <div>4. <strong>Заполните данные входа</strong> в казино (если есть)</div>
          <div>5. <strong>Создайте работу</strong> и переходите к выполнению</div>
        </div>
      </div>
    </div>
  )
}
