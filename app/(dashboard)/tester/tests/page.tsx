'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface CasinoTest {
  id: string
  casino_id: string
  status: string
  registration_time?: number
  deposit_success: boolean
  withdrawal_time?: number
  test_result?: string
  notes?: string
  created_at: string
  completed_at?: string
  casinos: {
    name: string
    url: string
    status: string
  }
}

export default function TesterTestsPage() {
  const [tests, setTests] = useState<CasinoTest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    loadTests()
  }, [filter])

  async function loadTests() {
    try {
      const url = filter === 'all' ? '/api/casino-tests' : `/api/casino-tests?status=${filter}`
      const response = await fetch(url)
      const data = await response.json()
      
      if (response.ok) {
        setTests(data.tests || [])
      } else {
        console.error('Error loading tests:', data.error)
      }
    } catch (error) {
      console.error('Error loading tests:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Ожидает'
      case 'in_progress': return 'В процессе'
      case 'completed': return 'Завершен'
      case 'failed': return 'Провален'
      default: return status
    }
  }

  const getTestResultColor = (result?: string) => {
    switch (result) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTestResultLabel = (result?: string) => {
    switch (result) {
      case 'approved': return 'Одобрено'
      case 'rejected': return 'Отклонено'
      default: return 'Не определено'
    }
  }

  const formatTime = (seconds?: number) => {
    if (!seconds) return 'N/A'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}м ${remainingSeconds}с`
  }

  if (loading) return <div className="p-8">Загрузка...</div>

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Мои тесты</h1>
        <Link
          href="/tester/casinos"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Выбрать казино для теста
        </Link>
      </div>

      {/* Фильтры */}
      <div className="mb-6">
        <div className="flex gap-2">
          {['all', 'pending', 'in_progress', 'completed', 'failed'].map(status => (
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

      {/* Список тестов */}
      <div className="bg-white rounded-lg shadow-md">
        {tests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>Тесты не найдены</p>
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
                    Результат
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Время регистрации
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Время вывода
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Депозит
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Создан
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tests.map(test => (
                  <tr key={test.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{test.casinos.name}</div>
                        <div className="text-sm text-gray-500">
                          <a href={test.casinos.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {test.casinos.url}
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(test.status)}`}>
                        {getStatusLabel(test.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTestResultColor(test.test_result)}`}>
                        {getTestResultLabel(test.test_result)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTime(test.registration_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTime(test.withdrawal_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        test.deposit_success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {test.deposit_success ? 'Успешно' : 'Неудачно'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(test.created_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/tester/tests/${test.id}`}
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      >
                        {test.status === 'pending' || test.status === 'in_progress' ? 'Продолжить' : 'Просмотр'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Статистика */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-sm text-gray-500">Всего тестов</div>
          <div className="text-2xl font-bold text-blue-600">{tests.length}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-sm text-gray-500">Завершено</div>
          <div className="text-2xl font-bold text-green-600">
            {tests.filter(t => t.status === 'completed').length}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-sm text-gray-500">Одобрено</div>
          <div className="text-2xl font-bold text-emerald-600">
            {tests.filter(t => t.test_result === 'approved').length}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-sm text-gray-500">Отклонено</div>
          <div className="text-2xl font-bold text-red-600">
            {tests.filter(t => t.test_result === 'rejected').length}
          </div>
        </div>
      </div>
    </div>
  )
}
