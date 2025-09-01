'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import KPICard from '@/components/ui/KPICard'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import { 
  CurrencyDollarIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  PlusIcon,
  FunnelIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'

interface Expense {
  id: string
  category: string
  description: string
  amount: number
  currency: string
  date: string
  expense_date?: string  // Поле из БД
  created_by: string
  created_by_name: string
  receipt_url?: string
  created_at: string
}

interface ExpenseStats {
  total_expenses: number
  total_amount_usd: number
  this_month_amount: number
  last_month_amount: number
  by_category: Record<string, number>
}

export default function CFOExpensesPage() {
  const { addToast } = useToast()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [stats, setStats] = useState<ExpenseStats>({
    total_expenses: 0,
    total_amount_usd: 0,
    this_month_amount: 0,
    last_month_amount: 0,
    by_category: {}
  })
  const [loading, setLoading] = useState(true)
  const [showNewExpenseModal, setShowNewExpenseModal] = useState(false)
  const [creating, setCreating] = useState(false)


  // Форма для создания расхода
  const [newExpense, setNewExpense] = useState({
    category: '',
    description: '',
    amount: 0,
    currency: 'USD',
    date: new Date().toISOString().split('T')[0]
  })

  // Категории расходов (согласно техзаданию)
  const expenseCategories = [
    'Rendering',
    'Documents', 
    'Banks',
    'SMS',
    'Телефоны',
    'Duoplus',
    'Proxy',
    'Офис и аренда',
    'Зарплаты и налоги',
    'Маркетинг и реклама',
    'IT и программное обеспечение',
    'Другое'
  ]

  useEffect(() => {
    loadExpenses()
  }, [])

  async function loadExpenses() {
    try {
      const response = await fetch('/api/expenses')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка загрузки расходов')
      }

      const { expenses: expensesData, statistics } = await response.json()
      setExpenses(expensesData || [])
      setStats(statistics || stats)

    } catch (error: any) {
      console.error('Ошибка загрузки расходов:', error)
      addToast({
        type: 'error',
        title: 'Ошибка загрузки',
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateExpense() {
    try {
      setCreating(true)
      
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newExpense)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'Расход создан',
        description: data.message
      })

      setShowNewExpenseModal(false)
      setNewExpense({
        category: '',
        description: '',
        amount: 0,
        currency: 'USD',
        date: new Date().toISOString().split('T')[0]
      })
      await loadExpenses()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка создания расхода',
        description: error.message
      })
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteExpense(expense: Expense) {
    if (!confirm(`Удалить расход "${expense.description}"? Это действие нельзя отменить.`)) {
      return
    }

    try {
      console.log('Deleting expense:', expense.id) // Отладка
      
      const response = await fetch(`/api/expenses/${expense.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      console.log('Delete response:', data) // Отладка

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'Расход удален',
        description: data.message
      })

      // Перезагружаем список расходов
      await loadExpenses()

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка удаления',
        description: error.message
      })
    }
  }

  // Функция для получения символа валюты
  const getCurrencySymbol = (currency: string) => {
    const symbols = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'CAD': 'C$'
    }
    return symbols[currency as keyof typeof symbols] || currency
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {Array.from({length: 4}).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Управление расходами</h1>
          <p className="text-gray-600">Учет и контроль расходов компании</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowNewExpenseModal(true)}
            className="btn-success"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Новый расход
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Всего расходов"
          value={stats.total_expenses}
          icon={<CurrencyDollarIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Общая сумма"
          value={`$${Number(stats.total_amount_usd).toFixed(2)}`}
          icon={<ChartBarIcon className="h-6 w-6" />}
          color="success"
        />
        <KPICard
          title="Этот месяц"
          value={`$${Number(stats.this_month_amount).toFixed(2)}`}
          icon={<CalendarDaysIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title={stats.this_month_amount >= stats.last_month_amount ? "Рост расходов" : "Снижение расходов"}
          value={`${stats.this_month_amount >= stats.last_month_amount ? '+' : ''}${((stats.this_month_amount - stats.last_month_amount) / (stats.last_month_amount || 1) * 100).toFixed(1)}%`}
          icon={stats.this_month_amount >= stats.last_month_amount ? 
            <ArrowTrendingUpIcon className="h-6 w-6" /> : 
            <ArrowTrendingDownIcon className="h-6 w-6" />
          }
          color={stats.this_month_amount >= stats.last_month_amount ? "danger" : "success"}
        />
      </div>



      {/* Expenses Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">
            Все расходы компании
          </h2>
        </div>
        
        <DataTable
          data={expenses}
          columns={[
            {
              key: 'date',
              label: 'Дата',
              render: (expense: Expense) => {
                try {
                  // Обрабатываем разные форматы дат
                  const date = expense.date || expense.expense_date || expense.created_at
                  return new Date(date).toLocaleDateString('ru-RU')
                } catch {
                  return 'Некорректная дата'
                }
              }
            },
            {
              key: 'category',
              label: 'Категория',
              render: (expense: Expense) => expense.category
            },
            {
              key: 'description',
              label: 'Описание',
              render: (expense: Expense) => (
                <div className="max-w-xs truncate" title={expense.description}>
                  {expense.description}
                </div>
              )
            },
            {
              key: 'amount',
              label: 'Сумма',
              render: (expense: Expense) => (
                <span className="font-mono">
                  {getCurrencySymbol(expense.currency)}{expense.amount.toFixed(2)}
                </span>
              )
            },

            {
              key: 'created_by',
              label: 'Создал',
              render: (expense: Expense) => expense.created_by_name
            }
          ]}
          actions={[
            {
              label: 'Удалить',
              action: (expense: Expense) => handleDeleteExpense(expense),
              variant: 'danger'
            }
          ]}
          emptyMessage="Нет расходов"
        />
      </div>

      {/* Modal создания расхода */}
      <Modal
        isOpen={showNewExpenseModal}
        onClose={() => {
          setShowNewExpenseModal(false)
          setNewExpense({
            category: '',
            description: '',
            amount: 0,
            currency: 'USD',
            date: new Date().toISOString().split('T')[0]
          })
        }}
        title="Создать новый расход"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="form-label">Категория *</label>
            <select
              value={newExpense.category}
              onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
              className="form-input"
              required
            >
              <option value="">Выберите категорию</option>
              {expenseCategories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Описание *</label>
            <textarea
              value={newExpense.description}
              onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
              className="form-input"
              placeholder="Подробное описание расхода..."
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Сумма *</label>
              <input
                type="number"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({...newExpense, amount: parseFloat(e.target.value) || 0})}
                className="form-input"
                placeholder="0.00"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="form-label">Валюта</label>
              <select
                value={newExpense.currency}
                onChange={(e) => setNewExpense({...newExpense, currency: e.target.value})}
                className="form-input"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD (C$)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Дата</label>
            <input
              type="date"
              value={newExpense.date}
              onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
              className="form-input"
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowNewExpenseModal(false)}
              className="btn-info"
              disabled={creating}
            >
              Отмена
            </button>
            <button
              onClick={handleCreateExpense}
              className="btn-success"
              disabled={creating || !newExpense.category || !newExpense.description || newExpense.amount <= 0}
            >
              {creating ? 'Создание...' : 'Создать расход'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
