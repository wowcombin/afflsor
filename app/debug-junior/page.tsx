'use client'

import { useEffect, useState } from 'react'

export default function DebugJuniorPage() {
  const [results, setResults] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function debugJunior() {
      const tests = [
        { name: 'Auth Check', url: '/api/users/me' },
        { name: 'Works API', url: '/api/works' },
        { name: 'Work Withdrawals API', url: '/api/work-withdrawals' }
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

    debugJunior()
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center mt-4">Диагностика Junior API...</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔍 Диагностика Junior API</h1>
      
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="font-semibold text-blue-900 mb-2">📋 Проверяем доступ Junior:</h2>
        <div className="text-sm text-blue-800 space-y-1">
          <div>1. Auth Check - аутентификация пользователя</div>
          <div>2. Works API - доступ к работам Junior</div>
          <div>3. Work Withdrawals API - доступ к выводам Junior</div>
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
        <h2 className="font-semibold text-yellow-900 mb-2">🛠️ Если есть ошибки:</h2>
        <div className="text-sm text-yellow-800 space-y-2">
          <div><strong>401/403:</strong> Проблема с RLS политиками для Junior</div>
          <div><strong>500:</strong> Проблема в API или базе данных</div>
          <div><strong>Network Error:</strong> Проблема с подключением</div>
        </div>
      </div>
    </div>
  )
}
