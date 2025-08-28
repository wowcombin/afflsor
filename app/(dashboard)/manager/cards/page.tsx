'use client'

import { useEffect, useState } from 'react'
import DataTable, { Column, ActionConfig } from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import KPICard from '@/components/ui/KPICard'
import CardAssignmentModal from '@/components/ui/CardAssignmentModal'
import { useToast } from '@/components/ui/Toast'

interface Card {
  id: string
  card_number_mask: string
  card_bin: string
  card_last4: string
  exp_month: number
  exp_year: number
  type: string
  status: string
  created_at: string
  bank: {
    id: string
    name: string
    country: string
    currency: string
  }
  bank_account: {
    id: string
    holder_name: string
    balance: number
    status: string
  }
  assignments: any[]
  is_available: boolean
  active_assignments: any[]
}

export default function ManagerCardsPage() {
  const { addToast } = useToast()
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const [stats, setStats] = useState({
    totalCards: 0,
    availableCards: 0,
    assignedCards: 0,
    blockedCards: 0
  })

  useEffect(() => {
    loadCards()
  }, [filter])

  async function loadCards() {
    try {
      setLoading(true)
      const response = await fetch(`/api/manager/cards?filter=${filter}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      const cardsData = data.cards || []
      setCards(cardsData)

      // Вычисляем статистику
      const totalCards = cardsData.length
      const availableCards = cardsData.filter((c: Card) => c.is_available).length
      const assignedCards = cardsData.filter((c: Card) => c.active_assignments.length > 0).length
      const blockedCards = cardsData.filter((c: Card) => c.status !== 'active' || !c.is_available).length

      setStats({
        totalCards,
        availableCards,
        assignedCards,
        blockedCards
      })

    } catch (error: any) {
      addToast({ 
        type: 'error', 
        title: error.message || 'Ошибка загрузки карт' 
      })
    } finally {
      setLoading(false)
    }
  }

  function openAssignmentModal(card: Card) {
    setSelectedCard(card)
    setAssignmentModalOpen(true)
  }

  function closeAssignmentModal() {
    setSelectedCard(null)
    setAssignmentModalOpen(false)
  }

  async function handleCardAssignment(juniorId: string, casinoId: string) {
    if (!selectedCard) return

    try {
      const response = await fetch('/api/manager/card-assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          card_id: selectedCard.id,
          junior_id: juniorId,
          casino_id: casinoId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({ 
        type: 'success', 
        title: data.message || 'Карта успешно назначена' 
      })

      // Перезагружаем карты
      loadCards()

    } catch (error: any) {
      addToast({ 
        type: 'error', 
        title: error.message || 'Ошибка назначения карты' 
      })
      throw error // Пробрасываем ошибку для модального окна
    }
  }

  async function handleRemoveAssignment(assignmentId: string) {
    if (!confirm('Вы уверены, что хотите отменить назначение карты?')) {
      return
    }

    try {
      const response = await fetch(`/api/manager/card-assignments?id=${assignmentId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({ 
        type: 'success', 
        title: data.message || 'Назначение отменено' 
      })

      // Перезагружаем карты
      loadCards()

    } catch (error: any) {
      addToast({ 
        type: 'error', 
        title: error.message || 'Ошибка отмены назначения' 
      })
    }
  }

  // Конфигурация колонок для DataTable
  const columns: Column[] = [
    {
      key: 'card_number_mask',
      label: 'Номер карты',
      sortable: true,
      render: (value: string, row: Card) => (
        <div>
          <div className="font-mono font-medium">{value}</div>
          <div className="text-xs text-gray-500">BIN: {row.card_bin}</div>
        </div>
      )
    },
    {
      key: 'bank.name',
      label: 'Банк',
      sortable: true,
      render: (value: string, row: Card) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-xs text-gray-500">{row.bank.country} • {row.bank.currency}</div>
        </div>
      )
    },
    {
      key: 'bank_account.balance',
      label: 'Баланс',
      sortable: true,
      render: (value: number, row: Card) => (
        <div className={`font-medium ${value >= 10 ? 'text-green-600' : 'text-red-600'}`}>
          ${value.toFixed(2)}
        </div>
      )
    },
    {
      key: 'bank_account.holder_name',
      label: 'Держатель',
      sortable: true
    },
    {
      key: 'active_assignments',
      label: 'Назначения',
      render: (assignments: any[], row: Card) => (
        <div>
          {assignments.length === 0 ? (
            <span className="text-gray-500">Не назначена</span>
          ) : (
            <div className="space-y-1">
              {assignments.map((assignment, index) => (
                <div key={index} className="text-xs">
                  <div className="font-medium">
                    {assignment.users.first_name} {assignment.users.last_name}
                  </div>
                  <div className="text-gray-500">
                    {assignment.casinos?.name}
                    <button
                      onClick={() => handleRemoveAssignment(assignment.id)}
                      className="ml-2 text-red-500 hover:text-red-700"
                      title="Отменить назначение"
                    >
                      ✗
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Статус',
      render: (value: string, row: Card) => (
        <div className="space-y-1">
          <StatusBadge status={value} type="card" />
          {row.is_available && (
            <div className="text-xs text-green-600">✓ Доступна</div>
          )}
          {!row.is_available && row.status === 'active' && (
            <div className="text-xs text-red-600">⚠ Низкий баланс</div>
          )}
        </div>
      )
    }
  ]

  // Конфигурация действий
  const actions: ActionConfig[] = [
    {
      label: 'Назначить',
      action: (row: Card) => openAssignmentModal(row),
      variant: 'primary',
      condition: (row: Card) => row.is_available
    }
  ]

  // Конфигурация фильтров
  const filters = [
    { key: 'search', type: 'search' as const, placeholder: 'Поиск по номеру карты или банку...' },
    {
      key: 'filter',
      type: 'select' as const,
      options: [
        { value: 'all', label: 'Все карты' },
        { value: 'available', label: 'Доступные' },
        { value: 'assigned', label: 'Назначенные' },
        { value: 'unassigned', label: 'Не назначенные' }
      ],
      value: filter,
      onChange: (value: string) => setFilter(value)
    }
  ]

  if (loading) return <div className="p-8">Загрузка...</div>

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Управление картами</h1>
        <button
          onClick={loadCards}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          🔄 Обновить
        </button>
      </div>

      {/* KPI карточки */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Всего карт"
          value={stats.totalCards.toString()}
          color="blue"
          icon="💳"
        />
        <KPICard
          title="Доступные"
          value={stats.availableCards.toString()}
          color="green"
          icon="✅"
        />
        <KPICard
          title="Назначенные"
          value={stats.assignedCards.toString()}
          color="purple"
          icon="👤"
        />
        <KPICard
          title="Заблокированные"
          value={stats.blockedCards.toString()}
          color="red"
          icon="🚫"
        />
      </div>

      {/* Таблица карт */}
      <DataTable
        columns={columns}
        data={cards}
        actions={actions}
        filters={filters}
        defaultSort={{ key: 'created_at', direction: 'desc' }}
        pageSize={20}
        exportable={true}
        exportFilename="manager-cards"
      />

      {/* Модальное окно назначения карты */}
      {selectedCard && (
        <CardAssignmentModal
          card={selectedCard}
          isOpen={assignmentModalOpen}
          onClose={closeAssignmentModal}
          onSubmit={handleCardAssignment}
        />
      )}
    </div>
  )
}
