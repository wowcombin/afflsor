'use client'

import { useEffect, useState } from 'react'

export default function DebugAnalyticsPage() {
  const [results, setResults] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function debugAnalytics() {
      const tests = [
        { name: 'Auth Check', url: '/api/users/me' },
        { name: 'Users Table', url: '/api/users' },
        { name: 'Works Table', url: '/api/works' },
        { name: 'Work Withdrawals', url: '/api/work-withdrawals' },
        { name: 'Analytics API', url: '/api/manager/analytics' }
      ]

      const testResults: any = {}

      for (const test of tests) {
        try {
          console.log(`Testing ${test.name}...`)
          const response = await fetch(test.url)
          
          let data
          try {
            data = await response.json()
          } catch {
            data = await response.text()
          }
          
          testResults[test.name] = {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries()),
            data: data,
            error: null
          }
        } catch (error) {
          testResults[test.name] = {
            status: 'NETWORK_ERROR',
            ok: false,
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }

      setResults(testResults)
      setLoading(false)
    }

    debugAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center mt-4">Диагностика API...</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔍 Диагностика API Аналитики</h1>
      
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="font-semibold text-blue-900 mb-2">📋 Инструкции:</h2>
        <div className="text-sm text-blue-800 space-y-1">
          <div>1. Проверьте каждый API endpoint ниже</div>
          <div>2. Красные статусы указывают на проблемы</div>
          <div>3. Если "Auth Check" не работает - проблема с аутентификацией</div>
          <div>4. Если другие API не работают - проблема с RLS политиками</div>
        </div>
      </div>
      
      <div className="space-y-6">
        {Object.entries(results).map(([name, result]: [string, any]) => (
          <div key={name} className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{name}</h2>
              <div className={`px-3 py-1 rounded text-sm font-medium ${
                result.ok 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {result.status} {result.statusText}
              </div>
            </div>
            
            {result.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                <strong className="text-red-800">Network Error:</strong> 
                <span className="text-red-700 ml-2">{result.error}</span>
              </div>
            )}

            {result.headers && (
              <div className="mb-4">
                <h3 className="font-medium text-gray-700 mb-2">Headers:</h3>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                  {JSON.stringify(result.headers, null, 2)}
                </pre>
              </div>
            )}
            
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Response Data:</h3>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
                {typeof result.data === 'string' 
                  ? result.data 
                  : JSON.stringify(result.data, null, 2)
                }
              </pre>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h2 className="font-semibold text-yellow-900 mb-2">🛠️ Возможные решения:</h2>
        <div className="text-sm text-yellow-800 space-y-2">
          <div><strong>401 Unauthorized:</strong> Перелогиньтесь в системе</div>
          <div><strong>403 Forbidden:</strong> Выполните SQL скрипт fix_all_rls_policies.sql</div>
          <div><strong>500 Internal Error:</strong> Проблема с базой данных или API</div>
          <div><strong>Network Error:</strong> Проблема с подключением к серверу</div>
        </div>
      </div>
    </div>
  )
}
