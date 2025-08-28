'use client'

import { useEffect, useState } from 'react'
import DataTable, { Column, ActionConfig } from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import KPICard from '@/components/ui/KPICard'
import { useToast } from '@/components/ui/Toast'

interface CasinoTest {
  id: string
  casino_id: string
  tester_id: string
  test_type: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  rating: number | null
  deposit_test_amount: number | null
  withdrawal_test_amount: number | null
  test_notes: string | null
  issues_found: string | null
  recommendations: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  casinos: {
    id: string
    name: string
    url: string
  }
  users: {
    id: string
    first_name: string
    last_name: string
  }
}

export default function TesterTestsPage() {
  const { addToast } = useToast()
  const [tests, setTests] = useState<CasinoTest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [stats, setStats] = useState({
    totalTests: 0,
    pendingTests: 0,
    inProgressTests: 0,
    completedTests: 0,
    averageRating: 0
  })

  useEffect(() => {
    loadTests()
  }, [filter])

  async function loadTests() {
    try {
      setLoading(true)
      const response = await fetch(`/api/casino-tests?filter=${filter}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      const testsData = data.tests || []
      setTests(testsData)

      // Вычисляем статистику
      const totalTests = testsData.length
      const pendingTests = testsData.filter((t: CasinoTest) => t.status === 'pending').length
      const inProgressTests = testsData.filter((t: CasinoTest) => t.status === 'in_progress').length
      const completedTests = testsData.filter((t: CasinoTest) => t.status === 'completed').length
      
      const completedWithRating = testsData.filter((t: CasinoTest) => t.status === 'completed' && t.rating !== null)
      const averageRating = completedWithRating.length > 0 
        ? completedWithRating.reduce((sum: number, t: CasinoTest) => sum + (t.rating || 0), 0) / completedWithRating.length
        : 0

      setStats({
        totalTests,
        pendingTests,
        inProgressTests,
        completedTests,
        averageRating: Math.round(averageRating * 10) / 10
      })

    } catch (error: any) {
      addToast({ 
        type: 'error', 
        title: error.message || 'Ошибка загрузки тестов' 
      })
    } finally {
      setLoading(false)
    }
  }

  async function startTest(testId: string) {
    try {
      const response = await fetch(`/api/casino-tests/${testId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({ 
        type: 'success', 
        title: 'Тест запущен' 
      })

      loadTests()

    } catch (error: any) {
      addToast({ 
        type: 'error', 
        title: error.message || 'Ошибка запуска теста' 
      })
    }
  }

  async function completeTest(testId: string) {
    // TODO: Открыть модальное окно для завершения теста с оценкой
    console.log('Complete test:', testId)
  }

  // Конфигурация колонок для DataTable
  const columns: Column[] = [
    {
      key: 'casinos.name',
      label: 'Казино',
      sortable: true,
      render: (value: string, row: CasinoTest) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-xs text-gray-500">{row.casinos.url}</div>
        </div>
      )
    },
    {
      key: 'test_type',
      label: 'Тип теста',
      sortable: true,
      render: (value: string) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
          {value === 'full' ? 'Полный тест' : 
           value === 'deposit' ? 'Тест депозита' : 
           value === 'withdrawal' ? 'Тест вывода' : value}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Статус',
      render: (value: string) => <StatusBadge status={value} type="test" />
    },
    {
      key: 'rating',
      label: 'Оценка',
      sortable: true,
      render: (value: number | null) => (
        <div>
          {value !== null ? (
            <div className="flex items-center">
              <span className="font-medium">{value}/10</span>
              <div className="ml-2 flex">
                {[...Array(10)].map((_, i) => (
                  <span
                    key={i}
                    className={`text-xs ${i < value ? 'text-yellow-400' : 'text-gray-300'}`}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <span className="text-gray-500">Не оценено</span>
          )}
        </div>
      )
    },
    {
      key: 'created_at',
      label: 'Создан',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString('ru-RU')
    },
    {
      key: 'completed_at',
      label: 'Завершен',
      sortable: true,
      render: (value: string | null) => 
        value ? new Date(value).toLocaleDateString('ru-RU') : '-'
    }
  ]

  // Конфигурация действий
  const actions: ActionConfig[] = [
    {
      label: 'Начать',
      action: (row: CasinoTest) => startTest(row.id),
      variant: 'primary',
      condition: (row: CasinoTest) => row.status === 'pending'
    },
    {
      label: 'Завершить',
      action: (row: CasinoTest) => completeTest(row.id),
      variant: 'secondary',
      condition: (row: CasinoTest) => row.status === 'in_progress'
    }
  ]

  // Конфигурация фильтров
  const filters = [
    { key: 'search', type: 'search' as const, placeholder: 'Поиск по казино...' },
    {
      key: 'filter',
      type: 'select' as const,
      options: [
        { value: 'all', label: 'Все тесты' },
        { value: 'pending', label: 'Ожидают' },
        { value: 'in_progress', label: 'В процессе' },
        { value: 'completed', label: 'Завершенные' },
        { value: 'failed', label: 'Неудачные' }
      ],
      value: filter,
      onChange: (value: string) => setFilter(value)
    }
  ]

  if (loading) return <div className="p-8">Загрузка...</div>

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Тестирование казино</h1>
        <div className="flex gap-3">
          <button
            onClick={loadTests}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            🔄 Обновить
          </button>
          <button
            onClick={() => {/* TODO: Открыть модальное окно создания теста */}}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            ➕ Новый тест
          </button>
        </div>
      </div>

      {/* KPI карточки */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <KPICard
          title="Всего тестов"
          value={stats.totalTests.toString()}
          color="blue"
          icon="🧪"
        />
        <KPICard
          title="Ожидают"
          value={stats.pendingTests.toString()}
          color="yellow"
          icon="⏳"
        />
        <KPICard
          title="В процессе"
          value={stats.inProgressTests.toString()}
          color="purple"
          icon="🔄"
        />
        <KPICard
          title="Завершенные"
          value={stats.completedTests.toString()}
          color="green"
          icon="✅"
        />
        <KPICard
          title="Средняя оценка"
          value={stats.averageRating.toString()}
          color="red"
          icon="⭐"
        />
      </div>

      {/* Таблица тестов */}
      <DataTable
        columns={columns}
        data={tests}
        actions={actions}
        filters={filters}
        sorting={{ key: 'created_at', direction: 'desc' }}
        pagination={{
          pageSize: 20,
          showTotal: true
        }}
        export={true}
        loading={loading}
      />
    </div>
  )
}