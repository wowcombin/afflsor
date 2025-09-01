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
  bank_balance: number
  account_holder: string
  bank_name: string
  bank_country: string
  is_available: boolean
  daily_limit: number | null
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

  async function loadCards() {
    try {
      const response = await fetch('/api/cards')
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки карт')
      }

      const { cards: cardsData } = await response.json()
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
      key: 'bank_name',
      label: 'Банк',
      render: (card) => (
        <div>
          <div className="font-medium text-gray-900">{card.bank_name}</div>
          <div className="text-sm text-gray-500">{card.account_holder}</div>
        </div>
      )
    },
    {
      key: 'bank_balance',
      label: 'Баланс',
      align: 'right',
      render: (card) => (
        <div className="text-right">
          <div className={`font-mono font-medium ${card.bank_balance >= 10 ? 'text-success-600' : 'text-danger-600'}`}>
            ${card.bank_balance.toFixed(2)}
          </div>
        </div>
      )
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
      condition: (card) => card.is_available
    }
  ]

  const availableCards = cards.filter(c => c.is_available).length
  const totalBalance = cards.reduce((sum, c) => sum + c.bank_balance, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Мои карты</h1>
        <p className="text-gray-600">Банковские карты назначенные вам</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Всего карт"
          value={cards.length}
          icon={<CreditCardIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Доступные"
          value={availableCards}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="success"
        />
        <KPICard
          title="Общий баланс"
          value={`$${totalBalance.toFixed(2)}`}
          icon={<span className="text-xl">💰</span>}
          color="success"
        />
      </div>

      {/* Таблица карт */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">
            Назначенные карты ({cards.length})
          </h3>
        </div>
        
        <DataTable
          data={cards}
          columns={columns}
          actions={actions}
          loading={loading}
          pagination={{ pageSize: 10 }}
          emptyMessage="У вас нет назначенных карт"
        />
      </div>

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
