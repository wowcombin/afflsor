'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import DataTable, { Column } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import StatusBadge from '@/components/ui/StatusBadge'
import FormCard from '@/components/ui/FormCard'
import { useToast } from '@/components/ui/Toast'
import { 
  CurrencyDollarIcon, 
  CheckCircleIcon, 
  ClockIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline'

interface SalaryCalculation {
  id: string
  junior_id: string
  calculation_period: string
  gross_profit: number
  base_salary: number
  bonus: number
  penalties: number
  total_salary: number
  works_count: number
  status: 'calculated' | 'approved' | 'paid' | 'cancelled'
  calculated_at: string
  users: {
    first_name: string
    last_name: string
    email: string
    telegram_username?: string
    usdt_wallet?: string
  }
}

interface SalaryStats {
  totalCalculated: number
  totalApproved: number
  totalPaid: number
  pendingAmount: number
  employeesCount: number
}

export default function CFOSalariesPage() {
  const [calculations, setCalculations] = useState<SalaryCalculation[]>([])
  const [stats, setStats] = useState<SalaryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const { addToast } = useToast()

  useEffect(() => {
    // Устанавливаем текущий месяц по умолчанию
    const now = new Date()
    const currentPeriod = now.toISOString().slice(0, 7) // YYYY-MM
    setSelectedPeriod(currentPeriod)
  }, [])

  useEffect(() => {
    if (selectedPeriod && typeof window !== 'undefined') {
      fetchCalculations()
    }
  }, [selectedPeriod])

  const fetchCalculations = async () => {
    if (!selectedPeriod) return

    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('salary_calculations')
        .select(`
          *,
          users!inner(first_name, last_name, email, telegram_username, usdt_wallet)
        `)
        .eq('calculation_period', selectedPeriod)
        .order('total_salary', { ascending: false })

      if (error) throw error

      setCalculations(data || [])
      
      // Расчет статистики
      const calculated = data?.filter(c => c.status === 'calculated').length || 0
      const approved = data?.filter(c => c.status === 'approved').length || 0
      const paid = data?.filter(c => c.status === 'paid').length || 0
      const pendingAmount = data?.filter(c => c.status !== 'paid')
        .reduce((sum, c) => sum + c.total_salary, 0) || 0

      setStats({
        totalCalculated: calculated,
        totalApproved: approved,
        totalPaid: paid,
        pendingAmount,
        employeesCount: data?.length || 0
      })

    } catch (error) {
      console.error('Ошибка загрузки расчетов:', error)
      addToast({ type: 'error', title: 'Ошибка загрузки данных о зарплатах' })
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(calculationId: string, newStatus: 'approved' | 'paid' | 'cancelled') {
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('salary_calculations')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', calculationId)

      if (error) throw error

      addToast({ 
        type: 'success', 
        title: `Статус изменен на ${getStatusLabel(newStatus)}` 
      })
      
      await fetchCalculations()
    } catch (error) {
      console.error('Ошибка изменения статуса:', error)
      addToast({ type: 'error', title: 'Ошибка изменения статуса' })
    }
  }

  async function handleBulkApprove() {
    setProcessing(true)
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('salary_calculations')
        .update({ 
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('calculation_period', selectedPeriod)
        .eq('status', 'calculated')

      if (error) throw error

      addToast({ 
        type: 'success', 
        title: 'Все расчеты утверждены' 
      })
      
      await fetchCalculations()
    } catch (error) {
      console.error('Ошибка массового утверждения:', error)
      addToast({ type: 'error', title: 'Ошибка утверждения расчетов' })
    } finally {
      setProcessing(false)
    }
  }

  function getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      calculated: 'Рассчитано',
      approved: 'Утверждено',
      paid: 'Выплачено',
      cancelled: 'Отменено'
    }
    return labels[status] || status
  }

  const columns: Column[] = [
    {
      key: 'employee',
      label: 'Сотрудник',
      sortable: true,
      render: (calc: SalaryCalculation) => (
        <div className="flex items-center">
          <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
            {calc.users.first_name?.[0] || 'U'}
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {calc.users.first_name} {calc.users.last_name}
            </div>
            <div className="text-sm text-gray-500">{calc.users.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'gross_profit',
      label: 'Профит',
      sortable: true,
      render: (calc: SalaryCalculation) => (
        <div className="text-green-600 font-semibold">
          ${calc.gross_profit.toFixed(2)}
        </div>
      )
    },
    {
      key: 'works_count',
      label: 'Работ',
      sortable: true,
      render: (calc: SalaryCalculation) => (
        <div className="text-gray-900">{calc.works_count}</div>
      )
    },
    {
      key: 'base_salary',
      label: 'Базовая зарплата',
      sortable: true,
      render: (calc: SalaryCalculation) => (
        <div className="text-blue-600 font-medium">
          ${calc.base_salary.toFixed(2)}
        </div>
      )
    },
    {
      key: 'bonus',
      label: 'Бонус',
      render: (calc: SalaryCalculation) => (
        <div className="text-purple-600">
          {calc.bonus > 0 ? `$${calc.bonus.toFixed(2)}` : '-'}
        </div>
      )
    },
    {
      key: 'total_salary',
      label: 'Итого к выплате',
      sortable: true,
      render: (calc: SalaryCalculation) => (
        <div className="text-lg font-bold text-gray-900">
          ${calc.total_salary.toFixed(2)}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Статус',
      sortable: true,
      render: (calc: SalaryCalculation) => <StatusBadge status={calc.status} />
    },
    {
      key: 'payment_info',
      label: 'Выплата',
      render: (calc: SalaryCalculation) => (
        <div className="text-sm">
          {calc.users.usdt_wallet ? (
            <div className="font-mono text-xs text-gray-600">
              {calc.users.usdt_wallet.slice(0, 8)}...{calc.users.usdt_wallet.slice(-6)}
            </div>
          ) : (
            <div className="text-red-500">Кошелек не указан</div>
          )}
          {calc.users.telegram_username && (
            <div className="text-blue-600">@{calc.users.telegram_username}</div>
          )}
        </div>
      )
    }
  ]

  const actions = [
    {
      label: 'Утвердить',
      action: (calc: SalaryCalculation) => handleStatusChange(calc.id, 'approved'),
      condition: (calc: SalaryCalculation) => calc.status === 'calculated',
      variant: 'primary' as const
    },
    {
      label: 'Отметить выплаченным',
      action: (calc: SalaryCalculation) => handleStatusChange(calc.id, 'paid'),
      condition: (calc: SalaryCalculation) => calc.status === 'approved',
      variant: 'secondary' as const
    },
    {
      label: 'Отменить',
      action: (calc: SalaryCalculation) => handleStatusChange(calc.id, 'cancelled'),
      condition: (calc: SalaryCalculation) => calc.status !== 'paid',
      variant: 'danger' as const
    }
  ]

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Управление зарплатами</h1>
        <div className="flex space-x-3">
          <input
            type="month"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          
          <button
            onClick={handleBulkApprove}
            disabled={processing || !calculations.some(c => c.status === 'calculated')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {processing ? 'Обработка...' : 'Утвердить все'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            title="Рассчитано"
            value={stats.totalCalculated.toString()}
            color="blue"
            icon={<ClockIcon className="h-6 w-6" />}
          />
          <KPICard
            title="Утверждено"
            value={stats.totalApproved.toString()}
            color="green"
            icon={<CheckCircleIcon className="h-6 w-6" />}
          />
          <KPICard
            title="Выплачено"
            value={stats.totalPaid.toString()}
            color="gray"
            icon={<BanknotesIcon className="h-6 w-6" />}
          />
          <KPICard
            title="К выплате"
            value={`$${stats.pendingAmount.toFixed(2)}`}
            color="red"
            icon={<CurrencyDollarIcon className="h-6 w-6" />}
          />
        </div>
      )}

      {/* Salary Calculations Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            Расчеты зарплат за {selectedPeriod} ({calculations.length} сотрудников)
          </h3>
        </div>
        
        <DataTable
          data={calculations}
          columns={columns}
          actions={actions}
          pagination={{ pageSize: 20 }}
          sorting={{ key: 'total_salary', direction: 'desc' }}
          export={true}
        />
      </div>

      {/* Summary Card */}
      {stats && (
        <div className="mt-6">
          <FormCard title="Сводка по зарплатам">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.employeesCount}</div>
                <div className="text-sm text-gray-500">Сотрудников</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  ${calculations.reduce((sum, c) => sum + c.gross_profit, 0).toFixed(2)}
                </div>
                <div className="text-sm text-gray-500">Общий профит</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  ${calculations.reduce((sum, c) => sum + c.total_salary, 0).toFixed(2)}
                </div>
                <div className="text-sm text-gray-500">Общая зарплата</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {calculations.length > 0 
                    ? ((calculations.reduce((sum, c) => sum + c.total_salary, 0) / 
                       calculations.reduce((sum, c) => sum + c.gross_profit, 0)) * 100).toFixed(1)
                    : 0
                  }%
                </div>
                <div className="text-sm text-gray-500">% от профита</div>
              </div>
            </div>
          </FormCard>
        </div>
      )}
    </div>
  )
}