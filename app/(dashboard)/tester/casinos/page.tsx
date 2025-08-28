'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Casino {
  id: string
  name: string
  url: string
  status: string
  allowed_bins?: string[]
  auto_approve_limit: number
  created_at: string
  updated_at: string
}

export default function TesterCasinosPage() {
  const [casinos, setCasinos] = useState<Casino[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newCasino, setNewCasino] = useState({
    name: '',
    url: '',
    auto_approve_limit: 200
  })

  useEffect(() => {
    loadCasinos()
  }, [filter])

  async function loadCasinos() {
    try {
      const url = filter === 'all' ? '/api/casinos' : `/api/casinos?status=${filter}`
      const response = await fetch(url)
      const data = await response.json()
      
      if (response.ok) {
        setCasinos(data.casinos || [])
      } else {
        console.error('Error loading casinos:', data.error)
      }
    } catch (error) {
      console.error('Error loading casinos:', error)
    } finally {
      setLoading(false)
    }
  }

  async function createCasino() {
    try {
      const response = await fetch('/api/casinos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newCasino)
      })

      const data = await response.json()

      if (response.ok) {
        setShowCreateForm(false)
        setNewCasino({ name: '', url: '', auto_approve_limit: 200 })
        loadCasinos()
      } else {
        alert('Ошибка создания казино: ' + data.error)
      }
    } catch (error) {
      console.error('Error creating casino:', error)
      alert('Ошибка создания казино')
    }
  }

  async function startTest(casinoId: string) {
    try {
      const response = await fetch('/api/casino-tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ casino_id: casinoId })
      })

      const data = await response.json()

      if (response.ok) {
        alert('Тест создан успешно!')
        loadCasinos()
      } else {
        alert('Ошибка создания теста: ' + data.error)
      }
    } catch (error) {
      console.error('Error starting test:', error)
      alert('Ошибка создания теста')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'testing': return 'bg-blue-100 text-blue-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'maintenance': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Ожидает'
      case 'testing': return 'Тестируется'
      case 'approved': return 'Одобрено'
      case 'rejected': return 'Отклонено'
      case 'maintenance': return 'Обслуживание'
      default: return status
    }
  }

  if (loading) return <div className="p-8">Загрузка...</div>

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Управление казино</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Добавить казино
        </button>
      </div>

      {/* Фильтры */}
      <div className="mb-6">
        <div className="flex gap-2">
          {['all', 'pending', 'testing', 'approved', 'rejected'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {status === 'all' ? 'Все' : getStatusLabel(status)}
            </button>
          ))}
        </div>
      </div>

      {/* Форма создания казино */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Добавить новое казино</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Название</label>
                <input
                  type="text"
                  value={newCasino.name}
                  onChange={(e) => setNewCasino({ ...newCasino, name: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">URL</label>
                <input
                  type="url"
                  value={newCasino.url}
                  onChange={(e) => setNewCasino({ ...newCasino, url: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Лимит автоподтверждения ($)</label>
                <input
                  type="number"
                  value={newCasino.auto_approve_limit}
                  onChange={(e) => setNewCasino({ ...newCasino, auto_approve_limit: Number(e.target.value) })}
                  className="w-full p-2 border rounded"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setShowCreateForm(false)}
                className="flex-1 bg-gray-400 text-white py-2 rounded hover:bg-gray-500"
              >
                Отмена
              </button>
              <button
                onClick={createCasino}
                className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Список казино */}
      <div className="bg-white rounded-lg shadow-md">
        {casinos.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>Казино не найдены</p>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="text-blue-600 hover:underline mt-2"
              >
                Показать все
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Казино
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Лимит
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Создано
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {casinos.map(casino => (
                  <tr key={casino.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{casino.name}</div>
                        <div className="text-sm text-gray-500">
                          <a href={casino.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {casino.url}
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(casino.status)}`}>
                        {getStatusLabel(casino.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${casino.auto_approve_limit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(casino.created_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {casino.status === 'pending' && (
                        <button
                          onClick={() => startTest(casino.id)}
                          className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                        >
                          Начать тест
                        </button>
                      )}
                      <Link
                        href={`/tester/casinos/${casino.id}`}
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 inline-block"
                      >
                        Детали
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
