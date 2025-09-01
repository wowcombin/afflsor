'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column, ActionButton } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import StatusBadge from '@/components/ui/StatusBadge'
import Modal from '@/components/ui/Modal'
import { 
  CreditCardIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  UsersIcon
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
    balance: number
    is_active: boolean
    bank?: {
      name: string
      country?: string
    }
  }
  assigned_user?: {
    id: string
    first_name: string
    last_name: string
    email: string
    role: string
  }
}

interface Junior {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  status: string
  created_at: string
  stats?: {
    assigned_cards: number
    active_cards: number
    total_deposits: number
    success_rate: number
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
  assignedCards: number
  blockedCards: number
}

export default function ManagerCardsPage() {
  const { addToast } = useToast()
  const [cards, setCards] = useState<Card[]>([])
  const [juniors, setJuniors] = useState<Junior[]>([])
  const [casinos, setCasinos] = useState<Casino[]>([])
  const [stats, setStats] = useState<CardStats>({
    totalCards: 0,
    availableCards: 0,
    assignedCards: 0,
    blockedCards: 0
  })
  const [loading, setLoading] = useState(true)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())
  const [selectedJuniorFilter, setSelectedJuniorFilter] = useState('')
  const [selectedCasinoFilter, setSelectedCasinoFilter] = useState('')
  const [juniorSearchTerm, setJuniorSearchTerm] = useState('')
  const [casinoSearchTerm, setCasinoSearchTerm] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [activeTab, setActiveTab] = useState<'free' | 'assigned'>('free')
  const [expandedAssignments, setExpandedAssignments] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadCards()
    loadJuniors()
    loadCasinos()
  }, [])

  async function loadCards() {
    try {
      const response = await fetch('/api/manager/cards')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка загрузки карт')
      }

      const { data: cardsData } = await response.json()
      
      console.log('🃏 Загружены карты для Manager:', {
        totalCards: cardsData?.length || 0,
        firstCard: cardsData?.[0] ? {
          id: cardsData[0].id,
          mask: cardsData[0].card_number_mask,
          status: cardsData[0].status,
          assigned_to: cardsData[0].assigned_to
        } : null
      })
      
      setCards(cardsData || [])

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

  async function loadJuniors() {
    try {
      const response = await fetch('/api/manager/team')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка загрузки команды')
      }

      const { data: teamData } = await response.json()
      const juniorsData = teamData.filter((user: any) => user.role === 'junior')
      setJuniors(juniorsData || [])

    } catch (error: any) {
      console.error('Ошибка загрузки Junior\'ов:', error)
    }
  }

  async function loadCasinos() {
    try {
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
    let availableCards = cards.filter(card => {
      let baseFilter = false
      
      if (activeTab === 'free') {
        // Свободные карты
        baseFilter = card.status === 'active' && !card.assigned_to
      } else {
        // Назначенные карты
        baseFilter = !!card.assigned_to
      }
      
      if (!baseFilter) return false
      
      // Фильтрация для свободных карт по выбранному Junior'у
      if (selectedJuniorFilter && activeTab === 'free') {
        // Проверяем BIN коды если выбрано казино
        if (selectedCasinoFilter) {
          const selectedCasino = casinos.find(c => c.id === selectedCasinoFilter)
          if (selectedCasino?.allowed_bins && selectedCasino.allowed_bins.length > 0) {
            const cardBin = card.card_bin.substring(0, 6)
            return selectedCasino.allowed_bins.includes(cardBin)
          }
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

  async function handleMassAssignCards() {
    if (selectedCards.size === 0) {
      addToast({ type: 'error', title: 'Выберите карты для назначения' })
      return
    }

    if (!selectedJuniorFilter) {
      addToast({ type: 'error', title: 'Выберите Junior\'а для назначения карт' })
      return
    }

    setAssigning(true)

    try {
      const response = await fetch('/api/manager/cards/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_ids: Array.from(selectedCards),
          user_id: selectedJuniorFilter,
          casino_id: selectedCasinoFilter || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'Карты назначены',
        description: data.message || `${selectedCards.size} карт назначено Junior'у`
      })

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
      const response = await fetch('/api/manager/cards/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unassign',
          card_ids: [card.id]
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'Карта отозвана',
        description: `Карта ${card.card_number_mask} отозвана у Junior'а`
      })

      await loadCards()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка отзыва карты',
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
      // Статистика для назначенных карт
      const assignedCards = cards.filter(c => !!c.assigned_to)
      
      return {
        totalCards: assignedCards.length,
        availableCards: assignedCards.filter(c => c.status === 'active').length,
        assignedCards: assignedCards.length,
        blockedCards: assignedCards.filter(c => c.status === 'blocked').length
      }
    } else {
      // Статистика для свободных карт
      let filteredCards = cards

      // Если выбрано казино, фильтруем по BIN кодам
      if (selectedCasinoFilter) {
        const selectedCasino = casinos.find(c => c.id === selectedCasinoFilter)
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
          return c.status === 'active' && !c.assigned_to && (c.bank_account?.balance || 0) >= 10
        }).length,
        assignedCards: filteredCards.filter(c => !!c.assigned_to).length,
        blockedCards: filteredCards.filter(c => c.status === 'blocked').length
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
          disabled={activeTab === 'free' ? (card.status !== 'active' || !!card.assigned_to) : false}
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
        const selectedCasino = casinos.find(c => c.id === selectedCasinoFilter)
        const binMatches = selectedCasino?.allowed_bins?.includes(cardBin)
        
        return (
          <div>
            <div className="font-mono font-medium text-gray-900">{card.card_number_mask}</div>
            <div className="text-sm text-gray-500">
              BIN: <span className={binMatches && selectedCasinoFilter ? 'text-success-600 font-medium' : ''}>{cardBin}</span>
              {binMatches && selectedCasinoFilter && <span className="text-success-600 ml-1">✅</span>}
              {selectedCasinoFilter && !binMatches && selectedCasino?.allowed_bins && selectedCasino.allowed_bins.length > 0 && <span className="text-danger-600 ml-1">❌</span>}
              <span className="ml-2">• {card.card_type === 'gold' ? '🟡 Gold' : card.card_type === 'platinum' ? '⚪ Platinum' : card.card_type === 'black' ? '⚫ Black' : '⚫ Grey'}</span>
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
          <div className={`font-medium ${(card.bank_account?.balance || 0) >= 10 ? 'text-success-600' : 'text-danger-600'}`}>
            {getCurrencySymbol(card.bank_account?.currency || 'USD')}{(card.bank_account?.balance || 0).toFixed(2)}
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
      key: 'assigned_user',
      label: 'Назначение',
      render: (card) => {
        if (card.assigned_user) {
          return (
            <div>
              <div className="font-medium text-primary-600">
                {card.assigned_user.first_name} {card.assigned_user.last_name}
              </div>
              <div className="text-xs text-gray-500">👤 {card.assigned_user.email}</div>
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
      render: (card) => {
        const expDate = new Date(card.exp_year, card.exp_month - 1)
        const isExpiring = expDate.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000 // 30 дней
        return (
          <span className={`text-sm ${isExpiring ? 'text-warning-600 font-medium' : 'text-gray-600'}`}>
            {card.exp_month.toString().padStart(2, '0')}/{card.exp_year}
            {isExpiring && <div className="text-xs text-warning-600">⚠️ Скоро истекает</div>}
          </span>
        )
      }
    }
  ]

  const actions: ActionButton<Card>[] = [
    {
      label: 'Отозвать',
      action: (card: Card) => handleUnassignCard(card),
      variant: 'warning',
      condition: (card: Card) => !!card.assigned_to
    },
    {
      label: 'Детали',
      action: (card: Card) => {
        setSelectedCard(card)
        setShowDetailsModal(true)
      },
      variant: 'secondary',
      condition: () => true
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Управление картами</h1>
        <p className="text-gray-600">Назначение карт Junior'ам для работы с казино</p>
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
            👤 Назначенные карты
          </button>
        </nav>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title={activeTab === 'assigned' ? "Назначенных карт" : (selectedCasinoFilter ? "Карт с подходящим BIN" : "Всего карт")}
          value={dynamicStats.totalCards}
          icon={<CreditCardIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title={activeTab === 'assigned' ? "Активных карт" : "Доступно для назначения"}
          value={dynamicStats.availableCards}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="success"
        />
        <KPICard
          title="Назначено Junior'ам"
          value={dynamicStats.assignedCards}
          icon={<UsersIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Заблокированных"
          value={dynamicStats.blockedCards}
          icon={<XCircleIcon className="h-6 w-6" />}
          color="danger"
        />
      </div>

      {/* Фильтры - только для свободных карт */}
      {activeTab === 'free' && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Выберите Junior'а и казино для назначения карт</h3>
          </div>
          <div className="p-4 space-y-4">
            {/* Выбор Junior'а */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Junior для назначения:</label>
              <input
                type="text"
                placeholder={selectedJuniorFilter ? 
                  juniors.find(j => j.id === selectedJuniorFilter)?.first_name + ' ' + juniors.find(j => j.id === selectedJuniorFilter)?.last_name || "Найти Junior'а..." :
                  "Найти Junior'а по имени или email..."
                }
                value={juniorSearchTerm}
                onChange={(e) => setJuniorSearchTerm(e.target.value)}
                className="form-input pr-10"
              />
              {juniorSearchTerm && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md mt-1 max-h-48 overflow-y-auto z-10 shadow-lg">
                  {juniors
                    .filter(junior => 
                      junior.first_name.toLowerCase().includes(juniorSearchTerm.toLowerCase()) ||
                      junior.last_name.toLowerCase().includes(juniorSearchTerm.toLowerCase()) ||
                      junior.email.toLowerCase().includes(juniorSearchTerm.toLowerCase())
                    )
                    .map(junior => (
                      <button
                        key={junior.id}
                        onClick={() => {
                          setSelectedJuniorFilter(junior.id)
                          setJuniorSearchTerm('')
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">
                              👤 {junior.first_name} {junior.last_name}
                            </div>
                            <div className="text-sm text-gray-500">📧 {junior.email}</div>
                            {junior.stats && (
                              <div className="text-xs text-gray-400">
                                Карт: {junior.stats.assigned_cards} | Успешность: {junior.stats.success_rate}%
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  {juniors.filter(junior => 
                    junior.first_name.toLowerCase().includes(juniorSearchTerm.toLowerCase()) ||
                    junior.last_name.toLowerCase().includes(juniorSearchTerm.toLowerCase()) ||
                    junior.email.toLowerCase().includes(juniorSearchTerm.toLowerCase())
                  ).length === 0 && (
                    <div className="px-4 py-2 text-gray-500 text-sm">Junior'ы не найдены</div>
                  )}
                </div>
              )}
            </div>

            {/* Выбор казино (опционально) */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Казино (опционально, для BIN-фильтрации):</label>
              <input
                type="text"
                placeholder={selectedCasinoFilter ? 
                  casinos.find(c => c.id === selectedCasinoFilter)?.name || "Найти казино..." :
                  "Найти казино по названию или компании..."
                }
                value={casinoSearchTerm}
                onChange={(e) => setCasinoSearchTerm(e.target.value)}
                className="form-input pr-10"
              />
              {casinoSearchTerm && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md mt-1 max-h-48 overflow-y-auto z-10 shadow-lg">
                  {casinos
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
                              {casino.status === 'approved' ? '✅' : '🧪'} {casino.name}
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
                </div>
              )}
            </div>

            {/* Кнопки действий */}
            {(selectedJuniorFilter || selectedCasinoFilter) && (
              <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg">
                <div className="text-sm text-primary-800">
                  {selectedJuniorFilter && (
                    <div>👤 Junior: <strong>{juniors.find(j => j.id === selectedJuniorFilter)?.first_name} {juniors.find(j => j.id === selectedJuniorFilter)?.last_name}</strong></div>
                  )}
                  {selectedCasinoFilter && (
                    <div>🎰 Казино: <strong>{casinos.find(c => c.id === selectedCasinoFilter)?.name}</strong></div>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={selectAllCards}
                    className="btn-info text-xs"
                    disabled={!selectedJuniorFilter}
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
                  <button
                    onClick={handleMassAssignCards}
                    className="btn-primary text-xs"
                    disabled={selectedCards.size === 0 || assigning || !selectedJuniorFilter}
                  >
                    {assigning ? 'Назначение...' : `Назначить ${selectedCards.size} карт`}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedJuniorFilter('')
                      setSelectedCasinoFilter('')
                      setJuniorSearchTerm('')
                      setCasinoSearchTerm('')
                    }}
                    className="btn-secondary text-xs"
                  >
                    ✕ Сбросить фильтры
                  </button>
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
              {activeTab === 'free' ? 'Свободные карты' : 'Назначенные карты'} 
              ({cards.filter(card => {
                if (activeTab === 'free') {
                  return card.status === 'active' && !card.assigned_to
                } else {
                  return !!card.assigned_to
                }
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
            if (activeTab === 'free') {
              let baseFilter = card.status === 'active' && !card.assigned_to
              
              // Дополнительная фильтрация по BIN кодам если выбрано казино
              if (selectedCasinoFilter && baseFilter) {
                const selectedCasino = casinos.find(c => c.id === selectedCasinoFilter)
                if (selectedCasino?.allowed_bins && selectedCasino.allowed_bins.length > 0) {
                  const cardBin = card.card_bin.substring(0, 6)
                  return selectedCasino.allowed_bins.includes(cardBin)
                }
              }
              
              return baseFilter
            } else {
              return !!card.assigned_to
            }
          })}
          columns={columns}
          actions={actions}
          loading={loading}
          pagination={{ pageSize: 20 }}
          filtering={true}
          exportable={true}
          emptyMessage={activeTab === 'free' ? "Нет доступных карт для назначения" : "Нет назначенных карт"}
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
                  <div className="font-mono text-lg text-gray-900">{selectedCard.card_number_mask}</div>
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
                  <span className="font-medium text-gray-700">Тип карты:</span>
                  <div className="text-gray-900">
                    {selectedCard.card_type === 'gold' ? '🟡 Gold' : selectedCard.card_type === 'platinum' ? '⚪ Platinum' : selectedCard.card_type === 'black' ? '⚫ Black' : '⚫ Grey'}
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
                  <div className={`font-semibold ${(selectedCard.bank_account?.balance || 0) >= 10 ? 'text-green-600' : 'text-red-600'}`}>
                    {getCurrencySymbol(selectedCard.bank_account?.currency || 'USD')}{(selectedCard.bank_account?.balance || 0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-blue-700">Статус:</span>
                  <div><StatusBadge status={selectedCard.status} size="sm" /></div>
                </div>
              </div>
            </div>

            {/* Назначение */}
            {selectedCard.assigned_user && (
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-3">👤 Назначение</h4>
                <div className="flex justify-between items-center p-2 bg-white rounded border">
                  <div>
                    <div className="font-medium text-gray-900">
                      {selectedCard.assigned_user.first_name} {selectedCard.assigned_user.last_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      📧 {selectedCard.assigned_user.email} • 👤 {selectedCard.assigned_user.role}
                    </div>
                  </div>
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
                  disabled={!selectedJuniorFilter}
                >
                  {selectedJuniorFilter ? 'Выбрать для назначения' : 'Сначала выберите Junior\'а'}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Информация */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
        <h3 className="font-medium text-primary-900 mb-3">🃏 Управление картами для Junior'ов</h3>
        <div className="text-sm text-primary-800 space-y-2">
          <div>• <strong>Назначайте карты</strong> Junior'ам для работы с конкретными казино</div>
          <div>• <strong>Проверяйте BIN коды</strong> - карты должны подходить для выбранного казино</div>
          <div>• <strong>Следите за балансами</strong> - карты с низким балансом могут не подойти для работы</div>
          <div>• <strong>Отзывайте карты</strong> при необходимости или после завершения работы</div>
        </div>
      </div>
    </div>
  )
}