'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewUserPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    role: 'junior',
    first_name: '',
    last_name: '',
    telegram_username: '',
    usdt_wallet: '',
    salary_percentage: '10',
    salary_bonus: '0'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{
    password: string
    nda_link: string
  } | null>(null)
  
  function validateUSDTWallet(wallet: string): boolean {
    // TRC20 USDT адрес начинается с T и имеет длину 34 символа
    return /^T[A-Za-z0-9]{33}$/.test(wallet)
  }
  
  function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    
    // Валидация
    if (!validateEmail(formData.email)) {
      setError('Некорректный email адрес')
      return
    }
    
    if (formData.usdt_wallet && !validateUSDTWallet(formData.usdt_wallet)) {
      setError('Некорректный USDT кошелек (должен быть TRC20)')
      return
    }
    
    const percentage = parseFloat(formData.salary_percentage)
    if (percentage < 0 || percentage > 100) {
      setError('Процент зарплаты должен быть от 0 до 100')
      return
    }
    
    const bonus = parseFloat(formData.salary_bonus)
    if (bonus < 0) {
      setError('Бонус не может быть отрицательным')
      return
    }
    
    setLoading(true)
    
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          salary_percentage: percentage,
          salary_bonus: bonus
        })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error)
      }
      
      setSuccess({
        password: data.password,
        nda_link: data.nda_link
      })
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  if (success) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h1 className="text-xl font-bold text-green-800 mb-4">
            Пользователь успешно создан!
          </h1>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-green-700">
                Временный пароль:
              </label>
              <div className="mt-1 p-3 bg-white border rounded font-mono text-lg">
                {success.password}
              </div>
              <p className="text-sm text-green-600 mt-1">
                Сохраните пароль и передайте пользователю
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-green-700">
                Ссылка на NDA:
              </label>
              <div className="mt-1">
                <a
                  href={success.nda_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  {success.nda_link}
                </a>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => router.push('/hr/dashboard')}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Вернуться к Dashboard
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Создать еще
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Создать пользователя</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Роль <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              className="w-full p-2 border rounded"
              required
            >
              <option value="junior">Junior</option>
              <option value="tester">Tester</option>
              <option value="manager">Manager</option>
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Имя</label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Фамилия</label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Telegram username</label>
          <input
            type="text"
            value={formData.telegram_username}
            onChange={(e) => setFormData(prev => ({ ...prev, telegram_username: e.target.value }))}
            className="w-full p-2 border rounded"
            placeholder="@username"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">
            USDT кошелек (TRC20)
          </label>
          <input
            type="text"
            value={formData.usdt_wallet}
            onChange={(e) => setFormData(prev => ({ ...prev, usdt_wallet: e.target.value }))}
            className="w-full p-2 border rounded"
            placeholder="TXXXxxxXXXxxxXXXxxxXXXxxxXXXxxxXXX"
          />
          {formData.usdt_wallet && !validateUSDTWallet(formData.usdt_wallet) && (
            <p className="text-sm text-red-500 mt-1">
              Некорректный TRC20 адрес
            </p>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Процент зарплаты (0-100)
            </label>
            <input
              type="number"
              value={formData.salary_percentage}
              onChange={(e) => setFormData(prev => ({ ...prev, salary_percentage: e.target.value }))}
              className="w-full p-2 border rounded"
              min="0"
              max="100"
              step="0.1"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Фиксированный бонус ($)
            </label>
            <input
              type="number"
              value={formData.salary_bonus}
              onChange={(e) => setFormData(prev => ({ ...prev, salary_bonus: e.target.value }))}
              className="w-full p-2 border rounded"
              min="0"
              step="0.01"
            />
          </div>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Создание...' : 'Создать пользователя'}
        </button>
      </form>
    </div>
  )
}
