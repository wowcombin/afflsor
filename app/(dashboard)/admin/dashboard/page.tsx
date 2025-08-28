'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import LogoutButton from '@/components/ui/LogoutButton'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProfit: 0,
    activeWorks: 0,
    pendingWithdrawals: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    try {
      const supabase = createClient()
      
      // Общая статистика для админа
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('status', 'active')

      const { count: activeWorks } = await supabase
        .from('works')
        .select('*', { count: 'exact' })
        .eq('status', 'active')

      const { count: pendingWithdrawals } = await supabase
        .from('work_withdrawals')
        .select('*', { count: 'exact' })
        .in('status', ['new', 'waiting'])

      setStats({
        totalUsers: totalUsers || 0,
        totalProfit: 0, // Заглушка
        activeWorks: activeWorks || 0,
        pendingWithdrawals: pendingWithdrawals || 0
      })
    } catch (error) {
      console.error('Error loading admin stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8">Загрузка...</div>

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <LogoutButton />
      </div>
      
      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500">Всего пользователей</div>
          <div className="text-2xl font-bold text-blue-600">
            {stats.totalUsers}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500">Активных работ</div>
          <div className="text-2xl font-bold text-green-600">
            {stats.activeWorks}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500">Ожидают проверки</div>
          <div className="text-2xl font-bold text-yellow-600">
            {stats.pendingWithdrawals}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500">Общий профит</div>
          <div className="text-2xl font-bold text-purple-600">
            ${stats.totalProfit.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Быстрые ссылки */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Link 
          href="/junior/dashboard"
          className="bg-blue-50 hover:bg-blue-100 p-6 rounded-lg border border-blue-200 transition-colors"
        >
          <h3 className="font-semibold text-blue-800 mb-2">Junior Dashboard</h3>
          <p className="text-sm text-blue-600">Управление депозитами и картами</p>
        </Link>

        <Link 
          href="/tester/dashboard"
          className="bg-purple-50 hover:bg-purple-100 p-6 rounded-lg border border-purple-200 transition-colors"
        >
          <h3 className="font-semibold text-purple-800 mb-2">Tester Dashboard</h3>
          <p className="text-sm text-purple-600">Тестирование казино и мануалы</p>
        </Link>

        <Link 
          href="/manager/dashboard"
          className="bg-green-50 hover:bg-green-100 p-6 rounded-lg border border-green-200 transition-colors"
        >
          <h3 className="font-semibold text-green-800 mb-2">Manager Dashboard</h3>
          <p className="text-sm text-green-600">Очередь выводов для проверки</p>
        </Link>

        <Link 
          href="/hr/dashboard"
          className="bg-yellow-50 hover:bg-yellow-100 p-6 rounded-lg border border-yellow-200 transition-colors"
        >
          <h3 className="font-semibold text-yellow-800 mb-2">HR Dashboard</h3>
          <p className="text-sm text-yellow-600">Управление сотрудниками</p>
        </Link>

        <Link 
          href="/cfo/dashboard"
          className="bg-orange-50 hover:bg-orange-100 p-6 rounded-lg border border-orange-200 transition-colors"
        >
          <h3 className="font-semibold text-orange-800 mb-2">CFO Dashboard</h3>
          <p className="text-sm text-orange-600">Финансовая отчетность</p>
        </Link>
      </div>

      {/* Дополнительные админские функции */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Административные функции</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link 
            href="/hr/users/new"
            className="bg-white hover:bg-gray-50 p-4 rounded-lg border transition-colors"
          >
            <h4 className="font-medium">Создать пользователя</h4>
            <p className="text-sm text-gray-600">Добавить нового сотрудника</p>
          </Link>

          <Link 
            href="/hr/banks"
            className="bg-white hover:bg-gray-50 p-4 rounded-lg border transition-colors"
          >
            <h4 className="font-medium">Управление банками</h4>
            <p className="text-sm text-gray-600">Балансы и карты</p>
          </Link>

          <Link 
            href="/tester/casinos"
            className="bg-white hover:bg-gray-50 p-4 rounded-lg border transition-colors"
          >
            <h4 className="font-medium">Управление казино</h4>
            <p className="text-sm text-gray-600">Добавление и тестирование</p>
          </Link>

          <Link 
            href="/cfo/salaries"
            className="bg-white hover:bg-gray-50 p-4 rounded-lg border transition-colors"
          >
            <h4 className="font-medium">Расчет зарплат</h4>
            <p className="text-sm text-gray-600">Финансовые операции</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
