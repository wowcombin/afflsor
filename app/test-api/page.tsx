'use client'

import { useEffect, useState } from 'react'

export default function TestApiPage() {
  const [results, setResults] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function testApis() {
      const tests = [
        { name: 'Analytics API', url: '/api/manager/analytics' },
        { name: 'Users API', url: '/api/users/me' },
        { name: 'Works API', url: '/api/works' },
        { name: 'Work Withdrawals API', url: '/api/work-withdrawals' }
      ]

      const testResults: any = {}

      for (const test of tests) {
        try {
          console.log(`Testing ${test.name}...`)
          const response = await fetch(test.url)
          const data = await response.json()
          
          testResults[test.name] = {
            status: response.status,
            ok: response.ok,
            data: data,
            error: null
          }
        } catch (error) {
          testResults[test.name] = {
            status: 'ERROR',
            ok: false,
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }

      setResults(testResults)
      setLoading(false)
    }

    testApis()
  }, [])

  if (loading) {
    return <div className="p-8">Тестирование API...</div>
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Тестирование API</h1>
      
      <div className="space-y-6">
        {Object.entries(results).map(([name, result]: [string, any]) => (
          <div key={name} className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{name}</h2>
              <div className={`px-3 py-1 rounded text-sm font-medium ${
                result.ok 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {result.status}
              </div>
            </div>
            
            {result.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                <strong>Error:</strong> {result.error}
              </div>
            )}
            
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  )
}
