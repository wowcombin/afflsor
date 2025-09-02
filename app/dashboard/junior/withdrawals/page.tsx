'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column, ActionButton } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import StatusBadge from '@/components/ui/StatusBadge'
import { 
  ClockIcon,
  BanknotesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  TrashIcon
} from '@heroicons/react/24/outline'

interface Work {
  id: string
  deposit_amount: number
  status: string
  created_at: string
  casino_login: string
  casino_password: string
  notes: string | null
  work_date: string
  casino_name: string
  casino_currency: string
  casino_promo: string | null
  card_mask: string
  card_type: string
  bank_name: string
  bank_account_holder: string
  withdrawals: WorkWithdrawal[]
}

interface WorkWithdrawal {
  id: string
  withdrawal_amount: number
  status: string
  created_at: string
  checked_at: string | null
}

interface WorkStats {
  totalWorks: number
  activeWorks: number
  completedWorks: number
  totalDeposits: number
  totalWithdrawals: number
}

// Новый интерфейс для строк таблицы (работа + вывод)
interface WorkRow {
  id: string
  work_id: string
  casino_name: string
  casino_currency: string
  casino_promo: string | null
  casino_login: string
  casino_password: string
  notes: string | null
  work_date: string
  created_at: string
  deposit_amount: number
  work_status: string
  card_mask: string
  card_type: string
  bank_name: string
  bank_account_holder: string
  withdrawal?: WorkWithdrawal
  is_deposit_row: boolean // true для строки депозита, false для строки вывода
}

