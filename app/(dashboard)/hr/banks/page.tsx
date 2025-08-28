'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface BankAccount {
  id: string
  bank_id: string
  holder_name: string
  balance: number
  banks: {
    name: string
    country: string
  }
}

export default function HRBanksPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newBalance, setNewBalance] = useState<number>(0)
  const [comment, setComment] = useState('')
  const [updating, setUpdating] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select(`
        *,
        banks (name, country)
      `)
      .order('balance', { ascending: false })
    
    if (!error && data) {
      setAccounts(data)
    }
    setLoading(false)
  }

  const updateBalance = async (accountId: string) => {
    if (!comment.trim()) {
      alert('Комментарий обязателен')
      return
    }

    if (newBalance < 0) {
      alert('Баланс не может быть отрицательным')
      return
    }

    setUpdating(true)

    try {
      const response = await fetch(`/api/banks/accounts/${accountId}/balance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance: newBalance, comment })
      })

      const data = await response.json()

      if (response.ok) {
        await fetchAccounts()
        setEditingId(null)
        setComment('')
        
        // Показать предупреждение если баланс < 10
        if (data.message) {
          alert(data.message)
        }
      } else {
        alert(`Ошибка: ${data.error}`)
      }
    } catch (error) {
      alert('Ошибка сети')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <div className="p-8">Загрузка...</div>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Управление балансами банков</h1>
      
      <div className="space-y-4">
        {accounts.map(account => (
          <div key={account.id} className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">
                  {account.banks.name} ({account.banks.country})
                </h3>
                <p className="text-gray-600">{account.holder_name}</p>
              </div>
              
              <div className="text-right">
                {editingId === account.id ? (
                  <div className="space-y-2">
                    <input
                      type="number"
                      value={newBalance}
                      onChange={(e) => setNewBalance(Number(e.target.value))}
                      className="border rounded px-2 py-1 w-32"
                      step="0.01"
                      min="0"
                      disabled={updating}
                    />
                    <textarea
                      placeholder="Комментарий (обязательно)"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="border rounded px-2 py-1 w-full"
                      rows={2}
                      disabled={updating}
                    />
                    <div className="space-x-2">
                      <button
                        onClick={() => updateBalance(account.id)}
                        disabled={updating}
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {updating ? 'Сохранение...' : 'Сохранить'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null)
                          setComment('')
                        }}
                        disabled={updating}
                        className="bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500 disabled:opacity-50"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-bold">${account.balance.toFixed(2)}</p>
                    <span className={`inline-block px-2 py-1 rounded text-sm ${
                      account.balance >= 10 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {account.balance >= 10 ? 'Карты доступны' : 'Карты скрыты'}
                    </span>
                    <button
                      onClick={() => {
                        setEditingId(account.id)
                        setNewBalance(account.balance)
                      }}
                      className="block mt-2 text-blue-600 hover:underline"
                    >
                      Изменить баланс
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {account.balance < 10 && editingId !== account.id && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                ⚠️ <strong>Внимание!</strong> При балансе менее $10 все карты этого банка скрыты для Junior'ов
              </div>
            )}
            
            {editingId === account.id && newBalance < 10 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                🚨 <strong>Предупреждение!</strong> Баланс менее $10 приведет к скрытию всех карт этого банка
              </div>
            )}
          </div>
        ))}
      </div>
      
      {accounts.length === 0 && !loading && (
        <div className="text-center text-gray-500 py-8">
          Банковские аккаунты не найдены
        </div>
      )}
    </div>
  )
}
