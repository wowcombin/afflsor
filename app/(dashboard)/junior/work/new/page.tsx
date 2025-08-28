'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import FormCard from '@/components/ui/FormCard'
import Alert from '@/components/ui/Alert'
import StatusBadge from '@/components/ui/StatusBadge'

interface Casino {
  id: string
  name: string
  url?: string
  auto_approve_limit?: number
  status?: string
}

interface Card {
  id: string
  card_number_mask: string
  bank_balance: number
  exp_month?: number
  exp_year?: number
  bank_name?: string
}

export default function NewWorkPage() {
  const router = useRouter()
  const [casinos, setCasinos] = useState<Casino[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [selectedCasino, setSelectedCasino] = useState('')
  const [selectedCard, setSelectedCard] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [casinoUsername, setCasinoUsername] = useState('')
  const [casinoPassword, setCasinoPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  useEffect(() => {
    loadCasinos()
  }, [])
  
  useEffect(() => {
    if (selectedCasino) {
      loadAvailableCards(selectedCasino)
    }
  }, [selectedCasino])
  
  async function loadCasinos() {
    const supabase = createClient()
    const { data } = await supabase
      .from('casinos')
      .select('id, name, url, auto_approve_limit, status')
      .eq('status', 'approved')
    setCasinos(data || [])
  }
  
  async function loadAvailableCards(casinoId: string) {
    const res = await fetch(`/api/cards/available?casino_id=${casinoId}`)
    const data = await res.json()
    setCards(data.cards || [])
    if (data.cards?.length === 0) {
      setError('Нет доступных карт. Все банки имеют баланс менее $10')
    } else {
      setError('')
    }
  }
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const supabase = createClient()
      const res = await fetch('/api/works', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          casino_id: selectedCasino,
          card_id: selectedCard,
          deposit_amount: parseFloat(depositAmount),
          casino_username: casinoUsername,
          casino_password: casinoPassword
        })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error)
      }
      
      router.push('/junior/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const selectedCasinoData = casinos.find(c => c.id === selectedCasino)
  const selectedCardData = cards.find(c => c.id === selectedCard)

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Создать новый депозит</h1>
          <p className="text-gray-600 mt-2">Выберите казино и карту для создания депозита</p>
        </div>
        <button
          onClick={() => router.push('/junior/dashboard')}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Назад
        </button>
      </div>

      {error && (
        <div className="mb-6">
          <Alert variant="error" title="Ошибка" onClose={() => setError('')}>
            {error}
          </Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Выбор казино */}
        <FormCard 
          title="Выбор казино" 
          description="Выберите казино для создания депозита"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Казино</label>
              <select
                value={selectedCasino}
                onChange={(e) => setSelectedCasino(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Выберите казино</option>
                {casinos.map((casino) => (
                  <option key={casino.id} value={casino.id}>
                    {casino.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedCasinoData && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Информация о казино</h4>
                <div className="space-y-1 text-sm text-blue-800">
                  <p><strong>Название:</strong> {selectedCasinoData.name}</p>
                  {selectedCasinoData.url && (
                    <p><strong>URL:</strong> 
                      <a href={selectedCasinoData.url} target="_blank" rel="noopener noreferrer" className="ml-1 underline hover:no-underline">
                        {selectedCasinoData.url}
                      </a>
                    </p>
                  )}
                  {selectedCasinoData.auto_approve_limit && (
                    <p><strong>Лимит автоподтверждения:</strong> ${selectedCasinoData.auto_approve_limit}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </FormCard>

        {/* Выбор карты */}
        {selectedCasino && (
          <FormCard 
            title="Выбор карты" 
            description="Выберите карту с достаточным балансом для депозита"
          >
            {cards.length === 0 ? (
              <Alert variant="warning" title="Нет доступных карт">
                Все банки имеют баланс менее $10. Обратитесь к менеджеру для пополнения балансов.
              </Alert>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cards.map((card) => (
                    <div
                      key={card.id}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedCard === card.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedCard(card.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-lg font-semibold">
                          {card.card_number_mask}
                        </span>
                        <input
                          type="radio"
                          name="card"
                          value={card.id}
                          checked={selectedCard === card.id}
                          onChange={() => setSelectedCard(card.id)}
                          className="text-blue-600"
                        />
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        {card.bank_name && <p><strong>Банк:</strong> {card.bank_name}</p>}
                        <p><strong>Баланс:</strong> 
                          <span className={`ml-1 font-semibold ${
                            card.bank_balance >= 100 ? 'text-green-600' :
                            card.bank_balance >= 50 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            ${card.bank_balance.toFixed(2)}
                          </span>
                        </p>
                        {card.exp_month && card.exp_year && (
                          <p><strong>Срок:</strong> {card.exp_month.toString().padStart(2, '0')}/{card.exp_year}</p>
                        )}
                      </div>
                      <div className="mt-2">
                        <StatusBadge 
                          status={card.bank_balance >= 10 ? 'active' : 'blocked'} 
                          type="card" 
                          size="sm" 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </FormCard>
        )}

        {/* Детали депозита */}
        {selectedCard && (
          <FormCard 
            title="Детали депозита" 
            description="Укажите сумму и данные для входа в казино"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Сумма депозита ($)</label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="10"
                  max={selectedCardData?.bank_balance || 1000}
                  step="0.01"
                  placeholder="Введите сумму депозита"
                  required
                />
                {selectedCardData && depositAmount && (
                  <p className="mt-1 text-sm text-gray-500">
                    Остаток после депозита: ${(selectedCardData.bank_balance - parseFloat(depositAmount || '0')).toFixed(2)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Логин в казино</label>
                <input
                  type="text"
                  value={casinoUsername}
                  onChange={(e) => setCasinoUsername(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Введите логин"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Пароль в казино</label>
                <input
                  type="password"
                  value={casinoPassword}
                  onChange={(e) => setCasinoPassword(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Введите пароль"
                  required
                />
              </div>
            </div>
          </FormCard>
        )}

        {/* Кнопки действий */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.push('/junior/dashboard')}
            className="flex-1 py-3 px-6 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={loading || cards.length === 0 || !selectedCard}
            className="flex-1 py-3 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Создание депозита...
              </span>
            ) : (
              'Создать депозит'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}