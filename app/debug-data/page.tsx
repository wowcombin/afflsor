'use client'

import { useState } from 'react'

export default function DebugDataPage() {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testQueries = async () => {
    setLoading(true)
    try {
      // Тестируем разные запросы к базе данных
      const queries = [
        { name: 'Все пользователи', url: '/api/users' },
        { name: 'Все работы', url: '/api/works' },
        { name: 'Все выводы', url: '/api/work-withdrawals' },
        { name: 'Аналитика менеджера', url: '/api/manager/analytics' },
        { name: 'Выводы менеджера', url: '/api/manager/withdrawals' }
      ]

      const testResults: any = {}
      
      for (const query of queries) {
        try {
          const response = await fetch(query.url)
          const data = await response.json()
          testResults[query.name] = {
            status: response.status,
            success: data.success || response.ok,
            count: data.data?.length || data.works?.length || data.count || 0,
            data: data
          }
        } catch (error) {
          testResults[query.name] = {
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }
      
      setResults(testResults)
    } catch (error) {
      console.error('Test error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🔍 Диагностика данных</h1>
      
      <button 
        onClick={testQueries}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        {loading ? 'Тестирование...' : 'Тестировать все API'}
      </button>

      {results && (
        <div className="space-y-4">
          {Object.entries(results).map(([name, result]: [string, any]) => (
            <div key={name} className="border rounded p-4">
              <h2 className="font-bold text-lg mb-2">{name}</h2>
              <div className="grid grid-cols-2 gap-4 mb-2">
                <div>Статус: <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                  {result.status} {result.success ? '✅' : '❌'}
                </span></div>
                <div>Записей: <strong>{result.count}</strong></div>
              </div>
              
              {result.error && (
                <div className="text-red-600 mb-2">Ошибка: {result.error}</div>
              )}
              
              <details className="mt-2">
                <summary className="cursor-pointer text-blue-600">Показать данные</summary>
                <pre className="text-xs bg-gray-100 p-2 mt-2 overflow-auto max-h-64">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
