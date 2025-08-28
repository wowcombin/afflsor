'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import DataTable, { Column } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import FormCard from '@/components/ui/FormCard'
import SimpleChart from '@/components/ui/SimpleChart'
import { useToast } from '@/components/ui/Toast'
import { PlusIcon, CreditCardIcon, BanknotesIcon, ChartBarIcon } from '@heroicons/react/24/outline'

interface Expense {
  id: string
  category: 'salaries' | 'bank_fees' | 'operational' | 'marketing' | 'other'
  description: string
  amount: number
  currency: 'USD' | 'USDT'
  created_by: string
  created_at: string
  users: {
    first_name: string
    last_name: string
  }
}

interface ExpenseStats {
  totalExpenses: number
  byCategory: Array<{
    category: string
    amount: number
    percentage: number
  }>
  monthlyTrend: Array<{
    month: string
    amount: number
  }>
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [stats, setStats] = useState<ExpenseStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    category: 'operational' as Expense['category'],
    description: '',
    amount: '',
    currency: 'USD' as Expense['currency']
  })
  const [saving, setSaving] = useState(false)
  const { addToast } = useToast()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadExpenses()
    } else {
      setLoading(false)
    }
  }, [])

  async function loadExpenses() {
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          users!inner(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error

      setExpenses(data || [])
      calculateStats(data || [])
    } catch (error) {
      console.error('Ошибка загрузки расходов:', error)
      addToast({ type: 'error', title: 'Ошибка загрузки данных о расходах' })
    } finally {
      setLoading(false)
    }
  }

  function calculateStats(expenseData: Expense[]) {
    const totalExpenses = expenseData.reduce((sum, exp) => sum + exp.amount, 0)
    
    // Группировка по категориям
    const categoryStats = new Map()
    expenseData.forEach(exp => {
      const current = categoryStats.get(exp.category) || 0
      categoryStats.set(exp.category, current + exp.amount)
    })

    const byCategory = Array.from(categoryStats.entries()).map(([category, amount]) => ({
      category: getCategoryLabel(category),
      amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
    }))

    // Тренд по месяцам (последние 6 месяцев)
    const monthlyTrend = []
    const now = new Date()
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      
      const monthExpenses = expenseData.filter(exp => {
        const expDate = new Date(exp.created_at)
        return expDate >= monthStart && expDate <= monthEnd
      }).reduce((sum, exp) => sum + exp.amount, 0)

      monthlyTrend.push({
        month: monthStart.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' }),
        amount: monthExpenses
      })
    }

    setStats({
      totalExpenses,
      byCategory,
      monthlyTrend
    })
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault()
    
    if (!formData.description.trim()) {
      addToast({ type: 'error', title: 'Укажите описание расхода' })
      return
    }

    const amount = parseFloat(formData.amount)
    if (amount <= 0) {
      addToast({ type: 'error', title: 'Сумма должна быть больше 0' })
      return
    }

    setSaving(true)

    try {
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user?.id)
        .single()

      const { error } = await supabase
        .from('expenses')
        .insert({
          category: formData.category,
          description: formData.description.trim(),
          amount: amount,
          currency: formData.currency,
          created_by: userData?.id
        })

      if (error) throw error

      addToast({ type: 'success', title: 'Расход добавлен' })
      setShowForm(false)
      setFormData({
        category: 'operational',
        description: '',
        amount: '',
        currency: 'USD'
      })
      
      await loadExpenses()
    } catch (error) {
      console.error('Ошибка добавления расхода:', error)
      addToast({ type: 'error', title: 'Ошибка добавления расхода' })
    } finally {
      setSaving(false)
    }
  }

  function getCategoryLabel(category: string): string {
    const labels: { [key: string]: string } = {
      salaries: 'Зарплаты',
      bank_fees: 'Банковские комиссии',
      operational: 'Операционные расходы',
      marketing: 'Маркетинг',
      other: 'Прочее'
    }
    return labels[category] || category
  }

  const columns: Column[] = [
    {
      key: 'description',
      label: 'Описание',
      sortable: true,
      render: (expense: Expense) => (
        <div>
          <div className="font-medium text-gray-900">{expense.description}</div>
          <div className="text-sm text-gray-500">{getCategoryLabel(expense.category)}</div>
        </div>
      )
    },
    {
      key: 'amount',
      label: 'Сумма',
      sortable: true,
      render: (expense: Expense) => (
        <div className="text-red-600 font-semibold">
          {expense.amount.toFixed(2)} {expense.currency}
        </div>
      )
    },
    {
      key: 'created_by',
      label: 'Добавил',
      render: (expense: Expense) => (
        <div className="text-sm text-gray-600">
          {expense.users.first_name} {expense.users.last_name}
        </div>
      )
    },
    {
      key: 'created_at',
      label: 'Дата',
      sortable: true,
      render: (expense: Expense) => (
        <div className="text-sm text-gray-500">
          {new Date(expense.created_at).toLocaleDateString('ru-RU')}
        </div>
      )
    }
  ]

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Учет расходов</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Добавить расход
        </button>
      </div>

      {/* Add Expense Form */}
      {showForm && (
        <div className="mb-6">
          <FormCard title="Добавить новый расход">
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Категория *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as Expense['category'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="operational">Операционные расходы</option>
                    <option value="bank_fees">Банковские комиссии</option>
                    <option value="marketing">Маркетинг</option>
                    <option value="other">Прочее</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Валюта *
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value as Expense['currency'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="USD">USD</option>
                    <option value="USDT">USDT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Описание *
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Детальное описание расхода"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Сумма *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Добавление...' : 'Добавить расход'}
                </button>
              </div>
            </form>
          </FormCard>
        </div>
      )}

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <KPICard
            title="Общие расходы"
            value={`$${stats.totalExpenses.toFixed(2)}`}
            color="red"
            icon={<CreditCardIcon className="h-6 w-6" />}
          />
          <KPICard
            title="Категорий"
            value={stats.byCategory.length.toString()}
            color="blue"
            icon={<ChartBarIcon className="h-6 w-6" />}
          />
          <KPICard
            title="Записей"
            value={expenses.length.toString()}
            color="gray"
            icon={<BanknotesIcon className="h-6 w-6" />}
          />
        </div>
      )}

      {/* Charts */}
      {stats && stats.byCategory.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Category Breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Расходы по категориям</h3>
            <SimpleChart
              title="По категориям"
              type="pie"
              data={stats.byCategory.map(item => ({
                label: item.category,
                value: item.amount
              }))}
              height={300}
            />
          </div>

          {/* Monthly Trend */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Тренд расходов</h3>
            <SimpleChart
              title="По месяцам"
              type="bar"
              data={stats.monthlyTrend.map(item => ({
                label: item.month,
                value: item.amount
              }))}
              height={300}
            />
          </div>
        </div>
      )}

      {/* Expenses Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            История расходов ({expenses.length} записей)
          </h3>
        </div>
        
        <DataTable
          data={expenses}
          columns={columns}
          pagination={{ pageSize: 20 }}
          sorting={{ key: 'created_at', direction: 'desc' }}
          export={true}
        />
      </div>
    </div>
  )
}
