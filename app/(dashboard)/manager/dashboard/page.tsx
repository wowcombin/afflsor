'use client'

import { useEffect, useState } from 'react'

interface Withdrawal {
  id: string
  withdrawal_amount: number
  status: string
  profit: number
  waiting_minutes: number
  works: {
    deposit_amount: number
    users: { first_name: string; last_name: string }
    casinos: { name: string }
    cards: { card_number_mask: string }
  }
}

export default function ManagerDashboard() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadQueue()
    const interval = setInterval(loadQueue, 30000) // Обновление каждые 30 сек
    return () => clearInterval(interval)
  }, [])
  
  async function loadQueue() {
    const res = await fetch('/api/withdrawals/queue')
    const data = await res.json()
    setWithdrawals(data.withdrawals || [])
    setLoading(false)
  }
  
  async function checkWithdrawal(id: string, status: 'received' | 'problem' | 'block') {
    const res = await fetch(`/api/withdrawals/${id}/check`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    
    if (res.ok) {
      loadQueue() // Перезагрузка очереди
    }
  }
  
  if (loading) return <div>Загрузка...</div>
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Очередь выводов ({withdrawals.length})</h1>
      
      {withdrawals.length === 0 ? (
        <div className="text-gray-500">Нет выводов для проверки</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Время ожидания</th>
                <th className="px-4 py-2 text-left">Junior</th>
                <th className="px-4 py-2 text-left">Казино</th>
                <th className="px-4 py-2 text-left">Карта</th>
                <th className="px-4 py-2 text-right">Депозит</th>
                <th className="px-4 py-2 text-right">Вывод</th>
                <th className="px-4 py-2 text-right">Профит</th>
                <th className="px-4 py-2 text-center">Действия</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map(w => (
                <tr key={w.id} className={w.waiting_minutes > 15 ? 'bg-yellow-50' : ''}>
                  <td className="px-4 py-2">
                    <span className={w.waiting_minutes > 60 ? 'text-red-600 font-bold' : ''}>
                      {w.waiting_minutes} мин
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {w.works.users.first_name} {w.works.users.last_name}
                  </td>
                  <td className="px-4 py-2">{w.works.casinos.name}</td>
                  <td className="px-4 py-2 font-mono text-sm">
                    {w.works.cards.card_number_mask}
                  </td>
                  <td className="px-4 py-2 text-right">${w.works.deposit_amount}</td>
                  <td className="px-4 py-2 text-right">${w.withdrawal_amount}</td>
                  <td className="px-4 py-2 text-right font-bold text-green-600">
                    ${w.profit}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => checkWithdrawal(w.id, 'received')}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => checkWithdrawal(w.id, 'problem')}
                        className="px-3 py-1 bg-yellow-600 text-white rounded text-sm"
                      >
                        ?
                      </button>
                      <button
                        onClick={() => checkWithdrawal(w.id, 'block')}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm"
                      >
                        ✗
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
