'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function JuniorDashboard() {
  const [stats, setStats] = useState({
    monthProfit: 0,
    successRate: 0,
    activeWorks: 0,
    availableCards: 0
  })
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadStats()
  }, [])
  
  async function loadStats() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      // Профит за месяц
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      
      const { data: withdrawals } = await supabase
        .from('work_withdrawals')
        .select('withdrawal_amount, works!inner(deposit_amount, junior_id)')
        .eq('works.junior_id', user?.id)
        .eq('status', 'received')
        .gte('created_at', startOfMonth.toISOString())
      
      const monthProfit = withdrawals?.reduce((sum, w: any) => 
        sum + (w.withdrawal_amount - w.works.deposit_amount), 0) || 0
      
      // Доступные карты (с балансом >= $10)
      const { count: availableCards } = await supabase
        .from('available_cards_for_junior')
        .select('*', { count: 'exact' })
        .eq('junior_id', user?.id)
        .eq('is_available', true)
      
      setStats({
        monthProfit,
        successRate: 87.5, // Заглушка
        activeWorks: 3, // Заглушка
        availableCards: availableCards || 0
      })
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) return <div>Загрузка...</div>
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard Junior</h1>
      
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500">Профит за месяц</div>
          <div className="text-2xl font-bold text-green-600">
            ${stats.monthProfit.toFixed(2)}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500">Успешность</div>
          <div className="text-2xl font-bold">{stats.successRate}%</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500">Активных работ</div>
          <div className="text-2xl font-bold">{stats.activeWorks}</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500">Доступно карт</div>
          <div className="text-2xl font-bold">{stats.availableCards}</div>
          {stats.availableCards === 0 && (
            <div className="text-xs text-red-500 mt-1">
              Нет карт с балансом ≥ $10
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
