'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import StatusBadge from '@/components/ui/StatusBadge'
import { useToast } from '@/components/ui/Toast'
import { Card, BankAccount, Bank, User } from '@/types/database.types'

interface CardWithDetails extends Card {
  bank_account?: BankAccount & {
    bank?: Bank
  }
  assigned_user?: User
}

interface AssignmentData {
  card_id: string
  user_id: string
  casino_id?: string
  notes?: string
}

export default function CardsManagement() {
  const router = useRouter()
  const { addToast } = useToast()
  const [cards, setCards] = useState<CardWithDetails[]>([])
  const [juniors, setJuniors] = useState<User[]>([])
  const [selectedCards, setSelectedCards] = useState<string[]>([])
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchCards()
    fetchJuniors()
  }, [])

  const fetchCards = async () => {
    try {
      const response = await fetch('/api/manager/cards')
      const data = await response.json()
      
      if (data.success) {
        setCards(data.data)
      } else {
        addToast({ type: 'error', title: 'Ошибка', description: data.error || 'Не удалось загрузить карты' })
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Ошибка сети' })
    } finally {
      setLoading(false)
    }
  }

  const fetchJuniors = async () => {
    try {
      const response = await fetch('/api/manager/team')
      const data = await response.json()
      
      if (data.success) {
        setJuniors(data.data.filter((user: User) => user.role === 'junior'))
      }
    } catch (error) {
      console.error('Failed to fetch juniors:', error)
    }
  }

  const handleCardAssignment = async (assignmentData: AssignmentData) => {
    setActionLoading(true)
    try {
      const response = await fetch('/api/manager/cards/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignmentData)
      })

      const data = await response.json()
      
      if (data.success) {
        addToast({ type: 'success', title: 'Успешно', description: 'Карта назначена' })
        setShowAssignModal(false)
        setSelectedCards([])
        fetchCards()
      } else {
        addToast({ type: 'error', title: 'Ошибка', description: data.error || 'Не удалось назначить карту' })
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Ошибка сети' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleBulkAction = async (action: 'block' | 'unblock' | 'unassign') => {
    if (selectedCards.length === 0) {
      addToast({ type: 'warning', title: 'Внимание', description: 'Выберите карты для действия' })
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch('/api/manager/cards/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, card_ids: selectedCards })
      })

      const data = await response.json()
      
      if (data.success) {
        addToast({ type: 'success', title: 'Успешно', description: `${selectedCards.length} карт обновлено` })
        setSelectedCards([])
        fetchCards()
      } else {
        addToast({ type: 'error', title: 'Ошибка', description: data.error || 'Не удалось выполнить действие' })
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Ошибка сети' })
    } finally {
      setActionLoading(false)
    }
  }

  const columns = [
    {
      key: 'card_number_mask',
      label: 'Номер карты',
      render: (item: CardWithDetails) => (
        <div>
          <div className="font-mono text-sm font-semibold">{item.card_number_mask}</div>
          <div className="text-xs text-gray-500">BIN: {item.card_bin}</div>
        </div>
      )
    },
    {
      key: 'card_type',
      label: 'Тип',
      render: (item: CardWithDetails) => (
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            item.card_type === 'black' ? 'bg-gray-900' :
            item.card_type === 'gold' ? 'bg-yellow-500' :
            item.card_type === 'platinum' ? 'bg-gray-400' :
            'bg-gray-300'
          }`} />
          <span className="capitalize">{item.card_type}</span>
        </div>
      )
    },
    {
      key: 'bank_account.bank.name',
      label: 'Банк',
      render: (item: CardWithDetails) => (
        <div>
          <div className="font-medium">{item.bank_account?.bank?.name}</div>
          <div className="text-sm text-gray-500">{item.bank_account?.bank?.country}</div>
        </div>
      )
    },
    {
      key: 'bank_account.balance',
      label: 'Баланс',
      render: (item: CardWithDetails) => (
        <div>
          <div className={`font-semibold ${
            (item.bank_account?.balance || 0) >= 10 ? 'text-success-600' : 'text-danger-600'
          }`}>
            ${item.bank_account?.balance?.toFixed(2) || '0.00'}
          </div>
          <div className="text-xs text-gray-500">{item.bank_account?.currency}</div>
        </div>
      )
    },
    {
      key: 'assigned_user',
      label: 'Назначена',
      render: (item: CardWithDetails) => (
        item.assigned_user ? (
          <div>
            <div className="font-medium">
              {item.assigned_user.first_name} {item.assigned_user.last_name}
            </div>
            <div className="text-sm text-gray-500">{item.assigned_user.email}</div>
          </div>
        ) : (
          <span className="text-gray-400">Не назначена</span>
        )
      )
    },
    {
      key: 'status',
      label: 'Статус',
      render: (item: CardWithDetails) => <StatusBadge status={item.status} />
    },
    {
      key: 'daily_limit',
      label: 'Лимит',
      render: (item: CardWithDetails) => (
        <div className="text-sm">
          {item.daily_limit ? `$${item.daily_limit}` : 'Не установлен'}
        </div>
      )
    },
    {
      key: 'exp_date',
      label: 'Срок действия',
      render: (item: CardWithDetails) => {
        const expDate = new Date(item.exp_year, item.exp_month - 1)
        const isExpiring = expDate.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000 // 30 дней
        return (
          <div className={isExpiring ? 'text-warning-600' : 'text-gray-600'}>
            {String(item.exp_month).padStart(2, '0')}/{item.exp_year}
          </div>
        )
      }
    }
  ]

  const actions = [
    {
      label: 'Назначить',
      action: (item: CardWithDetails) => {
        setSelectedCards([item.id])
        setShowAssignModal(true)
      },
      variant: 'primary' as const,
      condition: (item: CardWithDetails) => !item.assigned_to && item.status === 'active'
    },
    {
      label: 'Отозвать',
      action: (item: CardWithDetails) => handleBulkAction('unassign'),
      variant: 'warning' as const,
      condition: (item: CardWithDetails) => !!item.assigned_to
    },
    {
      label: 'Заблокировать',
      action: (item: CardWithDetails) => {
        setSelectedCards([item.id])
        handleBulkAction('block')
      },
      variant: 'danger' as const,
      condition: (item: CardWithDetails) => item.status === 'active'
    }
  ]

  // Группировка карт по банкам
  const cardsByBank = cards.reduce((acc, card) => {
    const bankName = card.bank_account?.bank?.name || 'Неизвестный банк'
    if (!acc[bankName]) {
      acc[bankName] = []
    }
    acc[bankName].push(card)
    return acc
  }, {} as Record<string, CardWithDetails[]>)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Управление картами</h1>
          <p className="text-gray-600">Назначение карт junior'ам и контроль балансов</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => router.push('/dashboard/manager')}>
            ← Назад
          </button>
          <button 
            className="btn-primary" 
            onClick={() => setShowAssignModal(true)}
            disabled={selectedCards.length === 0}
          >
            Назначить выбранные ({selectedCards.length})
          </button>
        </div>
      </div>

      {/* Статистика по банкам */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Всего карт</h3>
          <p className="text-2xl font-bold text-gray-900">{cards.length}</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Доступно для назначения</h3>
          <p className="text-2xl font-bold text-success-600">
            {cards.filter(c => !c.assigned_to && c.status === 'active' && (c.bank_account?.balance || 0) >= 10).length}
          </p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Назначено</h3>
          <p className="text-2xl font-bold text-primary-600">
            {cards.filter(c => c.assigned_to).length}
          </p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Заблокировано</h3>
          <p className="text-2xl font-bold text-danger-600">
            {cards.filter(c => c.status === 'blocked').length}
          </p>
        </div>
      </div>

      {/* Массовые действия */}
      {selectedCards.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-blue-800">
              Выбрано карт: {selectedCards.length}
            </span>
            <div className="flex gap-2">
              <button 
                className="btn-warning btn-sm"
                onClick={() => handleBulkAction('unassign')}
                disabled={actionLoading}
              >
                Отозвать все
              </button>
              <button 
                className="btn-danger btn-sm"
                onClick={() => handleBulkAction('block')}
                disabled={actionLoading}
              >
                Заблокировать все
              </button>
              <button 
                className="btn-secondary btn-sm"
                onClick={() => setSelectedCards([])}
              >
                Отменить выбор
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Группировка по банкам */}
      <div className="space-y-6">
        {Object.entries(cardsByBank).map(([bankName, bankCards]) => (
          <div key={bankName} className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{bankName}</h3>
              <div className="text-sm text-gray-500">
                Карт: {bankCards.length} | 
                Общий баланс: ${bankCards.reduce((sum, card) => sum + (card.bank_account?.balance || 0), 0).toFixed(2)}
              </div>
            </div>
            
            <DataTable
              data={bankCards}
              columns={columns}
              actions={actions}
              loading={loading}
            />
          </div>
        ))}
      </div>

      {/* Модальное окно назначения карт */}
      {showAssignModal && (
        <CardAssignmentModal
          cards={cards.filter(c => selectedCards.includes(c.id))}
          juniors={juniors}
          onClose={() => {
            setShowAssignModal(false)
            setSelectedCards([])
          }}
          onAssign={handleCardAssignment}
          loading={actionLoading}
        />
      )}
    </div>
  )
}

// Компонент модального окна назначения карт
function CardAssignmentModal({ 
  cards, 
  juniors, 
  onClose, 
  onAssign, 
  loading 
}: {
  cards: CardWithDetails[]
  juniors: User[]
  onClose: () => void
  onAssign: (data: AssignmentData) => void
  loading: boolean
}) {
  const [selectedJunior, setSelectedJunior] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedJunior) return

    // Назначаем первую карту (для простоты)
    if (cards.length > 0) {
      onAssign({
        card_id: cards[0].id,
        user_id: selectedJunior,
        notes
      })
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Назначение карты">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Информация о картах */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Карты для назначения:</h3>
          <div className="space-y-2">
            {cards.map(card => (
              <div key={card.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-mono text-sm">{card.card_number_mask}</span>
                  <span className="ml-2 text-sm text-gray-500">
                    {card.bank_account?.bank?.name}
                  </span>
                </div>
                <div className="text-sm font-semibold text-success-600">
                  ${card.bank_account?.balance?.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Выбор junior'а */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Назначить junior'у *
          </label>
          <select
            value={selectedJunior}
            onChange={(e) => setSelectedJunior(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg"
            required
          >
            <option value="">Выберите junior'а</option>
            {juniors.map(junior => (
              <option key={junior.id} value={junior.id}>
                {junior.first_name} {junior.last_name} ({junior.email})
              </option>
            ))}
          </select>
        </div>

        {/* Комментарий */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Комментарий (опционально)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg"
            rows={3}
            placeholder="Добавьте комментарий к назначению..."
          />
        </div>

        {/* Действия */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || !selectedJunior}
            className="btn-primary flex-1"
          >
            {loading ? 'Назначение...' : 'Назначить карту'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn-secondary"
          >
            Отмена
          </button>
        </div>
      </form>
    </Modal>
  )
}