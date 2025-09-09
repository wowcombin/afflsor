'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column, ActionButton } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import StatusBadge from '@/components/ui/StatusBadge'
import Modal from '@/components/ui/Modal'
import { 
  BeakerIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  PlusIcon,
  ComputerDesktopIcon,
  BanknotesIcon,
  CreditCardIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

interface TestWork {
  id: string
  casino_id: string
  card_id: string
  deposit_amount: number
  withdrawal_amount: number | null
  status: string
  test_notes: string | null
  registration_time: number | null
  deposit_success: boolean | null
  withdrawal_success: boolean | null
  withdrawal_time: number | null
  issues_found: string[]
  rating: number | null
  created_at: string
  completed_at: string | null
  // Поля для выводов (старые - для совместимости)
  withdrawal_status?: 'new' | 'waiting' | 'received' | 'blocked' | null
  withdrawal_requested_at?: string | null
  withdrawal_notes?: string | null
  // Новые поля для множественных выводов
  withdrawals?: {
    id: string
    withdrawal_amount: number
    withdrawal_status: string
    withdrawal_notes?: string
    requested_at: string
  }[]
  latest_withdrawal?: {
    id: string
    withdrawal_amount: number
    withdrawal_status: string
    withdrawal_notes?: string
    requested_at: string
  } | null
  casino: {
    id: string
    name: string
    url: string
    status: string
    currency?: string
    promo?: string
  }
  card: {
    id: string
    card_number_mask: string
    card_bin: string
    full_card_number?: string
    cvv?: string
    exp_month?: number
    exp_year?: number
    account_balance: number
    account_currency: string
    account_holder?: string
    bank_name?: string
    bank_country?: string
  }
}

interface Casino {
  id: string
  name: string
  url: string
  status: string
  company?: string
  currency?: string
}

interface Card {
  id: string
  card_number_mask: string
  card_bin: string
  full_card_number?: string
  cvv?: string
  exp_month: number
  exp_year: number
  account_balance: number
  account_currency: string
  assigned_casino_id?: string
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
  // Унифицированные поля
  account_holder?: string
  bank_name?: string
  bank_country?: string
}

interface WorkStats {
  totalWorks: number
  activeWorks: number
  completedWorks: number
  successRate: number
  totalDeposits: number
  totalWithdrawals: number
}

export default function TesterWorkPage() {
  const { addToast } = useToast()
  const [works, setWorks] = useState<TestWork[]>([])
  const [casinos, setCasinos] = useState<Casino[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [stats, setStats] = useState<WorkStats>({
    totalWorks: 0,
    activeWorks: 0,
    completedWorks: 0,
    successRate: 0,
    totalDeposits: 0,
    totalWithdrawals: 0
  })
  const [loading, setLoading] = useState(true)
  const [showNewWorkModal, setShowNewWorkModal] = useState(false)
  const [selectedWork, setSelectedWork] = useState<TestWork | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false)
  const [withdrawalData, setWithdrawalData] = useState({
    work_id: '',
    withdrawal_amount: 0,
    notes: ''
  })

  // Форма новой работы  
  const [newWork, setNewWork] = useState<{
    casino_id: string
    card_id: string
    login: string
    password: string
    deposit_amount: number
  }>({
    casino_id: '',
    card_id: '',
    login: '',
    password: '',
    deposit_amount: 100
  })
  const [creating, setCreating] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadWorks()
    loadCasinos()
    loadCards()
  }, [])

  // Автоматический выбор первой карты при выборе казино
  useEffect(() => {
    if (newWork.casino_id && cards.length > 0) {
      const availableCards = cards.filter(card => {
        const isAssignedToCasino = 
          card.assigned_casino_id === newWork.casino_id ||
          card.casino_assignments?.some(a => 
            a.casino_id === newWork.casino_id && a.status === 'active'
          )
        
        // Проверяем нет ли АКТИВНЫХ работ с этой картой для этого казино
        const hasActiveWorkForCasino = works.some((work: TestWork) => 
          work.card_id === card.id && 
          work.casino_id === newWork.casino_id &&
          ['pending', 'in_progress', 'active'].includes(work.status)
        )
        
        return isAssignedToCasino && !hasActiveWorkForCasino
      })
      
      if (availableCards.length > 0 && !newWork.card_id) {
        console.log('🎯 Автоматически выбираем первую карту:', availableCards[0].card_number_mask)
        setNewWork(prev => ({ ...prev, card_id: availableCards[0].id }))
      } else if (availableCards.length === 0 && newWork.card_id) {
        // Сбрасываем выбор карты если для нового казино нет доступных карт
        setNewWork(prev => ({ ...prev, card_id: '' }))
      }
    }
  }, [newWork.casino_id, cards, works])

  async function loadWorks() {
    try {
      const response = await fetch('/api/test-works')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка загрузки работ')
      }

      const { works: worksData } = await response.json()
      
      console.log('📋 Загружены работы:', {
        totalWorks: worksData?.length || 0,
        firstWork: worksData?.[0] ? {
          id: worksData[0].id,
          status: worksData[0].status,
          withdrawal_amount: worksData[0].withdrawal_amount,
          withdrawal_status: worksData[0].withdrawal_status,
          canCreateWithdrawal: worksData[0].status === 'active' && !worksData[0].withdrawal_amount
        } : null
      })
      
      setWorks(worksData || [])

      // Рассчитываем статистику
      const totalWorks = worksData?.length || 0
      const activeWorks = worksData?.filter((w: any) => ['pending', 'in_progress'].includes(w.status)).length || 0
      const completedWorks = worksData?.filter((w: any) => w.status === 'completed').length || 0
      const successfulWorks = worksData?.filter((w: any) => w.rating && w.rating >= 7).length || 0
      const successRate = completedWorks > 0 ? Math.round((successfulWorks / completedWorks) * 100) : 0
      const totalDeposits = worksData?.reduce((sum: number, w: any) => sum + (w.deposit_amount || 0), 0) || 0
      const totalWithdrawals = worksData?.reduce((sum: number, w: any) => sum + (w.withdrawal_amount || 0), 0) || 0

      setStats({
        totalWorks,
        activeWorks,
        completedWorks,
        successRate,
        totalDeposits,
        totalWithdrawals
      })

    } catch (error: any) {
      console.error('Ошибка загрузки работ:', error)
      addToast({
        type: 'error',
        title: 'Ошибка загрузки работ',
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  async function loadCasinos() {
    try {
      // Загружаем все казино для тестирования
      const response = await fetch('/api/casinos')
      
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

  async function loadCards() {
    try {
      const response = await fetch('/api/cards')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка загрузки карт')
      }

      const { cards: cardsData } = await response.json()
      
      console.log('🃏 Загружены карты для работы:', {
        totalCards: cardsData?.length || 0,
        firstCard: cardsData?.[0] ? {
          id: cardsData[0].id,
          mask: cardsData[0].card_number_mask,
          full_number: cardsData[0].full_card_number,
          cvv: cardsData[0].cvv,
          casino_assignments: cardsData[0].casino_assignments?.length || 0,
          assigned_casino_id: cardsData[0].assigned_casino_id
        } : null
      })
      
      // Фильтруем карты назначенные для тестирования и БЕЗ активных работ
      const testingCards = cardsData.filter((card: any) => {
        const isAssigned = (card.casino_assignments && card.casino_assignments.length > 0) || card.assigned_casino_id
        
        // Проверяем нет ли АКТИВНЫХ работ с этой картой (pending, in_progress)
        const hasActiveWork = works.some((work: TestWork) => 
          work.card_id === card.id && ['pending', 'in_progress', 'active'].includes(work.status)
        )
        
        console.log(`🃏 Карта ${card.card_number_mask}:`, {
          isAssigned,
          hasActiveWork,
          activeWorks: works.filter((w: TestWork) => w.card_id === card.id && ['pending', 'in_progress', 'active'].includes(w.status)).map((w: TestWork) => ({
            id: w.id,
            status: w.status,
            casino: w.casino?.name
          })),
          available: isAssigned && !hasActiveWork
        })
        
        return isAssigned && !hasActiveWork
      })
      
      console.log('🎯 Карты для тестирования:', {
        totalTestingCards: testingCards.length,
        testingCards: testingCards.map((c: any) => ({
          mask: c.card_number_mask,
          assignments: c.casino_assignments?.length || 0,
          old_assignment: !!c.assigned_casino_id
        }))
      })
      
      setCards(testingCards || [])

    } catch (error: any) {
      console.error('Ошибка загрузки карт:', error)
    }
  }

  async function handleCreateWork() {
    if (!newWork.casino_id || !newWork.card_id || !newWork.login || !newWork.password || newWork.deposit_amount <= 0) {
      addToast({ type: 'error', title: 'Заполните все обязательные поля' })
      return
    }

    setCreating(true)

    try {
      console.log('🚀 Создание работы:', {
        newWork,
        casino_id: newWork.casino_id,
        card_id: newWork.card_id,
        login: newWork.login,
        password: newWork.password,
        deposit_amount: newWork.deposit_amount
      })

      const response = await fetch('/api/test-works', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newWork)
      })

      console.log('📊 Response status:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      })

      const data = await response.json()
      console.log('📋 Response data:', data)

      if (!response.ok) {
        console.error('❌ Create work error:', data)
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'Работа создана',
        description: data.message
      })

      setShowNewWorkModal(false)
      setNewWork({
        casino_id: '',
        card_id: '',
        login: '',
        password: '',
        deposit_amount: 100
      })
      
      await loadWorks()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка создания работы',
        description: error.message
      })
    } finally {
      setCreating(false)
    }
  }

  function getCurrencySymbol(currency: string) {
    const symbols = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'CAD': 'C$' }
    return symbols[currency as keyof typeof symbols] || currency
  }

  async function handleCreateWithdrawal() {
    if (!withdrawalData.work_id || withdrawalData.withdrawal_amount <= 0) {
      addToast({ type: 'error', title: 'Заполните все поля для вывода' })
      return
    }

    console.log('💰 Отправка запроса на создание вывода:', {
      work_id: withdrawalData.work_id,
      withdrawal_amount: withdrawalData.withdrawal_amount,
      notes: withdrawalData.notes
    })

    try {
      const response = await fetch('/api/test-works/withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_id: withdrawalData.work_id,
          withdrawal_amount: withdrawalData.withdrawal_amount,
          notes: withdrawalData.notes
        })
      })

      console.log('📊 Response от API withdrawal:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      })

      const data = await response.json()
      console.log('📋 Response data:', data)

      if (!response.ok) {
        console.error('❌ Ошибка создания вывода:', data)
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'Вывод создан',
        description: data.message
      })

      setShowWithdrawalModal(false)
      setWithdrawalData({ work_id: '', withdrawal_amount: 0, notes: '' })
      await loadWorks()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка создания вывода',
        description: error.message
      })
    }
  }

  async function handleUpdateWithdrawalStatus(workId: string, newStatus: 'waiting' | 'received' | 'blocked') {
    try {
      const response = await fetch(`/api/test-works/${workId}/withdrawal`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawal_status: newStatus })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'Статус вывода обновлен',
        description: data.message
      })

      await loadWorks()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка обновления статуса',
        description: error.message
      })
    }
  }

  async function handleUpdateRating(workId: string, rating: number) {
    try {
      const response = await fetch(`/api/test-works/${workId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'Рейтинг обновлен',
        description: `Казино оценено на ${rating}/10`
      })

      await loadWorks()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка обновления рейтинга',
        description: error.message
      })
    }
  }

  async function handleDeleteWork(workId: string) {
    try {
      const response = await fetch(`/api/test-works/${workId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'Работа удалена',
        description: data.message
      })

      await loadWorks()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка удаления работы',
        description: error.message
      })
    }
  }

  const columns: Column<TestWork>[] = [
    {
      key: 'casino',
      label: 'Казино',
      sortable: true,
      filterable: true,
      render: (work) => (
        <div>
          <div className="font-medium text-gray-900">{work.casino.name}</div>
          <div className="text-sm text-gray-500">
            {work.casino.promo && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(work.casino.promo!)
                  addToast({ type: 'success', title: 'Промо скопировано!' })
                }}
                className="text-success-600 hover:text-success-800 text-xs"
              >
                📋 Скопировать промо
              </button>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'card',
      label: 'Карта',
      render: (work) => (
        <div>
          <div className="font-mono text-sm font-medium text-gray-900">{work.card.card_number_mask}</div>
          <div className="text-xs text-gray-500 space-y-1">
            <div>
              {work.card.account_holder || 'Имя не указано'} • {work.card.bank_name || 'Банк не указан'}
            </div>
            <div>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch(`/api/cards/${work.card.id}/reveal`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ pin_code: '0000', context: { source: 'test_work' } })
                    })
                    
                    if (response.ok) {
                      const data = await response.json()
                      const cardInfo = `Номер: ${data.card_data.pan}\nCVV: ${data.card_data.cvv}\nСрок: ${data.card_data.exp_month.toString().padStart(2, '0')}/${data.card_data.exp_year}`
                      navigator.clipboard.writeText(cardInfo)
                      addToast({ type: 'success', title: 'Реквизиты карты скопированы!' })
                    } else {
                      addToast({ type: 'error', title: 'Ошибка получения реквизитов' })
                    }
                  } catch (error) {
                    addToast({ type: 'error', title: 'Ошибка получения реквизитов' })
                  }
                }}
                className="text-primary-600 hover:text-primary-800 text-xs"
              >
                👁️ Показать реквизиты
              </button>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'deposit_amount',
      label: 'Депозит',
      align: 'right',
      sortable: true,
      render: (work) => (
        <div className="text-right">
          <div className="font-mono text-gray-900">
            {getCurrencySymbol(work.casino.currency || 'USD')}{work.deposit_amount}
          </div>
          {work.deposit_success !== null && (
            <div className={`text-xs ${work.deposit_success ? 'text-success-600' : 'text-danger-600'}`}>
              {work.deposit_success ? '✅ Успешно' : '❌ Ошибка'}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'withdrawal',
      label: 'Вывод',
      align: 'right',
      render: (work) => {
        if (work.withdrawal_amount) {
          return (
            <div className="text-right">
              <div className="font-mono text-gray-900">
                {getCurrencySymbol(work.casino.currency || 'USD')}{work.withdrawal_amount}
              </div>
              {work.withdrawal_status && (
                <div className="mt-1 space-y-1">
                  <div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      work.withdrawal_status === 'new' ? 'bg-blue-100 text-blue-800' :
                      work.withdrawal_status === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
                      work.withdrawal_status === 'received' ? 'bg-green-100 text-green-800' :
                      work.withdrawal_status === 'blocked' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {work.withdrawal_status === 'new' ? '🆕 Новый' :
                       work.withdrawal_status === 'waiting' ? '⏳ В ожидании' :
                       work.withdrawal_status === 'received' ? '✅ Получен' :
                       work.withdrawal_status === 'blocked' ? '🚫 Блок' :
                       work.withdrawal_status}
                    </span>
                  </div>
                  <div>
                    <button
                      onClick={() => {
                        setWithdrawalData({ ...withdrawalData, work_id: work.id })
                        setShowWithdrawalModal(true)
                      }}
                      className="btn-secondary text-xs"
                      title="Добавить дополнительный вывод"
                    >
                      + Новый вывод
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        }
        return (
          <div className="text-right space-y-1">
            <button
              onClick={() => {
                console.log('🎯 Открытие модала вывода для работы:', {
                  workId: work.id,
                  status: work.status,
                  withdrawal_amount: work.withdrawal_amount,
                  canCreate: !work.withdrawal_amount
                })
                setWithdrawalData({ ...withdrawalData, work_id: work.id })
                setShowWithdrawalModal(true)
              }}
              className="btn-primary text-xs"
              title="Создать новый вывод"
            >
              Создать вывод
            </button>

          </div>
        )
      }
    },
    {
      key: 'workflow_status',
      label: 'Статус',
      sortable: true,
      render: (work) => {
        // Логика статусов: Депозит → Вывод → Статус вывода
        if (!work.deposit_success) {
          // Депозит еще не сделан или не успешен
          return (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              💳 Депозит
            </span>
          )
        } else if (!work.withdrawal_amount && !work.latest_withdrawal) {
          // Депозит успешен, но вывода нет
          return (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              💰 Вывод
            </span>
          )
        } else if (work.latest_withdrawal) {
          // Есть вывод - показываем его статус
          const withdrawalStatus = work.latest_withdrawal.withdrawal_status
          return (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              withdrawalStatus === 'new' ? 'bg-blue-100 text-blue-800' :
              withdrawalStatus === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
              withdrawalStatus === 'received' ? 'bg-green-100 text-green-800' :
              withdrawalStatus === 'blocked' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {withdrawalStatus === 'new' ? '🆕 Новый' :
               withdrawalStatus === 'waiting' ? '⏳ Ожидает' :
               withdrawalStatus === 'received' ? '✅ Подтвержден' :
               withdrawalStatus === 'blocked' ? '🚫 Блок' :
               withdrawalStatus}
            </span>
          )
        } else {
          // Fallback - показываем общий статус работы
          return <StatusBadge status={work.status} />
        }
      }
    },
    {
      key: 'rating',
      label: 'Рейтинг',
      render: (work) => {
        if (work.rating) {
          const stars = '⭐'.repeat(Math.floor(work.rating / 2))
          const color = work.rating >= 8 ? 'text-green-600' : work.rating >= 6 ? 'text-yellow-600' : 'text-red-600'
          
          return (
            <div className="text-center">
              <div className={`font-medium ${color}`}>{work.rating}/10</div>
              <div className="text-xs">{stars}</div>
            </div>
          )
        }
        return (
          <div className="text-center">
            <button
              onClick={() => {
                const rating = prompt('Оценка казино (1-10):')
                if (rating && !isNaN(Number(rating)) && Number(rating) >= 1 && Number(rating) <= 10) {
                  handleUpdateRating(work.id, Number(rating))
                }
              }}
              className="text-xs text-primary-600 hover:text-primary-800"
            >
              ⭐ Оценить
            </button>
          </div>
        )
      }
    },
    {
      key: 'created_at',
      label: 'Время',
      sortable: true,
      render: (work) => {
        const createdDate = new Date(work.created_at)
        const now = new Date()
        const diffMinutes = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60))
        
        // Форматируем время в удобном виде
        const formatTimeAgo = (minutes: number) => {
          if (minutes < 60) return `${minutes} мин назад`
          if (minutes < 1440) return `${Math.floor(minutes / 60)} ч назад`
          return `${Math.floor(minutes / 1440)} дн назад`
        }
        
        return (
          <div className="text-sm">
            <div className="text-gray-900">{createdDate.toLocaleDateString('ru-RU')}</div>
            <div className="text-xs text-gray-500">{formatTimeAgo(diffMinutes)}</div>
            {work.withdrawal_time && (
              <div className="text-xs text-blue-600">Вывод: {work.withdrawal_time} мин</div>
            )}
          </div>
        )
      }
    }
  ]

  const actions: ActionButton<TestWork>[] = [
    {
      label: 'Детали',
      action: (work) => {
        setSelectedWork(work)
        setShowDetailsModal(true)
      },
      variant: 'secondary'
    },
    {
      label: 'Удалить',
      action: async (work) => {
        if (!confirm(`Удалить работу для казино "${work.casino.name}"?`)) return
        
        try {
          const response = await fetch(`/api/test-works/${work.id}`, {
            method: 'DELETE'
          })
          
          if (response.ok) {
            addToast({ type: 'success', title: 'Работа удалена' })
            await loadWorks()
          } else {
            const errorData = await response.json()
            addToast({ type: 'error', title: 'Ошибка удаления работы', description: errorData.error })
          }
        } catch (error) {
          addToast({ type: 'error', title: 'Ошибка удаления работы' })
        }
      },
      variant: 'danger',
      condition: (work) => work.status === 'pending'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Тестовые работы</h1>
          <p className="text-gray-600">Создание и управление тестами казино</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => window.location.href = '/dashboard/tester/cards'}
            className="btn-info"
          >
            <CreditCardIcon className="h-5 w-5 mr-2" />
            Управление картами
          </button>
          <button
            onClick={() => setShowNewWorkModal(true)}
            className="btn-primary"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Новая работа
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <KPICard
          title="Всего работ"
          value={stats.totalWorks}
          icon={<BeakerIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Активные"
          value={stats.activeWorks}
          icon={<PlayIcon className="h-6 w-6" />}
          color="warning"
        />
        <KPICard
          title="Завершены"
          value={stats.completedWorks}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="success"
        />
        <KPICard
          title="Успешность"
          value={`${stats.successRate}%`}
          icon={<span className="text-xl">📊</span>}
          color="success"
        />
        <KPICard
          title="Депозитов"
          value={`$${stats.totalDeposits}`}
          icon={<BanknotesIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Выводов"
          value={`$${stats.totalWithdrawals}`}
          icon={<BanknotesIcon className="h-6 w-6" />}
          color="success"
        />
      </div>

      {/* Таблица работ */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">
            Тестовые работы ({works.length})
          </h3>
        </div>
        
        <DataTable
          data={works}
          columns={columns}
          actions={actions}
          loading={loading}
          pagination={{ pageSize: 20 }}
          filtering={true}
          exportable={true}
          emptyMessage="Тестовые работы не найдены"
        />
      </div>

      {/* Modal создания новой работы */}
      <Modal
        isOpen={showNewWorkModal}
        onClose={() => {
          setShowNewWorkModal(false)
          setNewWork({
            casino_id: '',
            card_id: '',
            login: '',
            password: '',
            deposit_amount: 100
          })
        }}
        title="Создать новую тестовую работу"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="form-label">Выберите казино *</label>
            <input
              type="text"
              placeholder="Поиск казино..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input mb-2"
            />
            <select
              value={newWork.casino_id}
              onChange={(e) => setNewWork({ ...newWork, casino_id: e.target.value })}
              className="form-input"
              size={6}
            >

              {casinos
                .filter(casino => 
                  searchTerm === '' || 
                  casino.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (casino.company && casino.company.toLowerCase().includes(searchTerm.toLowerCase()))
                )
                .map(casino => (
                  <option key={casino.id} value={casino.id}>
                    {casino.status === 'approved' ? '✅' : casino.status === 'testing' ? '🧪' : casino.status === 'new' ? '🆕' : '🚫'} {casino.name} {casino.company && `(${casino.company})`}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="form-label">Карта для тестирования *</label>
            <select
              value={newWork.card_id}
              onChange={(e) => setNewWork({ ...newWork, card_id: e.target.value })}
              className="form-input"
            >
              {cards
                .filter(card => {
                  if (!newWork.casino_id) return true // Показываем все если казино не выбрано
                  
                  // Проверяем назначение на выбранное казино
                  const isAssignedToCasino = 
                    card.assigned_casino_id === newWork.casino_id ||
                    card.casino_assignments?.some(a => 
                      a.casino_id === newWork.casino_id && a.status === 'active'
                    )
                  
                  // Проверяем нет ли АКТИВНЫХ работ с этой картой для этого казино
                  const hasActiveWorkForCasino = works.some((work: TestWork) => 
                    work.card_id === card.id && 
                    work.casino_id === newWork.casino_id &&
                    ['pending', 'in_progress', 'active'].includes(work.status)
                  )
                  
                  return isAssignedToCasino && !hasActiveWorkForCasino
                })
                .map(card => (
                  <option key={card.id} value={card.id}>
                    {card.card_number_mask} - {card.bank_name || card.bank_account?.bank?.name} ({getCurrencySymbol(card.account_currency)}{(card.account_balance || 0).toFixed(2)})
                  </option>
                ))
              }
            </select>
            
            {/* Предупреждение если нет доступных карт для выбранного казино */}
            {newWork.casino_id && cards.filter(card => {
              const isAssignedToCasino = 
                card.assigned_casino_id === newWork.casino_id ||
                card.casino_assignments?.some(a => 
                  a.casino_id === newWork.casino_id && a.status === 'active'
                )
              
              const hasActiveWorkForCasino = works.some((work: TestWork) => 
                work.card_id === card.id && 
                work.casino_id === newWork.casino_id &&
                ['pending', 'in_progress', 'active'].includes(work.status)
              )
              
              return isAssignedToCasino && !hasActiveWorkForCasino
            }).length === 0 && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-yellow-800 text-sm">
                  ⚠️ Нет карт назначенных на это казино. Назначьте карты в разделе "Карты".
                </div>
              </div>
            )}
            
            {/* Отображение полных данных выбранной карты */}
            {newWork.card_id && (() => {
              const selectedCard = cards.find(c => c.id === newWork.card_id)
              if (!selectedCard) return null
              
              return (
                <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-3">🃏 Полные реквизиты карты</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-blue-700">Номер карты:</span>
                      <div className="font-mono text-lg text-blue-900">
                        {selectedCard.full_card_number || selectedCard.card_number_mask}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700">Имя аккаунта:</span>
                      <div className="text-blue-900">{selectedCard.account_holder || selectedCard.bank_account?.holder_name || 'Не указано'}</div>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700">Срок действия:</span>
                      <div className="font-mono text-blue-900">
                        {selectedCard.exp_month.toString().padStart(2, '0')}/{selectedCard.exp_year}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700">CVV код:</span>
                      <div className="font-mono text-blue-900">
                        {selectedCard.cvv || '***'}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700">Баланс:</span>
                      <div className="font-medium text-green-600">
                        {getCurrencySymbol(selectedCard.account_currency)}{(selectedCard.account_balance || 0).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700">Банк:</span>
                      <div className="text-blue-900">
                        {selectedCard.bank_name || selectedCard.bank_account?.bank?.name} 
                        {selectedCard.bank_country && ` (${selectedCard.bank_country})`}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
            
            <p className="text-xs text-gray-500 mt-1">
              Показываются карты назначенные для выбранного казино. Первая карта выбирается автоматически.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Логин в казино *</label>
              <input
                type="text"
                value={newWork.login}
                onChange={(e) => setNewWork({ ...newWork, login: e.target.value })}
                className="form-input"
                placeholder="testuser123"
                required
              />
            </div>
            <div>
              <label className="form-label">Пароль *</label>
              <input
                type="text"
                value={newWork.password}
                onChange={(e) => setNewWork({ ...newWork, password: e.target.value })}
                className="form-input"
                placeholder="password123"
                required
              />
            </div>
          </div>

          <div>
            <label className="form-label">Сумма депозита *</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={newWork.deposit_amount}
                onChange={(e) => setNewWork({ ...newWork, deposit_amount: parseFloat(e.target.value) || 0 })}
                className="form-input flex-1"
                placeholder="100"
                min="1"
                step="0.01"
              />
              <span className="text-sm text-gray-500 w-20">
                {newWork.casino_id ? 
                  (casinos.find(c => c.id === newWork.casino_id)?.currency || 'USD') : 
                  'Валюта'
                }
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Сумма указывается в валюте выбранного казино
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => {
                setShowNewWorkModal(false)
                setNewWork({
                  casino_id: '',
                  card_id: '',
                  login: '',
                  password: '',
                  deposit_amount: 100
                })
              }}
              className="btn-secondary"
              disabled={creating}
            >
              Отмена
            </button>
            <button
              onClick={handleCreateWork}
              className="btn-primary"
              disabled={creating || !newWork.casino_id || !newWork.card_id || !newWork.login || !newWork.password || newWork.deposit_amount <= 0}
            >
              {creating ? 'Создание...' : 'Создать работу'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal деталей работы */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false)
          setSelectedWork(null)
        }}
        title={`Детали работы: ${selectedWork?.casino.name}`}
        size="lg"
      >
        {selectedWork && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Информация о работе</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Казино:</span>
                  <div className="text-gray-900">{selectedWork.casino.name}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Карта:</span>
                  <div className="text-gray-900 font-mono">{selectedWork.card.card_number_mask}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Депозит:</span>
                  <div className="text-gray-900">${selectedWork.deposit_amount}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Статус:</span>
                  <div><StatusBadge status={selectedWork.status} size="sm" /></div>
                </div>
              </div>
            </div>

            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <h4 className="font-medium text-primary-900 mb-2">🚧 Интерфейс в разработке</h4>
              <p className="text-sm text-primary-800">
                Полный интерфейс управления тестовыми работами будет реализован в следующих версиях.
                Включая: обновление статуса, добавление выводов, оценку казино, заметки и отчеты.
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal создания вывода */}
      <Modal
        isOpen={showWithdrawalModal}
        onClose={() => {
          setShowWithdrawalModal(false)
          setWithdrawalData({ work_id: '', withdrawal_amount: 0, notes: '' })
        }}
        title="Создать вывод"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-info-50 border border-info-200 rounded-lg p-3">
            <div className="text-sm text-info-800">
              <p className="font-medium">💰 Создание вывода</p>
              <p>Укажите сумму и детали для вывода средств</p>
            </div>
          </div>

          <div>
            <label className="form-label">Сумма вывода *</label>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-medium">
                {(() => {
                  const selectedWork = works.find(w => w.id === withdrawalData.work_id)
                  return getCurrencySymbol(selectedWork?.casino?.currency || 'USD')
                })()}
              </span>
              <input
                type="number"
                value={withdrawalData.withdrawal_amount}
                onChange={(e) => setWithdrawalData({ ...withdrawalData, withdrawal_amount: parseFloat(e.target.value) || 0 })}
                className="form-input flex-1"
                placeholder="100.00"
                min="1"
                step="0.01"
                required
              />
              <span className="text-sm text-gray-500">
                {(() => {
                  const selectedWork = works.find(w => w.id === withdrawalData.work_id)
                  return selectedWork?.casino?.currency || 'USD'
                })()}
              </span>
            </div>
            {(() => {
              const selectedWork = works.find(w => w.id === withdrawalData.work_id)
              return selectedWork?.casino ? (
                <p className="text-xs text-gray-500 mt-1">
                  Сумма указывается в валюте казино "{selectedWork.casino.name}" ({selectedWork.casino.currency || 'USD'})
                </p>
              ) : null
            })()}
          </div>

          <div>
            <label className="form-label">Заметки</label>
            <textarea
              value={withdrawalData.notes}
              onChange={(e) => setWithdrawalData({ ...withdrawalData, notes: e.target.value })}
              className="form-input"
              placeholder="Дополнительная информация о выводе..."
              rows={3}
            />
          </div>

          <div className="bg-warning-50 border border-warning-200 rounded-lg p-3">
            <div className="text-sm text-warning-800">
              <p className="font-medium">⚠️ Статусы вывода</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li><span className="font-medium text-blue-700">Новый</span> - вывод создан, ожидает обработки</li>
                <li><span className="font-medium text-yellow-700">В ожидании</span> - отправлен на проверку</li>
                <li><span className="font-medium text-green-700">Получен</span> - вывод успешно получен</li>
                <li><span className="font-medium text-red-700">Блок</span> - вывод заблокирован</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowWithdrawalModal(false)}
              className="btn-secondary"
            >
              Отмена
            </button>
            <button
              onClick={handleCreateWithdrawal}
              className="btn-primary"
              disabled={withdrawalData.withdrawal_amount <= 0}
            >
              Создать вывод
            </button>
          </div>
        </div>
      </Modal>

      {/* Инструкции */}
      <div className="bg-success-50 border border-success-200 rounded-lg p-6">
        <h3 className="font-medium text-success-900 mb-3">🧪 Процесс тестирования</h3>
        <div className="text-sm text-success-800 space-y-2">
          <div>• <strong>Назначьте карты</strong> для тестирования на странице "Карты"</div>
          <div>• <strong>Создайте работу</strong> выбрав казино и карту</div>
          <div>• <strong>Выполните депозит</strong> в выбранном казино</div>
          <div>• <strong>Протестируйте игру</strong> и функции казино</div>
          <div>• <strong>Сделайте вывод</strong> и зафиксируйте время</div>
          <div>• <strong>Оцените казино</strong> и опишите найденные проблемы</div>
        </div>
      </div>
    </div>
  )
}
