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
  UsersIcon,
  CogIcon
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

interface CardAssignment {
  id: string
  card: Card
  casino_assignment: {
    assignment_id: string
    casino_id: string
    casino_name: string
    casino_company?: string
    casino_currency?: string
    assignment_type: string
    status: string
    deposit_amount?: number
    has_deposit: boolean
  } | null
  casino: {
    id: string
    name: string
    company: string
    currency: string
  } | null
  assigned_user?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  assigned_at?: string
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
  
  // Фильтры для назначенных карт
  const [assignedUserFilter, setAssignedUserFilter] = useState('')
  const [assignedBankFilter, setAssignedBankFilter] = useState('')
  const [assignedCasinoFilter, setAssignedCasinoFilter] = useState('')

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
          assigned_to: cardsData[0].assigned_to,
          assigned_casino_id: cardsData[0].assigned_casino_id,
          casino_assignments: cardsData[0].casino_assignments
        } : null
      })
      
      // Отладочная информация для карт с 1234
      const debugCards = (cardsData || []).filter((card: any) => card.card_number_mask.includes('1234'))
      if (debugCards.length > 0) {
        console.log('🔍 Карты с 1234 в loadCards:', debugCards.map((card: any) => ({
          mask: card.card_number_mask,
          status: card.status,
          assigned_to: card.assigned_to,
          assigned_casino_id: card.assigned_casino_id,
          casino_assignments: card.casino_assignments,
          balance: card.bank_account?.balance
        })))
      }
      
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
      
      console.log('🔍 Вся команда:', {
        totalTeam: teamData?.length || 0,
        allUsers: teamData?.map((user: any) => ({
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          role: user.role,
          status: user.status
        })) || []
      })
      
      // Временно показываем всех пользователей для отладки
      const juniorsData = teamData.filter((user: any) => user.role === 'junior')
      const allUsersForDebug = teamData || []
      
      console.log('🔍 Загружены Junior\'ы:', {
        totalTeam: teamData?.length || 0,
        juniors: juniorsData?.length || 0,
        firstJunior: juniorsData?.[0] ? {
          id: juniorsData[0].id,
          name: `${juniorsData[0].first_name} ${juniorsData[0].last_name}`,
          email: juniorsData[0].email
        } : null
      })
      
      // Если нет Junior'ов, временно показываем всех пользователей для отладки
      if (juniorsData.length === 0 && allUsersForDebug.length > 0) {
        console.log('⚠️ Junior\'ы не найдены, показываем всех пользователей для отладки')
        setJuniors(allUsersForDebug)
      } else {
        setJuniors(juniorsData || [])
      }

    } catch (error: any) {
      console.error('Ошибка загрузки Junior\'ов:', error)
      addToast({
        type: 'error',
        title: 'Ошибка загрузки команды',
        description: error.message
      })
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
      if (activeTab === 'free') {
        // Базовая фильтрация для свободных карт
        let baseFilter = card.status === 'active' && (card.bank_account?.balance || 0) >= 10
        
        if (!baseFilter) return false
        
        // Дополнительная фильтрация если выбрано казино
        if (selectedCasinoFilter) {
          const selectedCasino = casinos.find(c => c.id === selectedCasinoFilter)
          
          // Проверяем BIN коды
          if (selectedCasino?.allowed_bins && selectedCasino.allowed_bins.length > 0) {
            const cardBin = card.card_bin.substring(0, 6)
            if (!selectedCasino.allowed_bins.includes(cardBin)) {
              return false
            }
          }
          
          // Проверяем, не назначена ли карта уже на это конкретное казино
          if (isCardAssignedToCasino(card, selectedCasinoFilter)) {
            return false
          }
        }
        
        return true
      } else {
        // Назначенные карты
        return !!card.assigned_to
      }
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

  async function handleMassUnassignCards() {
    if (selectedCards.size === 0) {
      addToast({ type: 'error', title: 'Выберите карты для отзывания' })
      return
    }

    const selectedCardsList = Array.from(selectedCards)
    const assignedCards = cards.filter(card => 
      selectedCardsList.includes(card.id) && card.assigned_to
    )

    if (assignedCards.length === 0) {
      addToast({ type: 'error', title: 'Среди выбранных карт нет назначенных' })
      return
    }

    setAssigning(true)

    try {
      const response = await fetch('/api/manager/cards/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_ids: assignedCards.map(card => card.id),
          action: 'unassign'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'Карты отозваны',
        description: `${assignedCards.length} карт отозвано`
      })

      setSelectedCards(new Set())
      await loadCards()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка отзывания карт',
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

  // Проверяем, назначена ли карта уже на это казино ЛЮБЫМ пользователем
  function isCardAssignedToCasino(card: Card, casinoId: string): boolean {
    // Проверяем только новую систему назначений (casino_assignments)
    if (card.casino_assignments && card.casino_assignments.length > 0) {
      return card.casino_assignments.some(assignment =>
        assignment.casino_id === casinoId && assignment.status === 'active'
      )
    }

    return false
  }

  // Проверяем, назначена ли карта уже на это казино ЭТИМ ЖЕ пользователем
  function isCardAssignedToCasinoByUser(card: Card, casinoId: string, userId?: string): boolean {
    // Если карта не назначена никому, то она доступна
    if (!card.assigned_to) return false
    
    // Если карта назначена другому пользователю, то недоступна
    if (userId && card.assigned_to !== userId) return false
    
    // Проверяем только новую систему назначений (casino_assignments)
    if (card.casino_assignments && card.casino_assignments.length > 0) {
      return card.casino_assignments.some(assignment =>
        assignment.casino_id === casinoId && assignment.status === 'active'
      )
    }

    return false
  }

  // Функция для создания отдельных записей назначений карт
  function expandCardAssignments(cards: Card[]): CardAssignment[] {
    const assignments: CardAssignment[] = []
    
    cards.forEach(card => {
      if (!card.assigned_to) return
      
      // Если есть назначения на казино через новую систему
      if (card.casino_assignments && card.casino_assignments.length > 0) {
        card.casino_assignments.forEach(casinoAssignment => {
          if (casinoAssignment.status === 'active') {
            assignments.push({
              id: `${card.id}-${casinoAssignment.casino_id}`,
              card,
              casino_assignment: casinoAssignment,
              casino: {
                id: casinoAssignment.casino_id,
                name: casinoAssignment.casino_name,
                company: casinoAssignment.casino_company || '',
                currency: casinoAssignment.casino_currency || 'USD'
              },
              assigned_user: card.assigned_user,
              assigned_at: card.created_at
            })
          }
        })
      } else {
        // Если только общее назначение без конкретного казино
        assignments.push({
          id: card.id,
          card,
          casino_assignment: null,
          casino: null,
          assigned_user: card.assigned_user,
          assigned_at: card.created_at
        })
      }
    })
    
    return assignments
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
      // Детальная статистика для свободных карт
      const allActiveCards = cards.filter(c => c.status === 'active')
      const selectedCasino = casinos.find(c => c.id === selectedCasinoFilter)
      
      // 1. Карты с подходящим BIN (если выбрано казино)
      let cardsWithMatchingBin = allActiveCards
      if (selectedCasino?.allowed_bins && selectedCasino.allowed_bins.length > 0) {
        cardsWithMatchingBin = allActiveCards.filter(card => {
          const cardBin = card.card_bin.substring(0, 6)
          return selectedCasino.allowed_bins.includes(cardBin)
        })
      }
      
      // 2. Доступно для назначения (достаточный баланс + не назначены на это конкретное казино)
      const availableForAssignment = cardsWithMatchingBin.filter(card => {
        // Должен быть достаточный баланс
        if ((card.bank_account?.balance || 0) < 10) return false
        
        // Не должна быть назначена на выбранное казино ЛЮБЫМ пользователем
        if (selectedCasinoFilter && isCardAssignedToCasino(card, selectedCasinoFilter)) {
          return false
        }
        
        return true
      })
      
      // 3. Назначено Junior'ам (карты назначенные пользователям с ролью junior)
      const assignedToJuniors = allActiveCards.filter(card => {
        return card.assigned_to && card.assigned_user?.role === 'junior'
      })
      
      // 4. В работе (карты с активными тестами/назначениями на казино)
      const inWork = allActiveCards.filter(card => {
        // Проверяем активные назначения на казино
        if (card.casino_assignments && card.casino_assignments.length > 0) {
          return card.casino_assignments.some(assignment => assignment.status === 'active')
        }
        
        // Проверяем старую систему
        if (card.assigned_casino_id) {
          return true
        }
        
        return false
      })
      
      // 5. Отработанные (карты с завершенными тестами)
      const completed = allActiveCards.filter(card => {
        // Проверяем завершенные назначения на казино
        if (card.casino_assignments && card.casino_assignments.length > 0) {
          return card.casino_assignments.some(assignment => 
            assignment.status === 'completed' || assignment.has_deposit
          )
        }
        
        return false
      })

      return {
        totalCards: selectedCasinoFilter ? cardsWithMatchingBin.length : allActiveCards.length,
        cardsWithMatchingBin: cardsWithMatchingBin.length,
        availableForAssignment: availableForAssignment.length,
        assignedToJuniors: assignedToJuniors.length,
        inWork: inWork.length,
        completed: completed.length,
        blockedCards: cards.filter(c => c.status === 'blocked').length
      }
    }
  }

  const dynamicStats = calculateStats()

  // Получаем уникальные значения для фильтров
  const getUniqueAssignedUsers = () => {
    const assignedCards = cards.filter(c => !!c.assigned_user)
    const uniqueUsers = new Map()
    
    assignedCards.forEach(card => {
      if (card.assigned_user && !uniqueUsers.has(card.assigned_user.id)) {
        uniqueUsers.set(card.assigned_user.id, card.assigned_user)
      }
    })
    
    return Array.from(uniqueUsers.values())
  }

  const getUniqueBanks = () => {
    const uniqueBanks = new Map()
    
    cards.forEach(card => {
      if (card.bank_account?.bank) {
        const bank = card.bank_account.bank as any // Приводим к any для доступа к id
        if (bank.id && !uniqueBanks.has(bank.id)) {
          uniqueBanks.set(bank.id, bank)
        }
      }
    })
    
    return Array.from(uniqueBanks.values())
  }

  const getUniqueAssignedCasinos = () => {
    const uniqueCasinos = new Map()
    
    cards.forEach(card => {
      // Проверяем новую систему назначений
      if (card.casino_assignments && card.casino_assignments.length > 0) {
        card.casino_assignments.forEach(assignment => {
          if (!uniqueCasinos.has(assignment.casino_id)) {
            uniqueCasinos.set(assignment.casino_id, {
              id: assignment.casino_id,
              name: assignment.casino_name,
              company: assignment.casino_company
            })
          }
        })
      }
      
      // Проверяем старую систему
      if (card.assigned_casino_id) {
        const casino = casinos.find(c => c.id === card.assigned_casino_id)
        if (casino && !uniqueCasinos.has(casino.id)) {
          uniqueCasinos.set(casino.id, casino)
        }
      }
    })
    
    return Array.from(uniqueCasinos.values())
  }

  // Функция отзыва карты для конкретного казино
  async function handleUnassignFromCasino(cardId: string, casinoId: string) {
    try {
      const response = await fetch('/api/manager/cards/unassign-from-casino', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_id: cardId, casino_id: casinoId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка отзыва карты')
      }

      const result = await response.json()
      addToast({
        type: 'success',
        title: 'Карта отозвана',
        description: result.message
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
          disabled={activeTab === 'free' ? (
            card.status !== 'active' || 
            (card.bank_account?.balance || 0) < 10 ||
            (selectedCasinoFilter ? isCardAssignedToCasino(card, selectedCasinoFilter) : false)
          ) : false}
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
        const isAssignedToCasino = selectedCasinoFilter ? isCardAssignedToCasino(card, selectedCasinoFilter) : false
        
        return (
        <div>
            <div className="font-mono font-medium text-gray-900">{card.card_number_mask}</div>
          <div className="text-sm text-gray-500">
              BIN: <span className={binMatches && selectedCasinoFilter ? 'text-success-600 font-medium' : ''}>{cardBin}</span>
              {binMatches && selectedCasinoFilter && !isAssignedToCasino && <span className="text-success-600 ml-1">✅</span>}
              {selectedCasinoFilter && !binMatches && selectedCasino?.allowed_bins && selectedCasino.allowed_bins.length > 0 && <span className="text-danger-600 ml-1">❌ BIN</span>}
              {isAssignedToCasino && <span className="text-warning-600 ml-1">🔒 Занята</span>}
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
          // Находим казино для этой карты
          let assignedCasino = null
          
          // Проверяем новую систему назначений
          if (card.casino_assignments && card.casino_assignments.length > 0) {
            assignedCasino = card.casino_assignments[0] // Берем первое назначение
          }
          
          // Проверяем старую систему
          if (!assignedCasino && card.assigned_casino_id) {
            const casino = casinos.find(c => c.id === card.assigned_casino_id)
            if (casino) {
              assignedCasino = {
                casino_name: casino.name,
                casino_company: casino.company
              }
            }
          }
          
          return (
            <div>
              <div className="font-medium text-primary-600">
                👤 {card.assigned_user.first_name} {card.assigned_user.last_name}
              </div>
              <div className="text-xs text-gray-500">{card.assigned_user.email}</div>
              {assignedCasino && (
                <div className="text-xs text-blue-600 mt-1">
                  🎰 {assignedCasino.casino_name}
                  {assignedCasino.casino_company && (
                    <span className="text-gray-400"> • {assignedCasino.casino_company}</span>
                  )}
                </div>
              )}
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

  // Колонки для назначенных карт (отдельные записи для каждого казино)
  const assignedColumns: Column<CardAssignment>[] = [
    {
      key: 'card_number_mask',
      label: 'Номер карты',
      render: (assignment) => (
        <div className="flex items-center space-x-2">
          <span className="font-mono text-sm">{assignment.card.card_number_mask}</span>
          <span className="text-xs text-gray-500">BIN: {assignment.card.card_bin}</span>
        </div>
      )
    },
    {
      key: 'casino',
      label: 'Казино',
      render: (assignment) => (
        <div>
          {assignment.casino ? (
            <div>
              <div className="font-medium">{assignment.casino.name}</div>
              {assignment.casino.company && (
                <div className="text-xs text-gray-500">{assignment.casino.company}</div>
              )}
            </div>
          ) : (
            <span className="text-gray-400">Не указано</span>
          )}
        </div>
      )
    },
    {
      key: 'assigned_user',
      label: 'Назначено',
      render: (assignment) => (
        <div>
          {assignment.assigned_user ? (
            <div>
              <div className="font-medium">
                {assignment.assigned_user.first_name} {assignment.assigned_user.last_name}
              </div>
              <div className="text-xs text-gray-500">{assignment.assigned_user.email}</div>
            </div>
          ) : (
            <span className="text-gray-400">Не назначено</span>
          )}
        </div>
      )
    },
    {
      key: 'bank',
      label: 'Банк',
      render: (assignment) => (
        <div>
          <div className="font-medium">{assignment.card.bank_account?.bank?.name}</div>
          <div className="text-xs text-gray-500">{assignment.card.bank_account?.holder_name}</div>
        </div>
      )
    },
    {
      key: 'balance',
      label: 'Баланс',
      align: 'right',
      render: (assignment) => (
        <div className="text-right">
          <div className="font-medium text-green-600">
            {getCurrencySymbol(assignment.card.bank_account?.currency || 'USD')}
            {(assignment.card.bank_account?.balance || 0).toFixed(2)}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Статус',
      align: 'center',
      render: (assignment) => (
        <StatusBadge 
          status={assignment.casino_assignment?.status || 'active'} 
        />
      )
    },
    {
      key: 'actions',
      label: 'Действия',
      align: 'center',
      render: (assignment) => (
        <div className="flex space-x-2">
          {assignment.casino && (
            <button
              onClick={() => handleUnassignFromCasino(assignment.card.id, assignment.casino!.id)}
              className="btn-secondary text-xs"
              title="Отозвать с этого казино"
            >
              🚫 Отозвать
            </button>
          )}
          <button
            onClick={() => {
              setSelectedCard(assignment.card)
              setShowDetailsModal(true)
            }}
            className="btn-secondary text-xs"
          >
            👁️ Детали
          </button>
        </div>
      )
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
              // Очищаем фильтры для назначенных карт
              setAssignedUserFilter('')
              setAssignedBankFilter('')
              setAssignedCasinoFilter('')
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
              // Очищаем фильтры для свободных карт
              setSelectedJuniorFilter('')
              setSelectedCasinoFilter('')
              setJuniorSearchTerm('')
              setCasinoSearchTerm('')
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
      {activeTab === 'free' ? (
        // Детальная статистика для свободных карт
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KPICard
            title={selectedCasinoFilter ? 'Карты с подходящим BIN' : 'Всего активных карт'}
            value={dynamicStats.cardsWithMatchingBin || dynamicStats.totalCards || 0}
          icon={<CreditCardIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
            title="Доступно для назначения"
            value={dynamicStats.availableForAssignment || 0}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="success"
        />
        <KPICard
            title="Назначено Junior'ам"
            value={dynamicStats.assignedToJuniors || 0}
            icon={<UsersIcon className="h-6 w-6" />}
          color="warning"
        />
        <KPICard
            title="В работе"
            value={dynamicStats.inWork || 0}
            icon={<CogIcon className="h-6 w-6" />}
            color="primary"
          />
          <KPICard
            title="Отработанные"
            value={dynamicStats.completed || 0}
            icon={<CheckCircleIcon className="h-6 w-6" />}
            color="gray"
          />
        </div>
      ) : (
        // Стандартная статистика для назначенных карт
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KPICard
            title="Назначенных карт"
            value={dynamicStats.totalCards || 0}
            icon={<CreditCardIcon className="h-6 w-6" />}
            color="primary"
          />
          <KPICard
            title="Активных карт"
            value={dynamicStats.availableCards || 0}
            icon={<CheckCircleIcon className="h-6 w-6" />}
            color="success"
          />
          <KPICard
            title="Назначено Junior'ам"
            value={dynamicStats.assignedCards || 0}
            icon={<UsersIcon className="h-6 w-6" />}
            color="primary"
          />
          <KPICard
            title="Заблокированных"
            value={dynamicStats.blockedCards || 0}
          icon={<XCircleIcon className="h-6 w-6" />}
          color="danger"
        />
      </div>
      )}

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
                  {juniors.length === 0 ? (
                    <div className="px-4 py-2 text-gray-500 text-sm">
                      Junior'ы не загружены. Всего в команде: {juniors.length}
                    </div>
                  ) : (
                    juniors
                      .filter(junior => 
                        (junior.first_name || '').toLowerCase().includes(juniorSearchTerm.toLowerCase()) ||
                        (junior.last_name || '').toLowerCase().includes(juniorSearchTerm.toLowerCase()) ||
                        (junior.email || '').toLowerCase().includes(juniorSearchTerm.toLowerCase())
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
                    ))
                  )}
                  {juniors.length > 0 && juniors.filter(junior => 
                    (junior.first_name || '').toLowerCase().includes(juniorSearchTerm.toLowerCase()) ||
                    (junior.last_name || '').toLowerCase().includes(juniorSearchTerm.toLowerCase()) ||
                    (junior.email || '').toLowerCase().includes(juniorSearchTerm.toLowerCase())
                  ).length === 0 && (
                    <div className="px-4 py-2 text-gray-500 text-sm">Junior'ы не найдены по запросу "{juniorSearchTerm}"</div>
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
                    <div>👤 Junior: <strong>
                      {(() => {
                        const selectedJunior = juniors.find(j => j.id === selectedJuniorFilter)
                        return selectedJunior ? 
                          `${selectedJunior.first_name} ${selectedJunior.last_name}` : 
                          `ID: ${selectedJuniorFilter} (не найден)`
                      })()}
                    </strong></div>
                  )}
                  {selectedCasinoFilter && (
                    <div>🎰 Казино: <strong>{casinos.find(c => c.id === selectedCasinoFilter)?.name}</strong></div>
                  )}
                  {juniors.length === 0 && (
                    <div className="text-warning-600">⚠️ Junior'ы не загружены</div>
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

      {/* Фильтры для назначенных карт */}
      {activeTab === 'assigned' && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Фильтры для назначенных карт</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Фильтр по пользователю */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Назначено пользователю:
                </label>
                <select
                  value={assignedUserFilter}
                  onChange={(e) => setAssignedUserFilter(e.target.value)}
                  className="form-select w-full"
                >
                  <option value="">Все пользователи</option>
                  {getUniqueAssignedUsers().map(user => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Фильтр по банку */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Банк:
                </label>
                <select
                  value={assignedBankFilter}
                  onChange={(e) => setAssignedBankFilter(e.target.value)}
                  className="form-select w-full"
                >
                  <option value="">Все банки</option>
                  {getUniqueBanks().map(bank => (
                    <option key={bank.id} value={bank.id}>
                      {bank.name} {bank.country && `(${bank.country})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Фильтр по казино */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Казино:
                </label>
                <select
                  value={assignedCasinoFilter}
                  onChange={(e) => setAssignedCasinoFilter(e.target.value)}
                  className="form-select w-full"
                >
                  <option value="">Все казино</option>
                  {getUniqueAssignedCasinos().map(casino => (
                    <option key={casino.id} value={casino.id}>
                      {casino.name} {casino.company && `(${casino.company})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Кнопки действий для фильтров */}
            <div className="flex items-center justify-between mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-700">
                {(assignedUserFilter || assignedBankFilter || assignedCasinoFilter) ? (
                  <div>
                    Применены фильтры:
                    {assignedUserFilter && (
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        👤 {getUniqueAssignedUsers().find(u => u.id === assignedUserFilter)?.first_name}
                      </span>
                    )}
                    {assignedBankFilter && (
                      <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                        🏦 {getUniqueBanks().find(b => b.id === assignedBankFilter)?.name}
                      </span>
                    )}
                    {assignedCasinoFilter && (
                      <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                        🎰 {getUniqueAssignedCasinos().find(c => c.id === assignedCasinoFilter)?.name}
                      </span>
                    )}
                  </div>
                ) : (
                  <span>Фильтры не применены</span>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    // Выбираем все карты с учетом фильтров
                    const filteredCards = cards.filter(card => {
                      let baseFilter = !!card.assigned_to
                      
                      if (!baseFilter) return false
                      
                      // Применяем те же фильтры что и в таблице
                      if (assignedUserFilter && card.assigned_user?.id !== assignedUserFilter) {
                        return false
                      }
                      
                      if (assignedBankFilter && (card.bank_account?.bank as any)?.id !== assignedBankFilter) {
                        return false
                      }
                      
                      if (assignedCasinoFilter) {
                        let hasMatchingCasino = false
                        
                        if (card.casino_assignments && card.casino_assignments.length > 0) {
                          hasMatchingCasino = card.casino_assignments.some(assignment => 
                            assignment.casino_id === assignedCasinoFilter
                          )
                        }
                        
                        if (!hasMatchingCasino && card.assigned_casino_id === assignedCasinoFilter) {
                          hasMatchingCasino = true
                        }
                        
                        if (!hasMatchingCasino) {
                          return false
                        }
                      }
                      
                      return true
                    })
                    
                    setSelectedCards(new Set(filteredCards.map(card => card.id)))
                  }}
                  className="btn-info text-xs"
                  disabled={cards.filter(c => !!c.assigned_to).length === 0}
                >
                  ☑️ Выбрать все по фильтру
                </button>
                <button
                  onClick={clearSelection}
                  className="btn-secondary text-xs"
                  disabled={selectedCards.size === 0}
                >
                  Очистить выбор
                </button>
                <button
                  onClick={handleMassUnassignCards}
                  className="btn-danger text-xs"
                  disabled={selectedCards.size === 0}
                >
                  🔄 Отозвать выбранные ({selectedCards.size})
                </button>
                <button
                  onClick={() => {
                    setAssignedUserFilter('')
                    setAssignedBankFilter('')
                    setAssignedCasinoFilter('')
                  }}
                  className="btn-secondary text-xs"
                >
                  ✕ Сбросить фильтры
                </button>
              </div>
            </div>
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
                  // Базовая фильтрация для свободных карт
                  let baseFilter = card.status === 'active' && (card.bank_account?.balance || 0) >= 10
                  
                  if (!baseFilter) return false
                  
                  // Дополнительная фильтрация если выбрано казино
                  if (selectedCasinoFilter) {
                    const selectedCasino = casinos.find(c => c.id === selectedCasinoFilter)
                    
                    // Проверяем BIN коды
                    if (selectedCasino?.allowed_bins && selectedCasino.allowed_bins.length > 0) {
                      const cardBin = card.card_bin.substring(0, 6)
                      if (!selectedCasino.allowed_bins.includes(cardBin)) {
                        return false
                      }
                    }
                    
                    // Проверяем, не назначена ли карта уже на это конкретное казино
                    if (isCardAssignedToCasino(card, selectedCasinoFilter)) {
                      return false
                    }
                  }
                  
                  return true
                } else {
                  // Фильтрация для назначенных карт с учетом фильтров
                  let baseFilter = !!card.assigned_to
                  
                  if (!baseFilter) return false
                  
                  // Фильтр по пользователю
                  if (assignedUserFilter && card.assigned_user?.id !== assignedUserFilter) {
                    return false
                  }
                  
                  // Фильтр по банку
                  if (assignedBankFilter && (card.bank_account?.bank as any)?.id !== assignedBankFilter) {
                    return false
                  }
                  
                  // Фильтр по казино
                  if (assignedCasinoFilter) {
                    let hasMatchingCasino = false
                    
                    // Проверяем новую систему назначений
                    if (card.casino_assignments && card.casino_assignments.length > 0) {
                      hasMatchingCasino = card.casino_assignments.some(assignment => 
                        assignment.casino_id === assignedCasinoFilter
                      )
                    }
                    
                    // Проверяем старую систему
                    if (!hasMatchingCasino && card.assigned_casino_id === assignedCasinoFilter) {
                      hasMatchingCasino = true
                    }
                    
                    if (!hasMatchingCasino) {
                      return false
                    }
                  }
                  
                  return true
                }
              }).length}) 
              {selectedCards.size > 0 && `• Выбрано: ${selectedCards.size}`}
          </h3>
            <div className="flex items-center space-x-2">
              {/* Кнопка очистки уже есть в фильтрах выше, убираем дублирование */}
            </div>
          </div>
        </div>
        
        {activeTab === 'free' ? (
        <DataTable
            data={cards.filter(card => {
              // Базовая фильтрация для свободных карт
              let baseFilter = card.status === 'active' && (card.bank_account?.balance || 0) >= 10
              
              // Отладочная информация
              if (card.card_number_mask.includes('1234')) {
                console.log('🔍 Отладка карты', card.card_number_mask, {
                  status: card.status,
                  balance: card.bank_account?.balance,
                  assigned_to: card.assigned_to,
                  assigned_casino_id: card.assigned_casino_id,
                  casino_assignments: card.casino_assignments,
                  selectedCasinoFilter,
                  baseFilter,
                  isAssignedToCasino: selectedCasinoFilter ? isCardAssignedToCasino(card, selectedCasinoFilter) : false
                })
              }
              
              if (!baseFilter) return false
              
              // Дополнительная фильтрация если выбрано казино
              if (selectedCasinoFilter) {
                const selectedCasino = casinos.find(c => c.id === selectedCasinoFilter)
                
                // Проверяем BIN коды
                if (selectedCasino?.allowed_bins && selectedCasino.allowed_bins.length > 0) {
                  const cardBin = card.card_bin.substring(0, 6)
                  if (!selectedCasino.allowed_bins.includes(cardBin)) {
                    return false
                  }
                }
                
                // Проверяем, не назначена ли карта уже на это конкретное казино
                if (isCardAssignedToCasino(card, selectedCasinoFilter)) {
                  return false
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
            emptyMessage="Нет доступных карт для назначения"
          />
        ) : (
          <DataTable
            data={expandCardAssignments(cards).filter(assignment => {
              // Фильтр по пользователю
              if (assignedUserFilter && assignment.assigned_user?.id !== assignedUserFilter) {
                return false
              }
              
              // Фильтр по банку
              if (assignedBankFilter && (assignment.card.bank_account?.bank as any)?.id !== assignedBankFilter) {
                return false
              }
              
              // Фильтр по казино
              if (assignedCasinoFilter && assignment.casino?.id !== assignedCasinoFilter) {
                return false
              }
              
              return true
            })}
            columns={assignedColumns}
            actions={[]}
            loading={loading}
            pagination={{ pageSize: 20 }}
            filtering={true}
            exportable={true}
            emptyMessage="Нет назначенных карт"
          />
        )}
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