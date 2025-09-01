'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column, ActionButton } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import StatusBadge from '@/components/ui/StatusBadge'
import Modal from '@/components/ui/Modal'
import { 
  CreditCardIcon,
  UserPlusIcon,
  EyeIcon,
  UserMinusIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface Card {
  id: string
  card_number_mask: string
  card_bin: string
  card_type: 'grey' | 'pink'
  exp_month: number
  exp_year: number
  status: string
  assigned_to: string | null
  assigned_user_name: string | null
  assigned_user_lastname: string | null
  bank_balance: number
  account_balance: number
  account_currency: string
  account_holder: string
  bank_name: string
  bank_country: string
  is_available: boolean
  daily_limit: number | null
}

interface CardStats {
  totalCards: number
  availableCards: number
  assignedCards: number
  blockedCards: number
}

export default function ManagerCardsPage() {
  const { addToast } = useToast()

  // Функция для получения символа валюты
  const getCurrencySymbol = (currency: string) => {
    const symbols = {
      'USD': '$',
      'EUR': '€', 
      'GBP': '£',
      'CAD': 'C$'
    }
    return symbols[currency as keyof typeof symbols] || '$'
  }
  const [cards, setCards] = useState<Card[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [stats, setStats] = useState<CardStats>({
    totalCards: 0,
    availableCards: 0,
    assignedCards: 0,
    blockedCards: 0
  })
  const [loading, setLoading] = useState(true)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [assignNotes, setAssignNotes] = useState('')
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      // Загружаем карты
      const cardsResponse = await fetch('/api/cards')
      if (!cardsResponse.ok) {
        throw new Error('Ошибка загрузки карт')
      }
      const { cards: cardsData } = await cardsResponse.json()

      // Загружаем Junior пользователей для назначения
      const usersResponse = await fetch('/api/users')
      if (!usersResponse.ok) {
        throw new Error('Ошибка загрузки пользователей')
      }
      const { users: usersData } = await usersResponse.json()
      const juniors = usersData.filter((u: any) => u.role === 'junior' && u.status === 'active')

      setCards(cardsData)
      setUsers(juniors)

      // Рассчитываем статистику
      const totalCards = cardsData.length
      const availableCards = cardsData.filter((c: Card) => c.is_available && !c.assigned_to).length
      const assignedCards = cardsData.filter((c: Card) => c.assigned_to).length
      const blockedCards = cardsData.filter((c: Card) => !c.is_available).length

      setStats({
        totalCards,
        availableCards,
        assignedCards,
        blockedCards
      })

    } catch (error: any) {
      console.error('Ошибка загрузки данных:', error)
      addToast({
        type: 'error',
        title: 'Ошибка загрузки данных',
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleAssignCard() {
    if (!selectedCard || !selectedUserId) {
      addToast({ type: 'error', title: 'Выберите карту и пользователя' })
      return
    }

    setAssigning(true)

    try {
      const response = await fetch(`/api/cards/${selectedCard.id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: selectedUserId,
          notes: assignNotes
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'Карта назначена',
        description: data.message
      })

      setShowAssignModal(false)
      setSelectedCard(null)
      setSelectedUserId('')
      setAssignNotes('')
      await loadData()

    } catch (error: any) {
      console.error('Ошибка назначения карты:', error)
      addToast({
        type: 'error',
        title: 'Ошибка назначения карты',
        description: error.message
      })
    } finally {
      setAssigning(false)
    }
  }

  async function handleUnassignCard(card: Card) {
    if (!confirm(`Отозвать назначение карты ${card.card_number_mask}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/cards/${card.id}/assign`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'Назначение отозвано',
        description: data.message
      })

      await loadData()

    } catch (error: any) {
      console.error('Ошибка отзыва назначения:', error)
      addToast({
        type: 'error',
        title: 'Ошибка отзыва назначения',
        description: error.message
      })
    }
  }





  const columns: Column<Card>[] = [
    {
      key: 'card_number_mask',
      label: 'Карта',
      sortable: true,
      render: (card) => (
        <div>
          <div className="font-mono font-medium text-gray-900">
            {card.card_number_mask}
          </div>
          <div className="text-sm text-gray-500">
            BIN: {card.card_bin} • {card.card_type === 'pink' ? '🌸 Pink' : '⚫ Grey'}
          </div>
        </div>
      )
    },
    {
      key: 'bank_name',
      label: 'Банк',
      sortable: true,
      render: (card) => (
        <div>
          <div className="font-medium text-gray-900">{card.bank_name}</div>
          <div className="text-sm text-gray-500">
            {card.account_holder} • {card.bank_country}
          </div>
        </div>
      )
    },
    {
      key: 'bank_balance',
      label: 'Баланс',
      sortable: true,
      align: 'right',
      render: (card) => (
        <div className="text-right">
          <div className={`font-mono font-medium ${(card.account_balance || card.bank_balance || 0) >= 10 ? 'text-success-600' : 'text-danger-600'}`}>
            {getCurrencySymbol(card.account_currency || 'USD')}{(card.account_balance || card.bank_balance || 0).toFixed(2)}
          </div>
          <div className="text-xs text-gray-500">
            {(card.account_balance || card.bank_balance || 0) >= 10 && card.status === 'active' ? '✅ Доступна' : '❌ Недоступна'}
          </div>
        </div>
      )
    },
    {
      key: 'assigned_to',
      label: 'Назначена',
      sortable: true,
      render: (card) => {
        if (card.assigned_to) {
          return (
            <div>
              <div className="font-medium text-primary-600">
                {card.assigned_user_name} {card.assigned_user_lastname}
              </div>
              <div className="text-xs text-gray-500">Junior</div>
            </div>
          )
        }
        return <span className="text-gray-500">Не назначена</span>
      }
    },
    {
      key: 'status',
      label: 'Статус',
      sortable: true,
      render: (card) => <StatusBadge status={card.status} />
    },
    {
      key: 'exp_year',
      label: 'Истекает',
      sortable: true,
      render: (card) => (
        <span className="text-sm text-gray-600">
          {String(card.exp_month).padStart(2, '0')}/{card.exp_year}
        </span>
      )
    }
  ]

  const actions: ActionButton<Card>[] = [
    {
      label: 'Назначить',
      action: (card) => {
        setSelectedCard(card)
        setShowAssignModal(true)
      },
      variant: 'primary',
      condition: (card) => !card.assigned_to && (card.account_balance || card.bank_balance || 0) >= 10 && card.status === 'active'
    },
    {
      label: 'Отозвать',
      action: handleUnassignCard,
      variant: 'warning',
      condition: (card) => !!card.assigned_to
    },
    {
      label: 'Показать',
      action: (card) => {
        addToast({ type: 'info', title: 'Показ секретов - в разработке' })
      },
      variant: 'secondary'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Управление картами</h1>
          <p className="text-gray-600">Создание и назначение карт Junior сотрудникам</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => window.location.href = '/dashboard/manager/banks'}
            className="btn-info"
          >
            🏦 Банки и балансы
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Всего карт"
          value={stats.totalCards}
          icon={<CreditCardIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Доступные"
          value={stats.availableCards}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="success"
        />
        <KPICard
          title="Назначенные"
          value={stats.assignedCards}
          icon={<UserPlusIcon className="h-6 w-6" />}
          color="warning"
        />
        <KPICard
          title="Заблокированные"
          value={stats.blockedCards}
          icon={<XCircleIcon className="h-6 w-6" />}
          color="danger"
        />
      </div>

      {/* Таблица карт */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">
            Банковские карты ({cards.length})
          </h3>
        </div>
        
        <DataTable
          data={cards}
          columns={columns}
          actions={actions}
          loading={loading}
          pagination={{ pageSize: 20 }}
          filtering={true}
          exportable={true}
          emptyMessage="Карты не найдены"
        />
      </div>

      {/* Modal назначения карты */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false)
          setSelectedCard(null)
          setSelectedUserId('')
          setAssignNotes('')
        }}
        title={`Назначить карту ${selectedCard?.card_number_mask}`}
        size="md"
      >
        <div className="space-y-4">
          {selectedCard && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Информация о карте</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Номер: {selectedCard.card_number_mask}</div>
                <div>Банк: {selectedCard.bank_name} ({selectedCard.bank_country})</div>
                <div>Баланс: {getCurrencySymbol(selectedCard.account_currency || 'USD')}{(selectedCard.account_balance || selectedCard.bank_balance || 0).toFixed(2)}</div>
                <div>Тип: {selectedCard.card_type === 'pink' ? '🌸 Pink' : '⚫ Grey'}</div>
              </div>
            </div>
          )}

          <div>
            <label className="form-label">Назначить пользователю</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="form-input"
              required
            >
              <option value="">Выберите Junior</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name} - {user.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Комментарий (необязательно)</label>
            <textarea
              value={assignNotes}
              onChange={(e) => setAssignNotes(e.target.value)}
              className="form-input"
              rows={3}
              placeholder="Причина назначения, особые условия..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => {
                setShowAssignModal(false)
                setSelectedCard(null)
                setSelectedUserId('')
                setAssignNotes('')
              }}
              className="btn-secondary"
              disabled={assigning}
            >
              Отмена
            </button>
            <button
              onClick={handleAssignCard}
              className="btn-primary"
              disabled={assigning || !selectedUserId}
            >
              {assigning ? 'Назначение...' : 'Назначить карту'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
