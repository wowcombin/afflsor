'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Stats {
  totalProfit: number
  totalExpenses: number
  netIncome: number
  topJuniors: Array<{
    id: string
    name: string
    profit: number
    works_count: number
  }>
}

export default function CFODashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Получить профит за текущий месяц
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { data: withdrawals } = await supabase
        .from('work_withdrawals')
        .select(`
          withdrawal_amount,
          works!inner(
            deposit_amount,
            junior_id,
            work_date,
            users!inner(first_name, last_name)
          )
        `)
        .eq('status', 'received')
        .gte('works.work_date', startOfMonth.toISOString())

      // Рассчитать общий профит
      const totalProfit = withdrawals?.reduce((sum, w) => {
        return sum + (w.withdrawal_amount - w.works.deposit_amount)
      }, 0) || 0

      // Рассчитать топ Junior'ов
      const juniorProfits = new Map<string, { name: string, profit: number, works_count: number }>()
      
      withdrawals?.forEach(w => {
        const juniorId = w.works.junior_id
        const profit = w.withdrawal_amount - w.works.deposit_amount
        const name = `${w.works.users.first_name} ${w.works.users.last_name}`
        
        if (juniorProfits.has(juniorId)) {
          const existing = juniorProfits.get(juniorId)!
          juniorProfits.set(juniorId, {
            name,
            profit: existing.profit + profit,
            works_count: existing.works_count + 1
          })
        } else {
          juniorProfits.set(juniorId, { name, profit, works_count: 1 })
        }
      })

      const topJuniors = Array.from(juniorProfits.entries())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 5)

      // Заглушка для расходов (можно добавить таблицу expenses)
      const totalExpenses = totalProfit * 0.3 // Примерно 30% от профита

      setStats({
        totalProfit,
        totalExpenses,
        netIncome: totalProfit - totalExpenses,
        topJuniors
      })
      
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateSalaries = async () => {
    setCalculating(true)
    
    try {
      const response = await fetch('/api/finance/salaries/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        router.push('/cfo/salaries')
      } else {
        const data = await response.json()
        alert(`Ошибка: ${data.error}`)
      }
    } catch (error) {
      alert('Ошибка сети')
    } finally {
      setCalculating(false)
    }
  }

  if (loading) return <div className="p-8">Загрузка...</div>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">CFO Dashboard</h1>
      
      {/* P&L карточки */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm">Валовый профит</h3>
          <p className="text-3xl font-bold text-green-600">
            ${stats?.totalProfit.toFixed(2)}
          </p>
          <p className="text-sm text-gray-500 mt-1">За текущий месяц</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm">Расходы</h3>
          <p className="text-3xl font-bold text-red-600">
            ${stats?.totalExpenses.toFixed(2)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Зарплаты + операционные</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm">Чистая прибыль</h3>
          <p className={`text-3xl font-bold ${
            (stats?.netIncome || 0) >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            ${stats?.netIncome.toFixed(2)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Маржа: {stats ? ((stats.netIncome / stats.totalProfit) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* График расходов (заглушка) */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Структура расходов</h3>
          <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">📊</div>
              <div>Donut Chart</div>
              <div className="text-sm">Зарплаты, Операционные, Маркетинг</div>
            </div>
          </div>
        </div>

        {/* Топ Junior'ов */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Топ-5 Junior по профиту</h3>
          {stats?.topJuniors.length === 0 ? (
            <div className="text-gray-500">Нет данных за текущий месяц</div>
          ) : (
            <div className="space-y-3">
              {stats?.topJuniors.map((junior, index) => (
                <div key={junior.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div className="flex items-center">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mr-3 ${
                      index === 0 ? 'bg-yellow-400 text-white' :
                      index === 1 ? 'bg-gray-400 text-white' :
                      index === 2 ? 'bg-orange-400 text-white' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {index + 1}
                    </span>
                    <div>
                      <div className="font-medium">{junior.name}</div>
                      <div className="text-sm text-gray-500">{junior.works_count} работ</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">${junior.profit.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Действия */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Финансовые операции</h3>
        <div className="flex gap-4">
          <button
            onClick={calculateSalaries}
            disabled={calculating}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {calculating ? 'Расчет...' : 'Рассчитать зарплаты за месяц'}
          </button>
          
          <button
            onClick={() => router.push('/cfo/salaries')}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
          >
            Управление зарплатами
          </button>
          
          <button
            onClick={() => window.open('/api/finance/export', '_blank')}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700"
          >
            Экспорт P&L отчета
          </button>
        </div>
      </div>
    </div>
  )
}
