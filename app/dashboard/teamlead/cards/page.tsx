'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column, ActionButton } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import Modal from '@/components/ui/Modal'
import { 
  CreditCardIcon,
  EyeIcon,
  EyeSlashIcon,
  UserIcon,
  CheckCircleIcon,
  PlusIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface TeamCard {
  id: string
  card_number: string
  expiry_date: string
  cvv: string
  cardholder_name: string
  status: string
  casino: {
    name: string
    url: string
  } | null
  user: {
    email: string
    first_name?: string
    last_name?: string
  } | null
  bank: {
    name: string
    country: string
  }
}

interface AvailableCard {
  id: string
  card_number: string
  cardholder_name: string
  bank_id: string
  banks: {
    name: string
    country: string
  }
}

export default function TeamLeadCardsPage() {
  const { addToast } = useToast()
  const [cards, setCards] = useState<TeamCard[]>([])
  const [loading, setLoading] = useState(true)
  const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set())
  
  // Модал назначения карты
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [availableCards, setAvailableCards] = useState<AvailableCard[]>([])
  const [teamJuniors, setTeamJuniors] = useState([])
  const [assignedCasinos, setAssignedCasinos] = useState([])
  const [assigning, setAssigning] = useState(false)
  const [assignForm, setAssignForm] = useState({
    card_id: '',
    junior_id: '',
    casino_id: ''
  })

  // Модал просмотра карты
  const [showCardModal, setShowCardModal] = useState(false)
  const [selectedCard, setSelectedCard] = useState<TeamCard | null>(null)
  const [showCardDetails, setShowCardDetails] = useState(false)

  useEffect(() => {
    loadTeamCards()
  }, [])

  async function loadTeamCards() {
    try {
      setLoading(true)
      const response = await fetch('/api/teamlead/cards')
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки карт команды')
      }

      const data = await response.json()
      setCards(data.cards || [])

    } catch (error: any) {
      console.error('Ошибка загрузки карт команды:', error)
      addToast({
        type: 'error',
        title: 'Ошибка загрузки данных',
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  async function loadAssignModalData() {
    try {
      // Загружаем доступные карты
      const cardsResponse = await fetch('/api/teamlead/available-cards')
      if (cardsResponse.ok) {
        const { cards } = await cardsResponse.json()
        setAvailableCards(cards)
      }

      // Загружаем Junior'ов команды
      const teamResponse = await fetch('/api/teamlead/team')
      if (teamResponse.ok) {
        const { team } = await teamResponse.json()
        setTeamJuniors(team.filter((member: any) => member.role === 'junior'))
      }

      // Загружаем назначенные казино
      const casinosResponse = await fetch('/api/teamlead/assigned-casinos')
      if (casinosResponse.ok) {
        const { casinos } = await casinosResponse.json()
        setAssignedCasinos(casinos)
      }

    } catch (error: any) {
      console.error('Ошибка загрузки данных для назначения:', error)
      addToast({
        type: 'error',
        title: 'Ошибка загрузки данных',
        description: error.message
      })
    }
  }

  async function handleAssignCard() {
    if (!assignForm.card_id || !assignForm.junior_id || !assignForm.casino_id) {
      addToast({
        type: 'error',
        title: 'Заполните все поля',
        description: 'Выберите карту, Junior\'а и казино'
      })
      return
    }

    try {
      setAssigning(true)
      const response = await fetch('/api/teamlead/assign-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignForm)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка назначения карты')
      }

      addToast({
        type: 'success',
        title: 'Карта назначена',
        description: data.message
      })

      setShowAssignModal(false)
      setAssignForm({ card_id: '', junior_id: '', casino_id: '' })
      await loadTeamCards()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка назначения',
        description: error.message
      })
    } finally {
      setAssigning(false)
    }
  }

  function handleViewCard(card: TeamCard) {
    setSelectedCard(card)
    setShowCardModal(true)
  }

  function toggleCardReveal(cardId: string) {
    setRevealedCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(cardId)) {
        newSet.delete(cardId)
      } else {
        newSet.add(cardId)
      }
      return newSet
    })
  }

  function maskCardNumber(cardNumber: string) {
    if (!cardNumber) return 'Не указан'
    return cardNumber.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '$1 **** **** $4')
  }

  const columns: Column<TeamCard>[] = [
    {
      key: 'card_number',
      label: 'Номер карты',
      render: (card) => {
        const isRevealed = revealedCards.has(card.id)
        const displayNumber = isRevealed 
          ? card.card_number 
          : maskCardNumber(card.card_number)
        
        return (
          <div className="flex items-center space-x-2">
            <span className="font-mono text-sm">{displayNumber}</span>
            <button
              onClick={() => toggleCardReveal(card.id)}
              className="text-gray-400 hover:text-gray-600"
            >
              {isRevealed ? (
                <EyeSlashIcon className="h-4 w-4" />
              ) : (
                <EyeIcon className="h-4 w-4" />
              )}
            </button>
          </div>
        )
      }
    },
    {
      key: 'cardholder_name',
      label: 'Держатель',
      render: (card) => (
        <span className="text-sm text-gray-900">{card.cardholder_name}</span>
      )
    },
    {
      key: 'bank',
      label: 'Банк',
      render: (card) => (
        <div>
          <div className="font-medium text-gray-900">{card.bank.name}</div>
          <div className="text-sm text-gray-500">{card.bank.country}</div>
        </div>
      )
    },
    {
      key: 'user',
      label: 'Назначена',
      render: (card) => {
        if (!card.user) {
          return <span className="text-sm text-gray-500">Не назначена</span>
        }
        return (
          <div>
            <div className="font-medium text-gray-900">
              {`${card.user.first_name || ''} ${card.user.last_name || ''}`.trim() || card.user.email}
            </div>
            <div className="text-sm text-gray-500">{card.user.email}</div>
          </div>
        )
      }
    },
    {
      key: 'casino',
      label: 'Казино',
      render: (card) => {
        if (!card.casino) {
          return <span className="text-sm text-gray-500">Не назначено</span>
        }
        return (
          <div>
            <div className="font-medium text-gray-900">{card.casino.name}</div>
            <div className="text-sm text-blue-600">{card.casino.url}</div>
          </div>
        )
      }
    },
    {
      key: 'status',
      label: 'Статус',
      render: (card) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          card.status === 'assigned' 
            ? 'bg-green-100 text-green-800'
            : card.status === 'available'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {card.status === 'assigned' ? 'Назначена' :
           card.status === 'available' ? 'Доступна' : 
           'Заблокирована'}
        </span>
      )
    }
  ]

  const actions: ActionButton<TeamCard>[] = [
    {
      label: 'Просмотр',
      action: handleViewCard,
      variant: 'primary'
    }
  ]

  const assignedCards = cards.filter(card => card.status === 'assigned')
  const availableCards_count = cards.filter(card => card.status === 'available')
  const blockedCards = cards.filter(card => card.status === 'blocked')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Карты команды</h1>
          <p className="text-gray-600">Управление картами вашей команды Junior'ов</p>
        </div>
        <button
          onClick={() => {
            setShowAssignModal(true)
            loadAssignModalData()
          }}
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Назначить карту
        </button>
      </div>

      {/* Информация о картах */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <UserIcon className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Карты вашей команды
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>• Здесь отображаются карты, назначенные Junior'ам вашей команды</p>
              <p>• Карты можете назначать только из банков, которые вам выделили</p>
              <p>• Каждая карта может использоваться только для одного казино</p>
            </div>
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Всего карт"
          value={cards.length}
          icon={<CreditCardIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Назначенных"
          value={assignedCards.length}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="success"
        />
        <KPICard
          title="Доступных"
          value={availableCards_count.length}
          icon={<CreditCardIcon className="h-6 w-6" />}
          color="warning"
        />
        <KPICard
          title="Заблокированных"
          value={blockedCards.length}
          icon={<XCircleIcon className="h-6 w-6" />}
          color="danger"
        />
      </div>

      {/* Таблица карт */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">Карты команды</h3>
        </div>
        
        <DataTable
          data={cards}
          columns={columns}
          actions={actions}
          loading={loading}
          pagination={{ pageSize: 20 }}
          filtering={true}
          exportable={true}
          emptyMessage="Карты команды не найдены"
        />
      </div>

      {/* Modal назначения карты */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Назначить карту Junior'у"
        size="lg"
      >
        <div className="space-y-4">
          {/* Выбор карты */}
          <div>
            <label className="form-label">Доступная карта *</label>
            <select
              value={assignForm.card_id}
              onChange={(e) => setAssignForm({ ...assignForm, card_id: e.target.value })}
              className="form-input"
              required
            >
              <option value="">Выберите карту</option>
              {availableCards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.cardholder_name} - ****{card.card_number.slice(-4)} ({card.banks.name})
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Доступно карт: {availableCards.length}
            </p>
          </div>

          {/* Выбор Junior'а */}
          <div>
            <label className="form-label">Junior из команды *</label>
            <select
              value={assignForm.junior_id}
              onChange={(e) => setAssignForm({ ...assignForm, junior_id: e.target.value })}
              className="form-input"
              required
            >
              <option value="">Выберите Junior'а</option>
              {teamJuniors.map((junior: any) => (
                <option key={junior.id} value={junior.id}>
                  {`${junior.first_name || ''} ${junior.last_name || ''}`.trim() || junior.email}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Junior'ов в команде: {teamJuniors.length}
            </p>
          </div>

          {/* Выбор казино */}
          <div>
            <label className="form-label">Назначенное казино *</label>
            <select
              value={assignForm.casino_id}
              onChange={(e) => setAssignForm({ ...assignForm, casino_id: e.target.value })}
              className="form-input"
              required
            >
              <option value="">Выберите казино</option>
              {assignedCasinos.map((assignment: any) => (
                <option key={assignment.casino.id} value={assignment.casino.id}>
                  {assignment.casino.name}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Назначенных казино: {assignedCasinos.length}
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowAssignModal(false)}
              className="btn-secondary"
              disabled={assigning}
            >
              Отмена
            </button>
            <button
              onClick={handleAssignCard}
              className="btn-primary"
              disabled={assigning || !assignForm.card_id || !assignForm.junior_id || !assignForm.casino_id}
            >
              {assigning ? 'Назначение...' : 'Назначить карту'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal просмотра карты */}
      <Modal
        isOpen={showCardModal}
        onClose={() => {
          setShowCardModal(false)
          setSelectedCard(null)
          setShowCardDetails(false)
        }}
        title="Детали карты"
        size="lg"
      >
        {selectedCard && (
          <div className="space-y-4">
            {/* Основная информация */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Банк</label>
                  <p className="text-sm text-gray-900">{selectedCard.bank.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Статус</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedCard.status === 'assigned' 
                      ? 'bg-green-100 text-green-800'
                      : selectedCard.status === 'available'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedCard.status === 'assigned' ? 'Назначена' :
                     selectedCard.status === 'available' ? 'Доступна' : 
                     'Заблокирована'}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Держатель карты</label>
                  <p className="text-sm text-gray-900">{selectedCard.cardholder_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Страна банка</label>
                  <p className="text-sm text-gray-900">{selectedCard.bank.country}</p>
                </div>
              </div>
            </div>

            {/* Номер карты с возможностью показать/скрыть */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Номер карты</label>
                <button
                  onClick={() => setShowCardDetails(!showCardDetails)}
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
                >
                  {showCardDetails ? (
                    <>
                      <EyeSlashIcon className="h-4 w-4 mr-1" />
                      Скрыть детали
                    </>
                  ) : (
                    <>
                      <EyeIcon className="h-4 w-4 mr-1" />
                      Показать детали
                    </>
                  )}
                </button>
              </div>
              <div className="bg-gray-100 p-3 rounded font-mono text-sm">
                {showCardDetails ? selectedCard.card_number : maskCardNumber(selectedCard.card_number)}
              </div>
            </div>

            {/* Детали карты (если показаны) */}
            {showCardDetails && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Срок действия</label>
                  <p className="text-sm font-mono text-gray-900">{selectedCard.expiry_date}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">CVV</label>
                  <p className="text-sm font-mono text-gray-900">{selectedCard.cvv}</p>
                </div>
              </div>
            )}

            {/* Назначение Junior */}
            {selectedCard.user && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Назначена Junior:</h4>
                <div>
                  <p className="text-blue-700 font-medium">
                    {`${selectedCard.user.first_name || ''} ${selectedCard.user.last_name || ''}`.trim() || selectedCard.user.email}
                  </p>
                  <p className="text-blue-600 text-sm">{selectedCard.user.email}</p>
                </div>
              </div>
            )}

            {/* Назначение казино */}
            {selectedCard.casino && (
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">Назначена казино:</h4>
                <div>
                  <p className="text-green-700 font-medium">{selectedCard.casino.name}</p>
                  <p className="text-green-600 text-sm">{selectedCard.casino.url}</p>
                </div>
              </div>
            )}

            {/* Предупреждение о конфиденциальности */}
            {showCardDetails && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5" />
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-red-800">Конфиденциальная информация</h4>
                    <p className="text-sm text-red-700 mt-1">
                      Данные карты являются строго конфиденциальными. Не передавайте их третьим лицам.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                onClick={() => {
                  setShowCardModal(false)
                  setSelectedCard(null)
                  setShowCardDetails(false)
                }}
                className="btn-secondary"
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