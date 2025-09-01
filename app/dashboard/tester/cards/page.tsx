'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column, ActionButton } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import StatusBadge from '@/components/ui/StatusBadge'
import Modal from '@/components/ui/Modal'
import { 
  CreditCardIcon,
  ComputerDesktopIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

interface Card {
  id: string
  card_number_mask: string
  card_bin: string
  card_type: string
  status: string
  daily_limit: number
  exp_month: number
  exp_year: number
  cvv?: string
  full_card_number?: string
  account_balance: number
  account_currency: string
  assigned_to: string | null
  assigned_casino_id: string | null
  deposit_amount?: number
  created_at: string
  casino_assignments?: {
    assignment_id: string
    casino_id: string
    casino_name: string
    casino_company?: string
    casino_currency?: string
    assignment_type: string
    status: string
    deposit_amount?: number
    has_deposit: boolean
  }[]
  bank_account?: {
    id: string
    holder_name: string
    currency: string
    bank?: {
      name: string
      country?: string
    }
  }
  casino?: {
    id: string
    name: string
    company?: string
    currency?: string
  }
}

interface Casino {
  id: string
  name: string
  status: string
  allowed_bins: string[]
  company?: string
  currency?: string
}

interface CardStats {
  totalCards: number
  availableCards: number
  inWorkCards: number
  completedCards: number
}

export default function TesterCardsPage() {
  const { addToast } = useToast()
  const [cards, setCards] = useState<Card[]>([])
  const [casinos, setCasinos] = useState<Casino[]>([])
  const [stats, setStats] = useState<CardStats>({
    totalCards: 0,
    availableCards: 0,
    inWorkCards: 0,
    completedCards: 0
  })
  const [loading, setLoading] = useState(true)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())
  const [allCasinos, setAllCasinos] = useState<Casino[]>([])
  const [selectedCasinoFilter, setSelectedCasinoFilter] = useState('')
  const [casinoSearchTerm, setCasinoSearchTerm] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [activeTab, setActiveTab] = useState<'free' | 'assigned'>('free')
  const [expandedAssignments, setExpandedAssignments] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadCards()
    loadCasinos()
    loadAllCasinos()
  }, [])

  async function loadAllCasinos() {
    try {
      // Загружаем все казино для фильтрации и выбора
      const response = await fetch('/api/casinos')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка загрузки казино')
      }

      const { casinos: casinosData } = await response.json()
      setAllCasinos(casinosData || [])

    } catch (error: any) {
      console.error('Ошибка загрузки всех казино:', error)
    }
  }

  async function loadCards() {
    try {
      const response = await fetch('/api/cards')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка загрузки карт')
      }

      const { cards: cardsData } = await response.json()
      
      console.log('🃏 Загружены карты:', {
        totalCards: cardsData?.length || 0,
        firstCard: cardsData?.[0] ? {
          id: cardsData[0].id,
          mask: cardsData[0].card_number_mask,
          status: cardsData[0].status,
          bankAccount: cardsData[0].bank_account
        } : null
      })
      
      // Добавляем информацию о назначенных казино для каждой карты
      const cardsWithCasinos = await Promise.all(
        cardsData.map(async (card: Card) => {
          if (card.assigned_casino_id) {
            try {
              const casinoResponse = await fetch(`/api/casinos/${card.assigned_casino_id}`)
              if (casinoResponse.ok) {
                const { casino } = await casinoResponse.json()
                return { ...card, casino: casino }
              }
            } catch (error) {
              console.error('Ошибка загрузки казино для карты:', error)
            }
          }
          return card
        })
      )
      
      // Статистика будет рассчитываться динамически в зависимости от выбранного казино
      setCards(cardsWithCasinos || [])

    } catch (error: any) {
      console.error('Ошибка загрузки карт:', error)
      addToast({
        type: 'error',
        title: 'Ошибка загрузки карт',
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  async function loadCasinos() {
    try {
      // Загружаем только одобренные казино для назначения Junior
      const response = await fetch('/api/casinos?status=approved')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка загрузки казино')
      }

      const { casinos: casinosData } = await response.json()
      setCasinos(casinosData || [])

    } catch (error: any) {
      console.error('Ошибка загрузки казино:', error)
    }
  }



  function toggleCardSelection(cardId: string) {
    const newSelected = new Set(selectedCards)
    if (newSelected.has(cardId)) {
      newSelected.delete(cardId)
    } else {
      newSelected.add(cardId)
    }
    setSelectedCards(newSelected)
  }

  function selectAllCards() {
    // Используем ТУ ЖЕ логику что и в DataTable для правильного выбора
    let availableCards = cards.filter(card => {
      let baseFilter = false
      
      if (activeTab === 'free') {
        // Свободные карты
        baseFilter = card.status === 'active' && !card.assigned_to && !card.assigned_casino_id
      } else {
        // Мои карты
        baseFilter = (card.casino_assignments && card.casino_assignments.length > 0) || 
                    card.assigned_casino_id !== null
      }
      
      if (!baseFilter) return false
      
      // Фильтрация для свободных карт по выбранному казино
      if (selectedCasinoFilter && activeTab === 'free') {
        // Исключаем уже назначенные на это казино
        const isAlreadyAssigned = card.casino_assignments?.some(a => 
          a.casino_id === selectedCasinoFilter && a.status === 'active'
        ) || card.assigned_casino_id === selectedCasinoFilter
        
        if (isAlreadyAssigned) return false
        
        // Проверяем BIN коды
        const selectedCasino = allCasinos.find(c => c.id === selectedCasinoFilter)
        if (selectedCasino?.allowed_bins && selectedCasino.allowed_bins.length > 0) {
          const cardBin = card.card_bin.substring(0, 6)
          return selectedCasino.allowed_bins.includes(cardBin)
        }
      }
      
      return true
    })
    
    const availableCardIds = availableCards.map(card => card.id)
    setSelectedCards(new Set(availableCardIds))
  }

  function clearSelection() {
    setSelectedCards(new Set())
  }

  function toggleAssignmentExpansion(cardId: string) {
    const newExpanded = new Set(expandedAssignments)
    if (newExpanded.has(cardId)) {
      newExpanded.delete(cardId)
    } else {
      newExpanded.add(cardId)
    }
    setExpandedAssignments(newExpanded)
  }

  async function handleMassAssignCards() {
    if (selectedCards.size === 0) {
      addToast({ type: 'error', title: 'Выберите карты для назначения' })
      return
    }

    if (!selectedCasinoFilter) {
      addToast({ type: 'error', title: 'Выберите казино для назначения карт' })
      return
    }

    setAssigning(true)

    try {
      const selectedCasino = allCasinos.find(c => c.id === selectedCasinoFilter)
      
      // ВОССТАНОВЛЕННЫЙ РАБОЧИЙ КОД - массовое назначение через assign-correct
      const response = await fetch('/api/cards/assign-correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_ids: Array.from(selectedCards),
          casino_id: selectedCasinoFilter
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'Карты назначены',
        description: data.message
      })

      if (data.assigned_count < data.total_requested) {
        addToast({
          type: 'warning',
          title: 'Частичное назначение',
          description: `${data.assigned_count} из ${data.total_requested} карт назначено (некоторые были недоступны)`
        })
      }

      setSelectedCards(new Set())
      await loadCards()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка назначения карт',
        description: error.message
      })
    } finally {
      setAssigning(false)
    }
  }



  async function handleUnassignCard(card: Card) {
    try {
      // ВОССТАНОВЛЕННЫЙ РАБОЧИЙ КОД - отзыв через unassign-from-casino
      if (card.casino_assignments && card.casino_assignments.length > 0) {
        // Освобождаем от каждого казино отдельно
        const promises = card.casino_assignments.map(assignment =>
          fetch('/api/cards/unassign-from-casino', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              card_id: card.id,
              casino_id: assignment.casino_id
            })
          })
        )

        await Promise.all(promises)
        
        addToast({
          type: 'success',
          title: 'Карта освобождена',
          description: `Карта ${card.card_number_mask} освобождена от ${card.casino_assignments.length} казино`
        })
      } else if (card.assigned_casino_id) {
        // Старая система - через assigned_casino_id
        const response = await fetch('/api/cards/unassign-from-casino', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            card_id: card.id,
            casino_id: card.assigned_casino_id
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error)
        }

        addToast({
          type: 'success',
          title: 'Карта освобождена',
          description: data.message
        })
      }

      await loadCards()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка освобождения карты',
        description: error.message
      })
    }
  }

  function getCurrencySymbol(currency: string) {
    const symbols = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'CAD': 'C$' }
    return symbols[currency as keyof typeof symbols] || currency
  }

  // Интерактивная статистика в зависимости от вкладки
  function calculateStats() {
    if (activeTab === 'assigned') {
      // Статистика для "Мои карты" - только назначенные тестировщику карты
      const myCards = cards.filter(c => 
        (c.casino_assignments && c.casino_assignments.length > 0) || 
        c.assigned_casino_id !== null
      )
      
      return {
        totalCards: myCards.length,
        availableCards: myCards.filter(c => {
          // Карты доступные для новых назначений (без депозитов)
          const hasActiveAssignments = c.casino_assignments?.some(a => !a.has_deposit) || 
                                     (c.assigned_casino_id && !c.deposit_amount)
          return hasActiveAssignments
        }).length,
        inWorkCards: myCards.filter(c => {
          // Карты в работе (есть назначения без депозитов)
          return c.casino_assignments?.some(a => !a.has_deposit) || 
                 (c.assigned_casino_id && !c.deposit_amount)
        }).length,
        completedCards: myCards.filter(c => {
          // Отработанные карты (есть депозиты)
          return c.casino_assignments?.some(a => a.has_deposit) || 
                 (c.assigned_casino_id && c.deposit_amount)
        }).length
      }
    } else {
      // Статистика для "Свободные карты"
      let filteredCards = cards

      // Если выбрано казино, фильтруем по BIN кодам
      if (selectedCasinoFilter) {
        const selectedCasino = allCasinos.find(c => c.id === selectedCasinoFilter)
        if (selectedCasino?.allowed_bins && selectedCasino.allowed_bins.length > 0) {
          filteredCards = cards.filter(card => {
            const cardBin = card.card_bin.substring(0, 6)
            return selectedCasino.allowed_bins.includes(cardBin)
          })
        }
      }

      return {
        totalCards: filteredCards.length,
        availableCards: filteredCards.filter(c => {
          const isAvailable = c.status === 'active' && !c.assigned_to && !c.assigned_casino_id
          
          // Если выбрано казино, исключаем уже назначенные на это казино
          if (selectedCasinoFilter && isAvailable) {
            const isAlreadyAssigned = c.casino_assignments?.some(a => 
              a.casino_id === selectedCasinoFilter && a.status === 'active'
            ) || c.assigned_casino_id === selectedCasinoFilter
            
            return !isAlreadyAssigned
          }
          
          return isAvailable
        }).length,
        inWorkCards: filteredCards.filter(c => c.assigned_casino_id && !c.deposit_amount).length,
        completedCards: filteredCards.filter(c => c.assigned_casino_id && c.deposit_amount).length
      }
    }
  }

  const dynamicStats = calculateStats()

  const columns: Column<Card>[] = [
    {
      key: 'select',
      label: 'Выбрать',
      align: 'center',
      render: (card) => (
        <input
          type="checkbox"
          checked={selectedCards.has(card.id)}
          onChange={() => toggleCardSelection(card.id)}
          disabled={card.status !== 'active' || !!card.assigned_to || !!card.assigned_casino_id}
          className="rounded"
        />
      )
    },
    {
      key: 'card_number_mask',
      label: 'Карта',
      sortable: true,
      filterable: true,
      render: (card) => {
        const cardBin = card.card_bin.substring(0, 6)
        const selectedCasino = allCasinos.find(c => c.id === selectedCasinoFilter)
        const binMatches = selectedCasino?.allowed_bins?.includes(cardBin)
        
        return (
          <div>
            <div className="font-mono font-medium text-gray-900">{card.card_number_mask}</div>
            <div className="text-sm text-gray-500">
              BIN: <span className={binMatches && selectedCasinoFilter ? 'text-success-600 font-medium' : ''}>{cardBin}</span>
              {binMatches && selectedCasinoFilter && <span className="text-success-600 ml-1">✅</span>}
              {selectedCasinoFilter && !binMatches && selectedCasino?.allowed_bins && selectedCasino.allowed_bins.length > 0 && <span className="text-danger-600 ml-1">❌</span>}
              <span className="ml-2">• {card.card_type === 'pink' ? '🌸 Pink' : '⚫ Grey'}</span>
            </div>
          </div>
        )
      }
    },
    {
      key: 'bank_account',
      label: 'Банк',
      render: (card) => (
        <div>
          <div className="font-medium text-gray-900">
            {card.bank_account?.bank?.name || 'Загрузка...'}
            {card.bank_account?.bank?.country && (
              <span className="text-xs text-gray-500 ml-2">({card.bank_account.bank.country})</span>
            )}
          </div>
          <div className="text-sm text-gray-500">{card.bank_account?.holder_name || 'Загрузка...'}</div>
        </div>
      )
    },
    {
      key: 'account_balance',
      label: 'Баланс',
      align: 'right',
      sortable: true,
      render: (card) => (
        <div className="text-right">
          <div className={`font-medium ${(card.account_balance || 0) >= 10 ? 'text-success-600' : 'text-danger-600'}`}>
            {getCurrencySymbol(card.account_currency)}{(card.account_balance || 0).toFixed(2)}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Статус',
      align: 'center',
      sortable: true,
      render: (card) => <StatusBadge status={card.status} size="sm" />
    },
    {
      key: 'casino',
      label: 'Назначение',
      render: (card) => {
        const isExpanded = expandedAssignments.has(card.id)
        
        // Показываем назначения через новую систему
        if (card.casino_assignments && card.casino_assignments.length > 0) {
          return (
            <div>
              <button
                onClick={() => toggleAssignmentExpansion(card.id)}
                className="text-left w-full"
              >
                <div className="font-medium text-primary-600">
                  {card.casino_assignments.length === 1 
                    ? card.casino_assignments[0].casino_name
                    : `${card.casino_assignments.length} казино`
                  }
                  <span className="ml-2 text-xs">
                    {isExpanded ? '▼' : '▶'}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  🎯 Назначена • {card.casino_assignments.filter(a => a.has_deposit).length > 0 ? '💰 Есть депозиты' : '⏳ В работе'}
                </div>
              </button>
              
              {isExpanded && (
                <div className="mt-2 space-y-2 border-t border-gray-100 pt-2">
                  {card.casino_assignments.map((assignment, index) => (
                    <div key={assignment.assignment_id} className="bg-gray-50 rounded p-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 text-sm">{assignment.casino_name}</div>
                          <div className="text-xs text-gray-500">
                            {assignment.casino_company && `${assignment.casino_company} • `}
                            Назначена: {new Date().toLocaleDateString('ru-RU')}
                          </div>
                          <div className="text-xs">
                            {assignment.has_deposit ? (
                              <span className="text-red-600">💰 Отработана (${assignment.deposit_amount})</span>
                            ) : (
                              <span className="text-green-600">⏳ В работе</span>
                            )}
                          </div>
                        </div>
                        {!assignment.has_deposit && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // Отзываем от конкретного казино
                              fetch('/api/cards/unassign-from-casino', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  card_id: card.id,
                                  casino_id: assignment.casino_id
                                })
                              }).then(() => {
                                addToast({
                                  type: 'success',
                                  title: 'Отозвано',
                                  description: `Карта отозвана с ${assignment.casino_name}`
                                })
                                loadCards()
                              })
                            }}
                            className="text-xs text-red-600 hover:text-red-800 px-2 py-1 border border-red-200 rounded"
                            title="Отозвать с этого казино"
                          >
                            🗑️ Отозвать
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        }
        
        // Старая система (для совместимости)
        if (card.casino) {
          return (
            <div>
              <div className="font-medium text-primary-600">{card.casino.name}</div>
              <div className="text-xs text-gray-500">🎯 Назначена мне (старая система)</div>
            </div>
          )
        }
        
        if (card.assigned_to) {
          return (
            <div>
              <div className="text-sm text-gray-600">Назначена Junior</div>
              <div className="text-xs text-gray-500">Недоступна</div>
            </div>
          )
        }
        
        return (
          <span className="text-sm text-success-600 font-medium">🆓 Свободна</span>
        )
      }
    },
    {
      key: 'exp_year',
      label: 'Истекает',
      align: 'center',
      render: (card) => (
        <span className="text-sm text-gray-600">
          {card.exp_month.toString().padStart(2, '0')}/{card.exp_year}
        </span>
      )
    }
  ]

  // Убираем действия - теперь отзыв происходит через кнопки в раскрывающемся списке
  const actions: ActionButton<Card>[] = []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Карты для тестирования</h1>
        <p className="text-gray-600">Назначение карт для тестирования казино</p>
      </div>

      {/* Вкладки */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => {
              setActiveTab('free')
              setSelectedCards(new Set())
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'free'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🆓 Свободные карты
          </button>
          <button
            onClick={() => {
              setActiveTab('assigned')
              setSelectedCards(new Set())
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'assigned'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🎯 Мои карты
          </button>
        </nav>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title={activeTab === 'assigned' ? "Моих карт" : (selectedCasinoFilter ? "Карт с подходящим BIN" : "Всего карт")}
          value={dynamicStats.totalCards}
          icon={<CreditCardIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title={activeTab === 'assigned' ? "Доступны для работы" : (selectedCasinoFilter ? "Доступно для казино" : "Доступные")}
          value={dynamicStats.availableCards}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="success"
        />
        <KPICard
          title="В работе"
          value={dynamicStats.inWorkCards}
          icon={<UserIcon className="h-6 w-6" />}
          color="warning"
        />
        <KPICard
          title="Отработанные"
          value={dynamicStats.completedCards}
          icon={<XCircleIcon className="h-6 w-6" />}
          color="danger"
        />
      </div>

      {/* Фильтр по казино - только для свободных карт */}
      {activeTab === 'free' && (
        <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">Выберите казино для просмотра карт</h3>
        </div>
        <div className="p-4">
          <div className="relative">
            <input
              type="text"
              placeholder={selectedCasinoFilter ? 
                allCasinos.find(c => c.id === selectedCasinoFilter)?.name || "Найти казино..." :
                "Найти казино по названию или компании..."
              }
              value={casinoSearchTerm}
              onChange={(e) => setCasinoSearchTerm(e.target.value)}
              className="form-input pr-10"
            />
            {casinoSearchTerm && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md mt-1 max-h-48 overflow-y-auto z-10 shadow-lg">
                {allCasinos
                  .filter(casino => 
                    casino.name.toLowerCase().includes(casinoSearchTerm.toLowerCase()) ||
                    (casino.company && casino.company.toLowerCase().includes(casinoSearchTerm.toLowerCase()))
                  )
                  .map(casino => (
                    <button
                      key={casino.id}
                      onClick={() => {
                        setSelectedCasinoFilter(casino.id)
                        setCasinoSearchTerm('')
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">
                            {casino.status === 'approved' ? '✅' : casino.status === 'testing' ? '🧪' : casino.status === 'new' ? '🆕' : '🚫'} {casino.name}
                          </div>
                          {casino.company && (
                            <div className="text-sm text-gray-500">🏢 {casino.company}</div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {casino.currency || 'USD'}
                        </div>
                      </div>
                    </button>
                  ))}
                {allCasinos.filter(casino => 
                  casino.name.toLowerCase().includes(casinoSearchTerm.toLowerCase()) ||
                  (casino.company && casino.company.toLowerCase().includes(casinoSearchTerm.toLowerCase()))
                ).length === 0 && (
                  <div className="px-4 py-2 text-gray-500 text-sm">Казино не найдены</div>
                )}
              </div>
            )}
            <button
              onClick={() => {
                setSelectedCasinoFilter('')
                setCasinoSearchTerm('')
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          {selectedCasinoFilter && (
            <div className="mt-3 p-3 bg-primary-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div className="text-sm text-primary-800">
                  📊 Выбрано казино: <strong>{allCasinos.find(c => c.id === selectedCasinoFilter)?.name}</strong>
                  {(() => {
                    const selectedCasino = allCasinos.find(c => c.id === selectedCasinoFilter)
                    if (selectedCasino?.allowed_bins && selectedCasino.allowed_bins.length > 0) {
                      return (
                        <div className="text-xs text-primary-600 mt-1">
                          🎯 Разрешенные BIN: {selectedCasino.allowed_bins.slice(0, 3).join(', ')}
                          {selectedCasino.allowed_bins.length > 3 && ` +${selectedCasino.allowed_bins.length - 3} еще`}
                        </div>
                      )
                    }
                    return (
                      <div className="text-xs text-warning-600 mt-1">
                        ⚠️ BIN коды не указаны - показаны все карты
                      </div>
                    )
                  })()}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={selectAllCards}
                    className="btn-info text-xs"
                  >
                    ☑️ Выбрать все подходящие
                  </button>
                  <button
                    onClick={clearSelection}
                    className="btn-secondary text-xs"
                    disabled={selectedCards.size === 0}
                  >
                    Очистить
                  </button>
                  {activeTab === 'free' ? (
                    <button
                      onClick={handleMassAssignCards}
                      className="btn-primary text-xs"
                      disabled={selectedCards.size === 0 || assigning}
                    >
                      {assigning ? 'Назначение...' : `Назначить ${selectedCards.size} карт`}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        // Массовое освобождение карт
                        Array.from(selectedCards).forEach(cardId => {
                          const card = cards.find(c => c.id === cardId)
                          if (card) handleUnassignCard(card)
                        })
                      }}
                      className="btn-danger text-xs"
                      disabled={selectedCards.size === 0}
                    >
                      Освободить ${selectedCards.size} карт
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Таблица карт */}
      <div className="card">
        <div className="card-header">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              {activeTab === 'free' ? 'Свободные карты' : 'Мои карты'} 
              ({cards.filter(card => {
                // Используем ту же логику что и в DataTable
                let baseFilter = false
                
                if (activeTab === 'free') {
                  // Свободные карты
                  baseFilter = card.status === 'active' && !card.assigned_to && !card.assigned_casino_id
                } else {
                  // Мои карты - назначенные через новую или старую систему
                  baseFilter = (card.casino_assignments && card.casino_assignments.length > 0) || 
                              card.assigned_casino_id !== null
                }
                
                if (!baseFilter) return false
                
                // Дополнительная фильтрация для свободных карт
                if (selectedCasinoFilter && activeTab === 'free') {
                  // Проверяем что карта не назначена уже на это казино
                  const isAlreadyAssigned = card.casino_assignments?.some(a => 
                    a.casino_id === selectedCasinoFilter && a.status === 'active'
                  ) || card.assigned_casino_id === selectedCasinoFilter
                  
                  if (isAlreadyAssigned) {
                    return false // Скрываем уже назначенную карту для этого казино
                  }
                  
                  // Проверяем BIN коды
                  const selectedCasino = allCasinos.find(c => c.id === selectedCasinoFilter)
                  if (selectedCasino?.allowed_bins && selectedCasino.allowed_bins.length > 0) {
                    const cardBin = card.card_bin.substring(0, 6)
                    return selectedCasino.allowed_bins.includes(cardBin)
                  }
                }
                
                return true
              }).length}) 
              {selectedCards.size > 0 && `• Выбрано: ${selectedCards.size}`}
            </h3>
            <div className="flex items-center space-x-2">
              {selectedCards.size > 0 && (
                <button
                  onClick={clearSelection}
                  className="btn-secondary text-xs"
                >
                  ❌ Очистить выбор ({selectedCards.size})
                </button>
              )}
            </div>
          </div>
        </div>
        
        <DataTable
          data={cards.filter(card => {
            // Фильтрация по вкладкам
            let baseFilter = false
            
            if (activeTab === 'free') {
              // Свободные карты
              baseFilter = card.status === 'active' && !card.assigned_to && !card.assigned_casino_id
            } else {
              // Мои карты - назначенные через новую или старую систему
              baseFilter = (card.casino_assignments && card.casino_assignments.length > 0) || 
                          card.assigned_casino_id !== null
            }
            
            if (!baseFilter) return false
            
            // Дополнительная фильтрация для свободных карт
            if (selectedCasinoFilter && activeTab === 'free') {
              // Проверяем что карта не назначена уже на это казино
              const isAlreadyAssigned = card.casino_assignments?.some(a => 
                a.casino_id === selectedCasinoFilter && a.status === 'active'
              ) || card.assigned_casino_id === selectedCasinoFilter
              
              if (isAlreadyAssigned) {
                return false // Скрываем уже назначенную карту для этого казино
              }
              
              // Проверяем BIN коды
              const selectedCasino = allCasinos.find(c => c.id === selectedCasinoFilter)
              if (selectedCasino?.allowed_bins && selectedCasino.allowed_bins.length > 0) {
                const cardBin = card.card_bin.substring(0, 6)
                return selectedCasino.allowed_bins.includes(cardBin)
              }
            }
            
            return true
          })}
          columns={columns}
          actions={actions}
          loading={loading}
          pagination={{ pageSize: 20 }}
          filtering={true}
          exportable={true}
          emptyMessage={activeTab === 'free' ? "Нет подходящих карт для выбранного казино" : "Нет назначенных карт"}
        />
      </div>



      {/* Modal деталей карты */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false)
          setSelectedCard(null)
        }}
        title="Детали карты"
        size="lg"
      >
        {selectedCard && (
          <div className="space-y-6">
            {/* Основная информация */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">🃏 Данные карты</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Номер карты:</span>
                  <div className="font-mono text-lg text-gray-900">{selectedCard.full_card_number || selectedCard.card_number_mask}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">BIN код:</span>
                  <div className="font-mono text-gray-900">{selectedCard.card_bin}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Срок действия:</span>
                  <div className="font-mono text-gray-900">
                    {selectedCard.exp_month.toString().padStart(2, '0')}/{selectedCard.exp_year}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">CVV:</span>
                  <div className="font-mono text-gray-900">{selectedCard.cvv || '***'}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Тип карты:</span>
                  <div className="text-gray-900">
                    {selectedCard.card_type === 'pink' ? '🌸 Pink' : '⚫ Grey'}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Дневной лимит:</span>
                  <div className="text-gray-900">${selectedCard.daily_limit}</div>
                </div>
              </div>
            </div>

            {/* Банковская информация */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-3">🏦 Банковский аккаунт</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-blue-700">Банк:</span>
                  <div className="text-blue-900">{selectedCard.bank_account?.bank?.name || 'Неизвестно'}</div>
                </div>
                <div>
                  <span className="font-medium text-blue-700">Владелец:</span>
                  <div className="text-blue-900">{selectedCard.bank_account?.holder_name || 'Неизвестно'}</div>
                </div>
                <div>
                  <span className="font-medium text-blue-700">Баланс:</span>
                  <div className={`font-semibold ${(selectedCard.account_balance || 0) >= 10 ? 'text-green-600' : 'text-red-600'}`}>
                    {getCurrencySymbol(selectedCard.account_currency)}{(selectedCard.account_balance || 0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-blue-700">Статус:</span>
                  <div><StatusBadge status={selectedCard.status} size="sm" /></div>
                </div>
              </div>
            </div>

            {/* Назначения */}
            {selectedCard.casino_assignments && selectedCard.casino_assignments.length > 0 && (
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-3">🎰 Назначения на казино</h4>
                <div className="space-y-2">
                  {selectedCard.casino_assignments.map((assignment: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-white rounded border">
                      <div>
                        <div className="font-medium text-gray-900">{assignment.casino_name}</div>
                        <div className="text-xs text-gray-500">
                          {assignment.assignment_type === 'testing' ? '🧪 Тестирование' : '💼 Работа'} • {assignment.status}
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        {assignment.has_deposit ? '💰 Депозит сделан' : '⏳ Ожидает депозита'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Кнопки действий */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDetailsModal(false)
                  setSelectedCard(null)
                }}
                className="btn-secondary"
              >
                Закрыть
              </button>
              {selectedCard.status === 'active' && !selectedCard.assigned_to && (
                <button
                  onClick={() => {
                    setShowDetailsModal(false)
                    setSelectedCards(new Set([selectedCard.id]))
                  }}
                  className="btn-primary"
                  disabled={!selectedCasinoFilter}
                >
                  {selectedCasinoFilter ? 'Выбрать для назначения' : 'Сначала выберите казино'}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Информация */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
        <h3 className="font-medium text-primary-900 mb-3">🃏 Работа с картами для тестирования</h3>
        <div className="text-sm text-primary-800 space-y-2">
          <div>• <strong>Назначайте карты</strong> для тестирования конкретных казино</div>
          <div>• <strong>Проверяйте BIN коды</strong> - карты должны подходить для выбранного казино</div>
          <div>• <strong>Следите за балансами</strong> - карты с низким балансом могут не подойти для тестов</div>
          <div>• <strong>Освобождайте карты</strong> после завершения тестирования</div>
        </div>
      </div>
    </div>
  )
}
