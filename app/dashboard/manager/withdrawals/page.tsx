'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import StatusBadge from '@/components/ui/StatusBadge'
import { useToast } from '@/components/ui/Toast'
import { 
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  StarIcon
} from '@heroicons/react/24/outline'

interface WithdrawalData {
  id: string
  source_type: 'tester' | 'junior'
  user_role: string
  user_name: string
  user_email: string
  user_telegram: string
  deposit_amount: number
  deposit_date: string
  casino_name: string
  casino_company: string
  casino_url: string
  casino_currency?: string
  card_mask: string
  card_type: string
  bank_name?: string
  account_holder?: string
  withdrawal_amount: number
  status: string
  created_at: string
  updated_at: string
}

type TabStatus = 'waiting' | 'new' | 'received' | 'block'

export default function WithdrawalsQueue() {
  const router = useRouter()
  const { addToast } = useToast()
  const [withdrawals, setWithdrawals] = useState<WithdrawalData[]>([])
  const [selectedWithdrawals, setSelectedWithdrawals] = useState<string[]>([])
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [exchangeRates, setExchangeRates] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<TabStatus>('waiting')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    // Сначала загружаем курсы валют, затем выводы
    await loadExchangeRates()
    await fetchWithdrawals()
  }

  async function loadExchangeRates() {
    try {
      const response = await fetch('/api/currency-rates')
      if (response.ok) {
        const rates = await response.json()
        setExchangeRates(rates)
      }
    } catch (error) {
      console.error('Failed to load exchange rates:', error)
      // Устанавливаем fallback курсы
      setExchangeRates({
        'GBP': 0.95 * 1.27, // Google rate -5%
        'EUR': 0.95 * 1.09,
        'CAD': 0.95 * 0.74,
        'AUD': 0.95 * 0.67,
        'USD': 1
      })
    }
  }

  const fetchWithdrawals = async () => {
    try {
      const response = await fetch('/api/manager/withdrawals')
      const data = await response.json()
      
      if (data.success) {
        setWithdrawals(data.data)
      } else {
        addToast({ type: 'error', title: 'Ошибка', description: data.error || 'Не удалось загрузить выводы' })
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Ошибка сети' })
    } finally {
      setLoading(false)
    }
  }

  // Функция конвертации валют (как в Junior withdrawals)
  function convertToUSD(amount: number, currency: string): number {
    if (!exchangeRates || currency === 'USD') return amount
    const rate = exchangeRates[currency] || 1
    return amount * rate
  }

  // Функция для копирования промо ссылки
  const copyPromoLink = (casinoUrl: string) => {
    if (casinoUrl) {
      navigator.clipboard.writeText(casinoUrl)
      addToast({ type: 'success', title: 'Скопировано', description: 'Промо ссылка скопирована в буфер обмена' })
    }
  }

  // Функция для получения рейтинга пользователя (заглушка)
  const getUserRating = (userId: string): number => {
    // В реальной системе это будет запрос к API
    return Math.floor(Math.random() * 3) + 7 // 7-10 баллов
  }

  // Функция для фильтрации выводов по активной вкладке
  const getFilteredWithdrawals = (): WithdrawalData[] => {
    return withdrawals.filter(w => {
      switch (activeTab) {
        case 'waiting':
          return w.status === 'waiting'
        case 'new':
          return w.status === 'new'
        case 'received':
          return w.status === 'received'
        case 'block':
          return w.status === 'block'
        default:
          return true
      }
    })
  }

  // Функция для получения статистики по месяцам
  const getMonthlyStats = (status: TabStatus) => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    // Первое число текущего месяца
    const monthStart = new Date(currentYear, currentMonth, 1)
    // Последнее число текущего месяца
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59)
    
    return withdrawals.filter(w => {
      const createdDate = new Date(w.created_at)
      return w.status === status && 
             createdDate >= monthStart && 
             createdDate <= monthEnd
    }).length
  }

  // Конфигурация вкладок
  const tabs = [
    {
      id: 'waiting' as TabStatus,
      label: 'Ожидание',
      count: getMonthlyStats('waiting'),
      color: 'text-warning-600 bg-warning-50 border-warning-200'
    },
    {
      id: 'new' as TabStatus,
      label: 'Новые аккаунты',
      count: getMonthlyStats('new'),
      color: 'text-blue-600 bg-blue-50 border-blue-200'
    },
    {
      id: 'received' as TabStatus,
      label: 'Получен',
      count: getMonthlyStats('received'),
      color: 'text-success-600 bg-success-50 border-success-200'
    },
    {
      id: 'block' as TabStatus,
      label: 'Заблокирован',
      count: getMonthlyStats('block'),
      color: 'text-danger-600 bg-danger-50 border-danger-200'
    }
  ]

  const filteredWithdrawals = getFilteredWithdrawals()

  const handleWithdrawalAction = async (withdrawalId: string, action: 'approve' | 'reject', comment?: string) => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/manager/withdrawals/${withdrawalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, comment })
      })

      const data = await response.json()
      
      if (data.success) {
        addToast({ type: 'success', title: 'Успешно', description: `Вывод ${action === 'approve' ? 'одобрен' : 'отклонен'}` })
        setSelectedWithdrawal(null)
        fetchWithdrawals()
      } else {
        addToast({ type: 'error', title: 'Ошибка', description: data.error || 'Не удалось обновить статус' })
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Ошибка сети' })
    } finally {
      setActionLoading(false)
    }
  }

  const columns = [
    {
      key: 'select',
      label: '☐',
      render: (item: WithdrawalData) => (
        <input
          type="checkbox"
          checked={selectedWithdrawals.includes(item.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedWithdrawals([...selectedWithdrawals, item.id])
            } else {
              setSelectedWithdrawals(selectedWithdrawals.filter(id => id !== item.id))
            }
          }}
          className="rounded border-gray-300"
        />
      )
    },
    {
      key: 'created_at',
      label: 'Время ожидания',
      render: (item: WithdrawalData) => {
        const now = Date.now()
        const created = new Date(item.created_at).getTime()
        const diffMs = now - created
        
        const hours = Math.floor(diffMs / (1000 * 60 * 60))
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
        const isUrgent = hours > 4
        
        return (
          <span className={isUrgent ? 'text-danger-600 font-semibold' : 'text-gray-600'}>
            {hours}ч {minutes}м
          </span>
        )
      }
    },
    {
      key: 'user_name',
      label: 'Junior',
      render: (item: WithdrawalData) => (
        <div>
          <div className="font-medium">
            {item.user_telegram ? `@${item.user_telegram}` : item.user_name}
          </div>
          <div className="text-sm text-gray-500">
            Рейтинг: {getUserRating(item.id)}/10
          </div>
        </div>
      )
    },
    {
      key: 'casino_name',
      label: 'Казино',
      render: (item: WithdrawalData) => (
        <div>
          <button
            onClick={() => copyPromoLink(item.casino_url)}
            className="font-medium text-primary-600 hover:text-primary-800 cursor-pointer"
          >
            {item.casino_name}
          </button>
          <div className="text-sm text-gray-500">{item.casino_company}</div>
        </div>
      )
    },
    {
      key: 'card_mask',
      label: 'Карта',
      render: (item: WithdrawalData) => (
        <div>
          <div className="font-mono text-sm">{item.card_mask}</div>
          <div className="text-xs text-gray-500">
            {item.bank_name} • {item.account_holder}
          </div>
        </div>
      )
    },
    {
      key: 'withdrawal_amount',
      label: 'Сумма',
      render: (item: WithdrawalData) => {
        const currency = getCasinoCurrency(item)
        const symbol = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : currency
        return (
          <div>
            <div className="font-semibold text-lg">
              {symbol}{item.withdrawal_amount}
            </div>
            <div className="text-sm text-gray-500">
              Депозит: {symbol}{item.deposit_amount}
            </div>
          </div>
        )
      }
    },
    {
      key: 'profit',
      label: 'Профит',
      render: (item: WithdrawalData) => {
        const profit = item.withdrawal_amount - item.deposit_amount
        const currency = getCasinoCurrency(item)
        const symbol = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : currency
        
        return (
          <div className={`font-semibold ${profit > 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {symbol}{profit.toFixed(2)}
          </div>
        )
      }
    },
    {
      key: 'status',
      label: 'Статус',
      render: (item: WithdrawalData) => (
        <StatusBadge status={item.status} />
      )
    }
  ]

  // Функция для определения валюты казино
  const getCasinoCurrency = (item: WithdrawalData): string => {
    // Используем casino_currency из API если доступно
    if ((item as any).casino_currency) {
      return (item as any).casino_currency
    }
    // Fallback логика по названию казино
    const casinoName = item.casino_name.toLowerCase()
    if (casinoName.includes('uk') || casinoName.includes('british') || casinoName.includes('virgin')) {
      return 'GBP'
    }
    if (casinoName.includes('euro')) {
      return 'EUR'
    }
    return 'USD'
  }

  const actions = [
    {
      label: 'Проверить',
      action: (item: WithdrawalData) => setSelectedWithdrawal(item),
      variant: 'primary' as const
    }
  ]

  // Массовые операции
  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedWithdrawals.length === 0) {
      addToast({ type: 'warning', title: 'Предупреждение', description: 'Выберите выводы для обработки' })
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch('/api/manager/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action === 'approve' ? 'bulk_approve' : 'bulk_reject',
          withdrawal_ids: selectedWithdrawals,
          comment: `Массовое ${action === 'approve' ? 'одобрение' : 'отклонение'} менеджером`
        })
      })

      const data = await response.json()
      
      if (data.success) {
        addToast({ 
          type: 'success', 
          title: 'Успешно', 
          description: `${selectedWithdrawals.length} выводов ${action === 'approve' ? 'одобрено' : 'отклонено'}` 
        })
        setSelectedWithdrawals([])
        fetchWithdrawals()
      } else {
        addToast({ type: 'error', title: 'Ошибка', description: data.error || 'Не удалось обработать выводы' })
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Ошибка сети' })
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Очередь выводов</h1>
          <p className="text-gray-600">Проверка и одобрение выводов от junior'ов</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => router.push('/dashboard/manager')}>
            ← Назад
          </button>
          <button 
            className="btn-secondary" 
            onClick={() => {
              if (selectedWithdrawals.length === filteredWithdrawals.length && filteredWithdrawals.length > 0) {
                setSelectedWithdrawals([])
              } else {
                setSelectedWithdrawals(filteredWithdrawals.map(w => w.id))
              }
            }}
          >
            {selectedWithdrawals.length === filteredWithdrawals.length && filteredWithdrawals.length > 0 ? 'Снять выделение' : 'Выбрать все'}
          </button>
          {selectedWithdrawals.length > 0 && (
            <>
              <button 
                className="btn-success" 
                onClick={() => handleBulkAction('approve')}
                disabled={actionLoading}
              >
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Одобрить выбранные ({selectedWithdrawals.length})
              </button>
              <button 
                className="btn-danger" 
                onClick={() => handleBulkAction('reject')}
                disabled={actionLoading}
              >
                <XCircleIcon className="h-4 w-4 mr-2" />
                Отклонить выбранные ({selectedWithdrawals.length})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Вкладки статусов */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setSelectedWithdrawals([]) // Сбрасываем выделение при смене вкладки
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              <span className={`ml-2 py-0.5 px-2 rounded-full text-xs font-medium ${
                activeTab === tab.id ? tab.color : 'bg-gray-100 text-gray-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Статистика текущей вкладки */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Всего в этом месяце</h3>
          <p className="text-2xl font-bold text-primary-600">
            {tabs.find(t => t.id === activeTab)?.count || 0}
          </p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Просрочено (&gt;4ч)</h3>
          <p className="text-2xl font-bold text-danger-600">
            {filteredWithdrawals.filter(w => {
              const hours = Math.floor((Date.now() - new Date(w.created_at).getTime()) / (1000 * 60 * 60))
              return hours > 4
            }).length}
          </p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Сегодня</h3>
          <p className="text-2xl font-bold text-blue-600">
            {filteredWithdrawals.filter(w => {
              const today = new Date().toDateString()
              return new Date(w.created_at).toDateString() === today
            }).length}
          </p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Выбрано</h3>
          <p className="text-2xl font-bold text-gray-600">
            {selectedWithdrawals.length}
          </p>
        </div>
      </div>

      <DataTable
        data={filteredWithdrawals}
        columns={columns}
        actions={actions}
        loading={loading}
      />

      {/* Модальное окно проверки вывода */}
      {selectedWithdrawal && (
        <WithdrawalReviewModal
          withdrawal={selectedWithdrawal}
          onClose={() => setSelectedWithdrawal(null)}
          onAction={handleWithdrawalAction}
          loading={actionLoading}
        />
      )}
    </div>
  )
}

// Компонент модального окна для проверки вывода
function WithdrawalReviewModal({ 
  withdrawal, 
  onClose, 
  onAction, 
  loading 
}: {
  withdrawal: WithdrawalData
  onClose: () => void
  onAction: (id: string, action: 'approve' | 'reject', comment?: string) => void
  loading: boolean
}) {
  const [comment, setComment] = useState('')

  const profit = withdrawal.withdrawal_amount - withdrawal.deposit_amount
  const currency = getCasinoCurrency(withdrawal)
  const symbol = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : currency

  // Функция для определения валюты казино (дублируем здесь для доступности)
  function getCasinoCurrency(item: WithdrawalData): string {
    if ((item as any).casino_currency) {
      return (item as any).casino_currency
    }
    const casinoName = item.casino_name.toLowerCase()
    if (casinoName.includes('uk') || casinoName.includes('british') || casinoName.includes('virgin')) {
      return 'GBP'
    }
    if (casinoName.includes('euro')) {
      return 'EUR'
    }
    return 'USD'
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Проверка вывода">
      <div className="space-y-6">
        {/* Основная информация */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Junior</h3>
            <p className="font-medium">
              {withdrawal.user_telegram ? `@${withdrawal.user_telegram}` : withdrawal.user_name}
            </p>
            <p className="text-sm text-gray-500">{withdrawal.user_email}</p>
            <p className="text-sm text-gray-500">Рейтинг: 8/10</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Казино</h3>
            <p className="font-medium">{withdrawal.casino_name}</p>
            <p className="text-sm text-gray-500">{withdrawal.casino_company}</p>
            <button
              onClick={() => {
                if (withdrawal.casino_url) {
                  navigator.clipboard.writeText(withdrawal.casino_url)
                }
              }}
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              Скопировать промо ссылку
            </button>
          </div>
        </div>

        {/* Финансовые детали */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-500">Депозит</p>
              <p className="text-lg font-semibold">{symbol}{withdrawal.deposit_amount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Вывод</p>
              <p className="text-lg font-semibold">{symbol}{withdrawal.withdrawal_amount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Профит</p>
              <p className={`text-lg font-semibold ${profit > 0 ? 'text-success-600' : 'text-danger-600'}`}>
                {symbol}{profit.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Карта */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Карта</h3>
          <div className="space-y-2">
            <div className="font-mono text-sm">{withdrawal.card_mask}</div>
            <div className="text-sm text-gray-600">{withdrawal.bank_name}</div>
            <div className="text-xs text-gray-500">{withdrawal.account_holder}</div>
          </div>
        </div>

        {/* Комментарий */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Комментарий (опционально)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg"
            rows={3}
            placeholder="Добавьте комментарий к решению..."
          />
        </div>

        {/* Действия */}
        <div className="flex gap-3">
          <button
            onClick={() => onAction(withdrawal.id, 'approve', comment)}
            disabled={loading}
            className="btn-success flex-1"
          >
            {loading ? 'Обработка...' : '✓ Одобрить'}
          </button>
          <button
            onClick={() => onAction(withdrawal.id, 'reject', comment)}
            disabled={loading}
            className="btn-danger flex-1"
          >
            {loading ? 'Обработка...' : '✗ Отклонить'}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="btn-secondary"
          >
            Отмена
          </button>
        </div>
      </div>
    </Modal>
  )
}
