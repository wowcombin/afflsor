'use client'

import { useState } from 'react'

export default function DebugTeamPage() {
  const [teamData, setTeamData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testTeamAPI = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/manager/team')
      const data = await response.json()
      setTeamData(data)
      console.log('Team API Response:', data)
    } catch (error) {
      console.error('Team API Error:', error)
      setTeamData({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🔍 Диагностика API команды</h1>
      
      <button 
        onClick={testTeamAPI}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        {loading ? 'Загрузка...' : 'Тестировать API команды'}
      </button>

      {teamData && (
        <div className="space-y-4">
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="font-bold mb-2">Статус ответа:</h2>
            <p className={teamData.success ? 'text-green-600' : 'text-red-600'}>
              {teamData.success ? '✅ Успешно' : '❌ Ошибка'}
            </p>
            {teamData.error && (
              <p className="text-red-600">Ошибка: {teamData.error}</p>
            )}
          </div>

          {teamData.success && (
            <>
              <div className="bg-blue-50 p-4 rounded">
                <h2 className="font-bold mb-2">📊 Статистика команды:</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>Всего Junior'ов: <strong>{teamData.team_stats?.total_juniors || 0}</strong></div>
                  <div>Активных: <strong>{teamData.team_stats?.active_juniors || 0}</strong></div>
                  <div>Аккаунтов за месяц: <strong>{teamData.team_stats?.total_monthly_accounts || 0}</strong></div>
                  <div>Профит команды: <strong>${(teamData.team_stats?.total_monthly_profit || 0).toFixed(2)}</strong></div>
                  <div>Средняя успешность: <strong>{teamData.team_stats?.avg_success_rate || 0}%</strong></div>
                  <div>Ожидают выводы: <strong>{teamData.team_stats?.pending_withdrawals || 0}</strong></div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded">
                <h2 className="font-bold mb-2">👥 Junior'ы ({teamData.data?.length || 0}):</h2>
                {teamData.data?.map((junior: any, index: number) => (
                  <div key={junior.id} className="border-b pb-2 mb-2">
                    <div className="font-medium">{junior.first_name} {junior.last_name}</div>
                    <div className="text-sm text-gray-600">
                      Аккаунты: {junior.stats?.total_accounts || 0} | 
                      За месяц: {junior.stats?.monthly_accounts || 0} | 
                      Успешность: {junior.stats?.success_rate || 0}% | 
                      Профит: ${(junior.stats?.total_profit || 0).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="bg-gray-50 p-4 rounded">
            <h2 className="font-bold mb-2">🔍 Полный ответ API:</h2>
            <pre className="text-xs overflow-auto max-h-96">
              {JSON.stringify(teamData, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
