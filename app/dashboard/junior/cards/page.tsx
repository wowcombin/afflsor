'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column, ActionButton } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import StatusBadge from '@/components/ui/StatusBadge'
import Modal from '@/components/ui/Modal'
import { 
  CreditCardIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon
} from '@heroicons/react/24/outline'

interface Card {
  id: string
  card_number_mask: string
  card_bin: string
  card_type: 'grey' | 'pink'
  exp_month: number
  exp_year: number
  status: string
  account_balance: number
  account_currency: string
  daily_limit: number | null
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

interface CardRevealData {
  pan: string
  cvv: string
  exp_month: number
  exp_year: number
  mask: string
}

export default function JuniorCardsPage() {
  const { addToast } = useToast()
  const [cards, setCards] = useState<Card[]>([])
  const [allWorks, setAllWorks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showRevealModal, setShowRevealModal] = useState(false)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [pinCode, setPinCode] = useState('')
  const [revealedData, setRevealedData] = useState<CardRevealData | null>(null)
  const [revealing, setRevealing] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)

  useEffect(() => {
    loadCards()
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setRevealedData(null)
            setShowRevealModal(false)
            setPinCode('')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [timeLeft])

  // Функция для проверки, используется ли карта в работе для конкретного казино
  function isCardInUseForCasino(cardId: string, casinoId: string): boolean {
    return allWorks.some(work => {
      if (work.card?.id !== cardId || work.casino?.id !== casinoId) return false
      
      // Если работа активна - карта используется для этого казино
      if (work.status === 'active') return true
      
      // Если есть активные выводы - карта используется для этого казино
      const hasActiveWithdrawals = work.withdrawals && work.withdrawals.some((w: any) => 
        ['new', 'waiting', 'received'].includes(w.status)
      )
      
      return hasActiveWithdrawals
    })
  }

  // Функция для проверки, используется ли карта в любой работе (для общей проверки)
  function isCardInUse(cardId: string): boolean {
    return allWorks.some(work => {
      if (work.card?.id !== cardId) return false
      
      // Если работа активна - карта используется
      if (work.status === 'active') return true
      
      // Если есть активные выводы - карта используется
      const hasActiveWithdrawals = work.withdrawals && work.withdrawals.some((w: any) => 
        ['new', 'waiting', 'received'].includes(w.status)
      )
      
      return hasActiveWithdrawals
    })
  }

  async function loadCards() {
    try {
      // Загружаем карты
      const cardsResponse = await fetch('/api/cards')
      if (!cardsResponse.ok) {
        throw new Error('Ошибка загрузки карт')
      }
      const { cards: cardsData } = await cardsResponse.json()
      
      // Загружаем все работы для проверки используемых карт
      const worksResponse = await fetch('/api/works')
      if (worksResponse.ok) {
        const { works: worksData } = await worksResponse.json()
        setAllWorks(worksData || [])
      }
      
      setCards(cardsData)

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

  async function handleRevealCard() {
    if (!selectedCard || !pinCode) {
      addToast({ type: 'error', title: 'Введите PIN код' })
      return
    }

    setRevealing(true)

    try {
      const response = await fetch(`/api/cards/${selectedCard.id}/reveal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pin_code: pinCode,
          context: {
            purpose: 'work_creation',
            timestamp: new Date().toISOString()
          }
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
        title: 'Секреты карты получены',
        description: `Доступ на ${data.ttl} секунд`
      })

    } catch (error: any) {
      console.error('Ошибка получения секретов:', error)
      addToast({
        type: 'error',
        title: 'Ошибка доступа к карте',
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

  const columns: Column<Card>[] = [
    {
      key: 'card_number_mask',
      label: 'Карта',
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
      key: 'bank_account',
      label: 'Банк',
      render: (card) => (
        <div>
          <div className="font-medium text-gray-900">{card.bank_account?.bank?.name || 'Неизвестный банк'}</div>
          <div className="text-sm text-gray-500">{card.bank_account?.holder_name}</div>
          <div className="text-xs text-gray-400">{card.bank_account?.bank?.country}</div>
        </div>
      )
    },

    {
      key: 'casino_assignments',
      label: 'Назначения',
      render: (card) => {
        // Фильтруем назначения, исключая казино для которых карта уже используется
        const availableAssignments = card.casino_assignments.filter(assignment => 
          !isCardInUseForCasino(card.id, assignment.casino_id)
        )
        
        return (
          <div>
            {availableAssignments.length > 0 ? (
              <div className="space-y-1">
                {availableAssignments.map((assignment, index) => (
                  <div key={assignment.assignment_id} className="text-sm">
                    <div className="font-medium text-primary-600">
                      {assignment.casino_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {assignment.assignment_type === 'junior_work' ? '🎯 Работа' : '🧪 Тест'}
                      {assignment.has_deposit && ` • $${assignment.deposit_amount}`}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-sm text-gray-400">
                {card.casino_assignments.length > 0 ? 'Все назначения в работе' : 'Нет назначений'}
              </span>
            )}
          </div>
        )
      }
    },
    {
      key: 'status',
      label: 'Статус',
      render: (card) => <StatusBadge status={card.status} />
    },
    {
      key: 'exp_year',
      label: 'Истекает',
      render: (card) => (
        <span className="text-sm text-gray-600">
          {String(card.exp_month).padStart(2, '0')}/{card.exp_year}
        </span>
      )
    }
  ]

  const actions: ActionButton<Card>[] = [
    {
      label: 'Показать секреты',
      action: (card) => {
        setSelectedCard(card)
        setShowRevealModal(true)
      },
      variant: 'primary',
      condition: (card) => card.status === 'active'
    },
    {
      label: 'Создать работу',
      action: (card) => {
        // Перенаправляем на страницу создания работы с предзаполненной картой
        window.location.href = `/dashboard/junior/work/new?card_id=${card.id}`
      },
      variant: 'secondary',
      condition: (card) => {
        // Проверяем, есть ли доступные назначения (не используемые в работе)
        const availableAssignments = card.casino_assignments.filter(assignment => 
          !isCardInUseForCasino(card.id, assignment.casino_id)
        )
        return card.status === 'active' && availableAssignments.length > 0
      }
    }
  ]

  // Показываем все активные карты
  const availableCards = cards.filter(c => c.status === 'active')
  
  // Считаем общее количество доступных работ (назначений)
  // Каждое назначение карты на казино = потенциальная работа
  const totalAvailableWorks = availableCards.reduce((total, card) => {
    const availableAssignments = card.casino_assignments.filter(assignment => 
      !isCardInUseForCasino(card.id, assignment.casino_id)
    )
    return total + availableAssignments.length
  }, 0)
  
  // Считаем карты с доступными назначениями
  const cardsWithAvailableAssignments = availableCards.filter(c => {
    const availableAssignments = c.casino_assignments.filter(assignment => 
      !isCardInUseForCasino(c.id, assignment.casino_id)
    )
    return availableAssignments.length > 0
  }).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Мои карты</h1>
        <p className="text-gray-600">Банковские карты назначенные вам</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Всего карт"
          value={cards.length}
          icon={<CreditCardIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Доступные работы"
          value={totalAvailableWorks}
          icon={<span className="text-xl">🎯</span>}
          color="primary"
        />
        <KPICard
          title="Активные карты"
          value={cardsWithAvailableAssignments}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="success"
        />
      </div>

      {/* Таблица карт */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">
            Назначенные карты ({availableCards.length})
          </h3>
        </div>
        
        <DataTable
          data={availableCards}
          columns={columns}
          actions={actions}
          loading={loading}
          pagination={{ pageSize: 10 }}
          emptyMessage="У вас нет назначенных карт"
        />
      </div>

      {/* Информационное сообщение для новых пользователей */}
      {!loading && cards.length === 0 && (
        <div className="card text-center py-12">
          <CreditCardIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Нет назначенных карт</h3>
          <p className="text-gray-600 mb-4">
            Менеджер еще не назначил вам банковские карты для работы.
          </p>
          <p className="text-sm text-gray-500">
            Обратитесь к менеджеру для получения карт или ожидайте назначения.
          </p>
        </div>
      )}

      {/* Подсказка для пользователей с картами без назначений */}
      {!loading && cards.length > 0 && cardsWithAvailableAssignments === 0 && (
        <div className="bg-info-50 border border-info-200 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-info-600 mr-2 mt-0.5" />
            <div className="text-sm text-info-800">
              <p className="font-medium">Карты без назначений</p>
              <p>У вас есть карты, но они не назначены на конкретные казино. Обратитесь к менеджеру для назначения работ.</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal показа секретов карты */}
      <Modal
        isOpen={showRevealModal}
        onClose={() => {
          setShowRevealModal(false)
          setSelectedCard(null)
          setPinCode('')
          setRevealedData(null)
          setTimeLeft(0)
        }}
        title={`Секреты карты ${selectedCard?.card_number_mask}`}
        size="md"
      >
        <div className="space-y-4">
          {!revealedData ? (
            <>
              <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="h-5 w-5 text-warning-600 mr-2 mt-0.5" />
                  <div className="text-sm text-warning-800">
                    <p className="font-medium">Внимание!</p>
                    <p>Секреты карты будут показаны на 60 секунд. Используйте их осторожно.</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="form-label">PIN код для доступа</label>
                <input
                  type="password"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  className="form-input"
                  placeholder="Введите PIN (1234)"
                  maxLength={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Временный PIN: 1234 (в продакшене будет TOTP)
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowRevealModal(false)}
                  className="btn-secondary"
                  disabled={revealing}
                >
                  Отмена
                </button>
                <button
                  onClick={handleRevealCard}
                  className="btn-primary"
                  disabled={revealing || !pinCode}
                >
                  {revealing ? 'Получение...' : 'Показать секреты'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-success-50 border border-success-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-success-900">Секреты карты</h4>
                  <div className="flex items-center text-success-700">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    <span className="font-mono">{timeLeft}s</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-success-800">Номер карты</label>
                    <div className="flex items-center space-x-2">
                      <code className="bg-white px-3 py-2 rounded border font-mono text-lg">
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
                      <label className="text-xs font-medium text-success-800">CVV</label>
                      <div className="flex items-center space-x-2">
                        <code className="bg-white px-3 py-2 rounded border font-mono">
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
                      <label className="text-xs font-medium text-success-800">Срок действия</label>
                      <div className="bg-white px-3 py-2 rounded border font-mono">
                        {String(revealedData.exp_month).padStart(2, '0')}/{revealedData.exp_year}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-xs text-success-700">
                  ⚠️ Данные автоматически скроются через {timeLeft} секунд
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
