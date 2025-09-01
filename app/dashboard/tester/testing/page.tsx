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
  DocumentTextIcon,
  CreditCardIcon,
  PlusIcon,
  ComputerDesktopIcon,
  BanknotesIcon
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
  casino: {
    id: string
    name: string
    url: string
    status: string
  }
  card: {
    id: string
    card_number_mask: string
    card_bin: string
    account_balance: number
    account_currency: string
  }
}

interface TestStats {
  totalWorks: number
  activeWorks: number
  completedWorks: number
  successRate: number
  totalDeposits: number
  totalWithdrawals: number
}

export default function TesterTestingPage() {
  const { addToast } = useToast()
  const [works, setWorks] = useState<TestWork[]>([])
  const [casinos, setCasinos] = useState<any[]>([])
  const [cards, setCards] = useState<any[]>([])
  const [stats, setStats] = useState<TestStats>({
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

  // Форма новой работы
  const [newWork, setNewWork] = useState({
    casino_id: '',
    card_id: '',
    deposit_amount: 100
  })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadTests()
  }, [])

  async function loadTests() {
    try {
      const response = await fetch('/api/casino-tests')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка загрузки тестов')
      }

      const { tests: testsData } = await response.json()
      setWorks(testsData || [])

      // Рассчитываем статистику
      const totalTests = testsData?.length || 0
      const activeTests = testsData?.filter((t: any) => ['pending', 'in_progress'].includes(t.status)).length || 0
      const completedTests = testsData?.filter((t: any) => t.status === 'completed').length || 0
      const approvedTests = testsData?.filter((t: any) => t.test_result === 'approved').length || 0
      const successRate = completedTests > 0 ? Math.round((approvedTests / completedTests) * 100) : 0
      const totalDeposits = testsData?.reduce((sum: number, t: any) => sum + (t.deposit_amount || 0), 0) || 0
      const totalWithdrawals = testsData?.reduce((sum: number, t: any) => sum + (t.withdrawal_amount || 0), 0) || 0

      setStats({
        totalWorks: totalTests,
        activeWorks: activeTests,
        completedWorks: completedTests,
        successRate,
        totalDeposits,
        totalWithdrawals
      })

    } catch (error: any) {
      console.error('Ошибка загрузки тестов:', error)
      addToast({
        type: 'error',
        title: 'Ошибка загрузки данных',
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  const columns: Column<TestWork>[] = [
    {
      key: 'casino',
      label: 'Казино',
      sortable: true,
      render: (test) => (
        <div>
          <div className="font-medium text-gray-900">{test.casino.name}</div>
          <div className="text-sm text-gray-500">Тест казино</div>
        </div>
      )
    },
    {
      key: 'card',
      label: 'Карта',
      render: (test) => {
        if (test.card) {
          return (
            <div className="text-sm">
              <div className="font-mono">{test.card.card_number_mask}</div>
              <div className="text-gray-500">BIN: {test.card.card_bin}</div>
            </div>
          )
        }
        return <span className="text-gray-500">Не указана</span>
      }
    },
    {
      key: 'deposit_amount',
      label: 'Депозит',
      align: 'right',
      render: (test) => {
        if (test.deposit_amount) {
          return (
            <div className="text-right">
              <div className="font-mono">${test.deposit_amount}</div>
              <div className={`text-xs ${test.deposit_success ? 'text-success-600' : 'text-danger-600'}`}>
                {test.deposit_success ? '✅ Успешно' : '❌ Ошибка'}
              </div>
            </div>
          )
        }
        return <span className="text-gray-500">-</span>
      }
    },
    {
      key: 'withdrawal_amount',
      label: 'Вывод',
      align: 'right',
      render: (test) => {
        if (test.withdrawal_amount) {
          return (
            <div className="text-right">
              <div className="font-mono">${test.withdrawal_amount}</div>
              <div className={`text-xs ${test.withdrawal_success ? 'text-success-600' : 'text-danger-600'}`}>
                {test.withdrawal_success ? '✅ Успешно' : '❌ Ошибка'}
              </div>
            </div>
          )
        }
        return <span className="text-gray-500">-</span>
      }
    },
    {
      key: 'status',
      label: 'Результат',
      render: (test) => {
        if (test.status === 'completed' && test.rating) {
          return (
            <div>
              <StatusBadge status="completed" size="sm" />
              <div className="text-xs text-gray-500 mt-1">
                {test.rating}/10 ⭐
              </div>
            </div>
          )
        }
        return <StatusBadge status={test.status} size="sm" />
      }
    },
    {
      key: 'completed_at',
      label: 'Завершен',
      sortable: true,
      render: (test) => {
        if (test.completed_at) {
          return (
            <span className="text-sm text-gray-600">
              {new Date(test.completed_at).toLocaleDateString('ru-RU')}
            </span>
          )
        }
        return <span className="text-gray-500">В процессе</span>
      }
    }
  ]

  const actions: ActionButton<TestWork>[] = [
    {
      label: 'Продолжить',
      action: (test) => {
        addToast({ type: 'info', title: 'Интерфейс тестирования - в разработке' })
      },
      variant: 'primary',
      condition: (test) => test.status === 'in_progress'
    },
    {
      label: 'Отчет',
      action: (test) => {
        addToast({ type: 'info', title: 'Просмотр отчета - в разработке' })
      },
      variant: 'secondary',
      condition: (test) => test.status === 'completed'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">История тестов</h1>
          <p className="text-gray-600">Архив завершенных тестирований казино</p>
        </div>
        <button
          onClick={() => window.location.href = '/dashboard/tester/work'}
          className="btn-primary"
        >
          <BeakerIcon className="h-5 w-5 mr-2" />
          Тестовые работы
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <KPICard
          title="Всего тестов"
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

      {/* Таблица тестов */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">
            Тесты казино ({works.length})
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
          emptyMessage="Тесты не найдены"
        />
      </div>

      {/* Инструкции */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
        <h3 className="font-medium text-primary-900 mb-3">🧪 Процесс тестирования</h3>
        <div className="text-sm text-primary-800 space-y-2">
          <div>• <strong>Создайте казино</strong> на странице "Казино"</div>
          <div>• <strong>Запустите тест</strong> кнопкой "Начать тест"</div>
          <div>• <strong>Выполните проверки</strong> - регистрация, депозит, игра, вывод</div>
          <div>• <strong>Заполните отчет</strong> с найденными проблемами</div>
          <div>• <strong>Установите рейтинг</strong> и рекомендуемые BIN коды</div>
          <div>• <strong>Опубликуйте мануал</strong> для Junior пользователей</div>
        </div>
      </div>
    </div>
  )
}
