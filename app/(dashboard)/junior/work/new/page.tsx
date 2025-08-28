'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Casino {
  id: string;
  name: string;
}

interface Card {
  id: string;
  card_number_mask: string;
  bank_balance: number;
}

export default function NewWorkPage() {
  const router = useRouter();
  const [casinos, setCasinos] = useState<Casino[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCasino, setSelectedCasino] = useState('');
  const [selectedCard, setSelectedCard] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [casinoUsername, setCasinoUsername] = useState('');
  const [casinoPassword, setCasinoPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  useEffect(() => {
    loadCasinos();
  }, []);
  
  useEffect(() => {
    if (selectedCasino) {
      loadAvailableCards(selectedCasino);
    }
  }, [selectedCasino]);
  
  async function loadCasinos() {
    const supabase = createClient();
    const { data } = await supabase
      .from('casinos')
      .select('id, name')
      .eq('status', 'active');
    setCasinos(data || []);
  }
  
  async function loadAvailableCards(casinoId: string) {
    const res = await fetch(`/api/cards/available?casino_id=${casinoId}`);
    const data = await res.json();
    setCards(data.cards || []);
    
    if (data.cards?.length === 0) {
      setError('Нет доступных карт. Все банки имеют баланс < $10');
    } else {
      setError('');
    }
  }
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/works', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          casino_id: selectedCasino,
          card_id: selectedCard,
          deposit_amount: parseFloat(depositAmount),
          casino_username: casinoUsername,
          casino_password: casinoPassword
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error);
      }
      
      router.push('/junior/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Создать депозит</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded">
            {error}
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium mb-1">Казино</label>
          <select
            value={selectedCasino}
            onChange={(e) => setSelectedCasino(e.target.value)}
            className="w-full p-2 border rounded"
            required
          >
            <option value="">Выберите казино</option>
            {casinos.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        
        {selectedCasino && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Карта</label>
              {cards.length === 0 ? (
                <div className="p-3 bg-yellow-50 text-yellow-700 rounded">
                  Нет доступных карт (баланс всех банков менее $10)
                </div>
              ) : (
                <select
                  value={selectedCard}
                  onChange={(e) => setSelectedCard(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Выберите карту</option>
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.card_number_mask} | Баланс: ${c.bank_balance}
                    </option>
                  ))}
                </select>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Сумма депозита</label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full p-2 border rounded"
                min="10"
                step="0.01"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Логин в казино</label>
              <input
                type="text"
                value={casinoUsername}
                onChange={(e) => setCasinoUsername(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Пароль в казино</label>
              <input
                type="password"
                value={casinoPassword}
                onChange={(e) => setCasinoPassword(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </>
        )}
        
        <button
          type="submit"
          disabled={loading || cards.length === 0}
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Создание...' : 'Создать депозит'}
        </button>
      </form>
    </div>
  );
}