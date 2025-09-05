'use client'

import { useEffect, useState } from 'react'

export default function DebugWithdrawalsPage() {
  const [results, setResults] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function debugWithdrawals() {
      const tests = [
        { name: 'Currency Rates API', url: '/api/currency-rates' },
        { name: 'Manager Withdrawals API', url: '/api/manager/withdrawals' },
        { name: 'Manager Analytics API', url: '/api/manager/analytics' }
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

    debugWithdrawals()
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center mt-4">Диагностика API выводов...</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔍 Диагностика API выводов и валют</h1>
      
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="font-semibold text-blue-900 mb-2">📋 Проверяем:</h2>
        <div className="text-sm text-blue-800 space-y-1">
          <div>1. Currency Rates API - курсы валют</div>
          <div>2. Manager Withdrawals API - данные выводов</div>
          <div>3. Manager Analytics API - для сравнения</div>
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

            {/* Специальный анализ для каждого API */}
            {name === 'Currency Rates API' && result.ok && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                <h4 className="font-medium text-green-800 mb-2">✅ Анализ курсов валют:</h4>
                <div className="text-sm text-green-700 space-y-1">
                  {result.data.GBP && <div>GBP: {result.data.GBP} (должно быть ~1.2065)</div>}
                  {result.data.EUR && <div>EUR: {result.data.EUR} (должно быть ~1.0355)</div>}
                  {result.data.USD && <div>USD: {result.data.USD} (должно быть 0.95)</div>}
                </div>
              </div>
            )}

            {name === 'Manager Withdrawals API' && result.ok && result.data.data && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <h4 className="font-medium text-blue-800 mb-2">📊 Анализ данных выводов:</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <div>Всего записей: {result.data.data.length}</div>
                  {result.data.data.slice(0, 3).map((item: any, idx: number) => (
                    <div key={idx} className="border-l-2 border-blue-300 pl-2 mt-2">
                      <div>Запись {idx + 1}:</div>
                      <div>- casino_name: {item.casino_name}</div>
                      <div>- casino_currency: {item.casino_currency || 'НЕ УКАЗАНА!'}</div>
                      <div>- deposit_amount: {item.deposit_amount}</div>
                      <div>- withdrawal_amount: {item.withdrawal_amount}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h2 className="font-semibold text-yellow-900 mb-2">🛠️ Что проверить:</h2>
        <div className="text-sm text-yellow-800 space-y-2">
          <div><strong>Курсы валют:</strong> Загружаются ли правильно?</div>
          <div><strong>casino_currency:</strong> Есть ли это поле в данных выводов?</div>
          <div><strong>Суммы:</strong> Правильные ли значения deposit_amount и withdrawal_amount?</div>
        </div>
      </div>
    </div>
  )
}