export default function JuniorWithdrawalsPage() {
  const { addToast } = useToast()
  const [works, setWorks] = useState<Work[]>([])
  const [workRows, setWorkRows] = useState<WorkRow[]>([])
  const [stats, setStats] = useState<WorkStats>({
    totalWorks: 0,
    activeWorks: 0,
    completedWorks: 0,
    totalDeposits: 0,
    totalWithdrawals: 0
  })
  const [loading, setLoading] = useState(true)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [exchangeRates, setExchangeRates] = useState<any>(null)

  useEffect(() => {
    loadExchangeRates()
    loadWorks()
  }, [])

  // Загрузка курсов валют
  async function loadExchangeRates() {
    try {
      const response = await fetch('/api/currency-rates')
      if (response.ok) {
        const data = await response.json()
        setExchangeRates(data.rates)
      }
    } catch (error) {
      console.error('Ошибка загрузки курсов валют:', error)
      // Используем fallback курсы
      setExchangeRates({
        'USD': 1.0,
        'EUR': 1.11,
        'GBP': 1.31,
        'CAD': 0.71
      })
    }
  }

  // Функция конвертации в USD
  function convertToUSD(amount: number, currency: string): number {
    if (!exchangeRates || currency === 'USD') return amount
    const rate = exchangeRates[currency] || 1
    return amount * rate
  }

  // Закрываем dropdown при клике вне его
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (openDropdown && !(event.target as Element).closest('.status-dropdown')) {
        setOpenDropdown(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openDropdown])

  // Функция для создания строк таблицы из работ
  function createWorkRows(works: Work[]): WorkRow[] {
    const rows: WorkRow[] = []
    
    works.forEach(work => {
      if (work.withdrawals.length === 0) {
        // Если нет выводов, создаем только строку депозита
        const depositRow: WorkRow = {
          id: `${work.id}-deposit`,
          work_id: work.id,
          casino_name: work.casino_name,
          casino_currency: work.casino_currency,
          casino_promo: work.casino_promo,
          casino_login: work.casino_login,
          casino_password: work.casino_password,
          notes: work.notes,
          work_date: work.work_date,
          created_at: work.created_at,
          deposit_amount: work.deposit_amount,
          work_status: work.status,
          card_mask: work.card_mask,
          card_type: work.card_type,
          bank_name: work.bank_name,
          bank_account_holder: work.bank_account_holder,
          is_deposit_row: true
        }
        rows.push(depositRow)
      } else {
        // Если есть выводы, первый вывод объединяем с депозитом
        const firstWithdrawal = work.withdrawals[0]
        const depositWithFirstWithdrawalRow: WorkRow = {
          id: `${work.id}-deposit-with-first-withdrawal`,
          work_id: work.id,
          casino_name: work.casino_name,
          casino_currency: work.casino_currency,
          casino_promo: work.casino_promo,
          casino_login: work.casino_login,
          casino_password: work.casino_password,
          notes: work.notes,
          work_date: work.work_date,
          created_at: work.created_at,
          deposit_amount: work.deposit_amount,
          work_status: work.status,
          card_mask: work.card_mask,
          card_type: work.card_type,
          bank_name: work.bank_name,
          bank_account_holder: work.bank_account_holder,
          withdrawal: firstWithdrawal,
          is_deposit_row: true // Остается строкой депозита, но с первым выводом
        }
        rows.push(depositWithFirstWithdrawalRow)
        
        // Создаем строки для дополнительных выводов (начиная со второго)
        work.withdrawals.slice(1).forEach(withdrawal => {
          const additionalWithdrawalRow: WorkRow = {
            id: `${work.id}-additional-withdrawal-${withdrawal.id}`,
            work_id: work.id,
            casino_name: work.casino_name,
            casino_currency: work.casino_currency,
            casino_promo: work.casino_promo,
            casino_login: work.casino_login,
            casino_password: work.casino_password,
            notes: work.notes,
            work_date: work.work_date,
            created_at: withdrawal.created_at, // Используем дату создания вывода
            deposit_amount: 0, // Для дополнительных выводов депозит = 0
            work_status: work.status,
            card_mask: work.card_mask,
            card_type: work.card_type,
            bank_name: work.bank_name,
            bank_account_holder: work.bank_account_holder,
            withdrawal: withdrawal,
            is_deposit_row: false
          }
          rows.push(additionalWithdrawalRow)
        })
      }
    })
    
    // Сортируем строки по дате создания (новые сверху)
    return rows.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return dateB - dateA // Убывающий порядок (новые сверху)
    })
  }

  async function loadWorks() {
    try {
      const response = await fetch('/api/works')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка загрузки работ')
      }

      const { works: worksData } = await response.json()
      
      // Форматируем данные для интерфейса
      const formattedWorks = worksData.map((w: any) => ({
        id: w.id,
        deposit_amount: w.deposit_amount,
        status: w.status,
        created_at: w.created_at,
        casino_login: w.casino_login,
        casino_password: w.casino_password,
        notes: w.notes,
        work_date: w.work_date,
        casino_name: w.casinos?.name || 'Неизвестное казино',
        casino_currency: w.casinos?.currency || 'USD',
        casino_promo: w.casinos?.promo || null,
        card_mask: w.cards?.card_number_mask || 'Неизвестная карта',
        card_type: w.cards?.card_type || 'Неизвестный тип',
        bank_name: w.cards?.bank_account?.bank?.name || 'Неизвестный банк',
        bank_account_holder: w.cards?.bank_account?.holder_name || 'Неизвестный аккаунт',
        withdrawals: w.work_withdrawals || []
      }))

      setWorks(formattedWorks)
      
      // Создаем строки таблицы
      const rows = createWorkRows(formattedWorks)
      setWorkRows(rows)

      // Рассчитываем статистику
      const totalWorks = formattedWorks.length
      const activeWorks = formattedWorks.filter((w: Work) => w.status === 'active').length
      const completedWorks = formattedWorks.filter((w: Work) => w.status === 'completed').length
      
      // Конвертируем все депозиты в USD по курсу Google -5%
      const totalDeposits = formattedWorks.reduce((sum: number, w: Work) => {
        const depositInUSD = convertToUSD(w.deposit_amount, w.casino_currency)
        return sum + depositInUSD
      }, 0)
      
      const totalWithdrawals = formattedWorks.reduce((sum: number, w: Work) => 
        sum + w.withdrawals.filter((wd: WorkWithdrawal) => wd.status === 'received').length, 0)

      setStats({
        totalWorks,
        activeWorks,
        completedWorks,
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

  // Функция для создания вывода
  async function createWithdrawal(workId: string, amount: number) {
    try {
      const response = await fetch('/api/work-withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_id: workId,
          withdrawal_amount: amount
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка создания вывода')
      }

      addToast({
        type: 'success',
        title: 'Вывод создан',
        description: 'Вывод добавлен в очередь на проверку'
      })

      // Перезагружаем данные
      loadWorks()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка создания вывода',
        description: error.message
      })
    }
  }

  // Функция для изменения статуса вывода
  async function updateWithdrawalStatus(withdrawalId: string, newStatus: string) {
    try {
      const response = await fetch(`/api/work-withdrawals/${withdrawalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка изменения статуса')
      }

      addToast({
        type: 'success',
        title: 'Статус изменен',
        description: `Статус вывода изменен на "${newStatus}"`
      })

      // Перезагружаем данные
      loadWorks()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка изменения статуса',
        description: error.message
      })
    }
  }

  // Функция для удаления работы
  async function deleteWork(workId: string, workName: string) {
    if (!confirm(`Вы уверены, что хотите удалить работу с ${workName}? Это действие нельзя отменить.`)) {
      return
    }

    try {
      const response = await fetch(`/api/works/${workId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка удаления работы')
      }

      addToast({
        type: 'success',
        title: 'Работа удалена',
        description: 'Работа успешно удалена'
      })

      // Перезагружаем данные
      loadWorks()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка удаления работы',
        description: error.message
      })
    }
  }

  // Функция для изменения статуса работы
  async function updateWorkStatus(workId: string, newStatus: string, workName: string) {
    try {
      const response = await fetch(`/api/works/${workId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка изменения статуса')
      }

      addToast({
        type: 'success',
        title: 'Статус работы изменен',
        description: `Статус работы с ${workName} изменен на "${newStatus}"`
      })

      // Перезагружаем данные
      loadWorks()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка изменения статуса работы',
        description: error.message
      })
    }
  }

  // Функция для удаления вывода
  async function deleteWithdrawal(withdrawalId: string, casinoName: string) {
    try {
      const response = await fetch(`/api/work-withdrawals/${withdrawalId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка удаления вывода')
      }

      addToast({
        type: 'success',
        title: 'Вывод удален',
        description: `Вывод для ${casinoName} успешно удален`
      })

      // Перезагружаем данные
      loadWorks()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка удаления вывода',
        description: error.message
      })
    }
  }

  // Функция для копирования промо
  function copyPromo(casinoName: string, promo: string | null) {
    if (!promo) {
      addToast({
        type: 'warning',
        title: 'Промо не найдено',
        description: `У казино ${casinoName} нет промо-кода`
      })
      return
    }

    navigator.clipboard.writeText(promo).then(() => {
      addToast({
        type: 'success',
        title: 'Промо скопировано',
        description: `Промо-код ${promo} скопирован в буфер обмена`
      })
    }).catch(() => {
      addToast({
        type: 'error',
        title: 'Ошибка копирования',
        description: 'Не удалось скопировать промо-код'
      })
    })
  }

  // Функция для форматирования времени
  function formatTimeAgo(dateString: string) {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffWeeks = Math.floor(diffDays / 7)
    const diffMonths = Math.floor(diffDays / 30)
    const diffYears = Math.floor(diffDays / 365)

    if (diffMinutes < 60) {
      return `${diffMinutes} мин назад`
    } else if (diffHours < 24) {
      return `${diffHours} ч назад`
    } else if (diffDays < 7) {
      return `${diffDays} д назад`
    } else if (diffWeeks < 4) {
      return `${diffWeeks} нед назад`
    } else if (diffMonths < 12) {
      return `${diffMonths} мес назад`
    } else {
      return `${diffYears} г назад`
    }
  }

  const columns: Column<WorkRow>[] = [
    {
      key: 'casino_info',
      label: 'Казино',
      render: (work) => (
        <div>
          <div 
            className="casino-name"
            onClick={() => copyPromo(work.casino_name, work.casino_promo)}
            title={work.casino_promo ? `Кликните для копирования промо: ${work.casino_promo}` : 'Промо не указано'}
          >
            {work.casino_name}
          </div>
          <div className="login-info">
            {work.casino_login} : {work.casino_password}
          </div>
        </div>
      )
    },
    {
      key: 'amount',
      label: 'Сумма',
      render: (row) => (
        <div className="deposit-amount">
          {row.is_deposit_row ? (
            <div>
              <span className="text-red-600">
                -{row.deposit_amount} {row.casino_currency}
        </span>
              {row.withdrawal && (
                <div className="text-green-600 text-sm">
                  +{row.withdrawal.withdrawal_amount} {row.casino_currency}
                </div>
              )}
            </div>
          ) : (
            <span className="text-green-600">
              +{row.withdrawal?.withdrawal_amount || 0} {row.casino_currency}
        </span>
          )}
        </div>
      )
    },
    {
      key: 'card_info',
      label: 'Карта',
      render: (work) => (
        <div className="card-info">
          <div className="font-medium">{work.card_mask}</div>
          <div className="text-sm text-gray-500">{work.bank_name}</div>
          <div className="bank-account">Аккаунт: {work.bank_account_holder}</div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Статус',
      render: (row) => {
        // Для строк депозита
        if (row.is_deposit_row) {
          // Если есть вывод в этой строке, показываем его статус
          if (row.withdrawal) {
            return (
              <div className="status-dropdown">
                <div 
                  onClick={() => setOpenDropdown(openDropdown === `withdrawal-${row.withdrawal!.id}` ? null : `withdrawal-${row.withdrawal!.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <StatusBadge status={row.withdrawal.status} />
                </div>
                {openDropdown === `withdrawal-${row.withdrawal.id}` && (
                  <div className="status-dropdown-content" style={{ display: 'block' }}>
                    <a onClick={() => {
                      updateWithdrawalStatus(row.withdrawal!.id, 'new')
                      setOpenDropdown(null)
                    }}>
                      Новый
                    </a>
                    <a onClick={() => {
                      updateWithdrawalStatus(row.withdrawal!.id, 'waiting')
                      setOpenDropdown(null)
                    }}>
                      В ожидании
                    </a>
                    <a onClick={() => {
                      updateWithdrawalStatus(row.withdrawal!.id, 'block')
                      setOpenDropdown(null)
                    }}>
                      Заблокирован
                    </a>

                  </div>
                )}
              </div>
            )
          } else {
            // Если нет вывода, показываем возможность создать
            return (
              <div className="status-dropdown">
                <div 
                  onClick={() => setOpenDropdown(openDropdown === `new-${row.work_id}` ? null : `new-${row.work_id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <StatusBadge status="new" />
                </div>
                {openDropdown === `new-${row.work_id}` && (
                  <div className="status-dropdown-content" style={{ display: 'block' }}>
                    <a onClick={() => {
                      const amount = prompt(`Введите сумму вывода для ${row.casino_name} (${row.casino_currency}):`)
                      if (amount && !isNaN(Number(amount)) && Number(amount) > 0) {
                        createWithdrawal(row.work_id, Number(amount))
                        setOpenDropdown(null)
                      }
                    }}>
                      Создать вывод
                    </a>
                  </div>
                )}
              </div>
            )
          }
        }

        // Для строк дополнительных выводов показываем статус вывода
        if (row.withdrawal) {
          return (
            <div className="status-dropdown">
              <div 
                onClick={() => setOpenDropdown(openDropdown === `withdrawal-${row.withdrawal!.id}` ? null : `withdrawal-${row.withdrawal!.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <StatusBadge status={row.withdrawal.status} />
              </div>
              {openDropdown === `withdrawal-${row.withdrawal.id}` && (
                <div className="status-dropdown-content" style={{ display: 'block' }}>
                  <a onClick={() => {
                    updateWithdrawalStatus(row.withdrawal!.id, 'new')
                    setOpenDropdown(null)
                  }}>
                    Новый
                  </a>
                  <a onClick={() => {
                    updateWithdrawalStatus(row.withdrawal!.id, 'waiting')
                    setOpenDropdown(null)
                  }}>
                    В ожидании
                  </a>
                  <a onClick={() => {
                    updateWithdrawalStatus(row.withdrawal!.id, 'block')
                    setOpenDropdown(null)
                  }}>
                    Заблокирован
                  </a>

                </div>
              )}
            </div>
          )
        }

        return <StatusBadge status="new" />
      }
    },
    {
      key: 'date_info',
      label: 'Дата',
      render: (work) => (
        <div>
          <div className="text-sm">{new Date(work.created_at).toLocaleDateString('ru-RU')}</div>
          <div className="text-xs text-gray-500">{formatTimeAgo(work.created_at)}</div>
        </div>
      )
    }
  ]

  // Добавляем колонку с действиями
  const actionsColumn: Column<WorkRow> = {
    key: 'actions',
    label: 'Действия',
    render: (row) => {
      // Для строк депозита показываем основные действия
      if (row.is_deposit_row) {

      const work = works.find(w => w.id === row.work_id)
      if (!work) return null

      return (
        <div className="flex items-center space-x-2">
          {/* Кнопка создания первого вывода */}
          {work.withdrawals.length === 0 && work.status === 'active' && (
            <CurrencyDollarIcon
              className="action-icon withdraw"
              title="Создать вывод"
              onClick={() => {
                const amount = prompt(`Введите сумму вывода для ${row.casino_name} (${row.casino_currency}):`)
                if (amount && !isNaN(Number(amount)) && Number(amount) > 0) {
                  createWithdrawal(row.work_id, Number(amount))
                }
              }}
            />
          )}
          
          {/* Кнопка создания дополнительного вывода */}
          {work.withdrawals.length > 0 && work.status === 'active' && (
            <div className="flex items-center">
              <span className="text-xs text-gray-500 mr-1">+</span>
              <CurrencyDollarIcon
                className="action-icon withdraw"
                title="Добавить еще один вывод"
                onClick={() => {
                  const amount = prompt(`Введите сумму дополнительного вывода для ${row.casino_name} (${row.casino_currency}):`)
                  if (amount && !isNaN(Number(amount)) && Number(amount) > 0) {
                    createWithdrawal(row.work_id, Number(amount))
                  }
                }}
              />
            </div>
          )}
          
          {work.status !== 'completed' && work.withdrawals.every(w => !['received', 'waiting'].includes(w.status)) && (
            <TrashIcon
              className="action-icon delete"
              title="Удалить работу"
              onClick={() => deleteWork(row.work_id, row.casino_name)}
            />
          )}
        </div>
      )
      }

      // Для строк дополнительных выводов - показываем крестик удаления если статус "new"
      if (!row.is_deposit_row && row.withdrawal && row.withdrawal.status === 'new') {
        return (
          <div className="flex items-center space-x-2">
            <TrashIcon
              className="action-icon delete"
              title="Удалить вывод"
              onClick={() => {
                if (confirm(`Удалить вывод на сумму ${row.withdrawal!.withdrawal_amount} ${row.casino_currency}?`)) {
                  deleteWithdrawal(row.withdrawal!.id, row.casino_name)
                }
              }}
            />
          </div>
        )
      }

      return null
    }
  }

  // Добавляем колонку действий к основным колонкам
  const allColumns = [...columns, actionsColumn]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="container-main">
      <div className="flex justify-between items-center mb-6">
      <div>
          <h1 className="text-2xl font-bold text-gray-900">Мои работы и выводы</h1>
          <p className="text-gray-600">Управление депозитами и выводами средств</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
        <KPICard
          title="Всего работ"
          value={stats.totalWorks}
          icon={<BanknotesIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Активные"
          value={stats.activeWorks}
          icon={<ClockIcon className="h-6 w-6" />}
          color="warning"
        />
        <KPICard
          title="Завершенные"
          value={stats.completedWorks}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="success"
        />
        <KPICard
          title="Общий депозит"
          value={`$${stats.totalDeposits.toFixed(2)}`}
          icon={<BanknotesIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Выводов получено"
          value={stats.totalWithdrawals}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="success"
        />
      </div>

      {/* Works Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Список работ</h2>
        </div>
        
        {works.length === 0 ? (
          <div className="text-center py-8">
            <BanknotesIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Нет работ</h3>
            <p className="mt-1 text-sm text-gray-500">
              Создайте первую работу, чтобы начать зарабатывать
            </p>
          </div>
        ) : (
                  <div className="compact-table">
        <DataTable
            data={workRows}
            columns={allColumns}
          />
        </div>
        )}
      </div>
    </div>
  )
}