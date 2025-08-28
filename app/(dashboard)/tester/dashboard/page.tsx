'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface TesterStats {
  totalTests: number
  completedTests: number
  approvedTests: number
  rejectedTests: number
  pendingTests: number
  avgRegistrationTime: number
  avgWithdrawalTime: number
}

interface PendingTest {
  id: string
  casino_name: string
  casino_url: string
  status: string
  created_at: string
}

export default function TesterDashboard() {
  const [stats, setStats] = useState<TesterStats | null>(null)
  const [pendingTests, setPendingTests] = useState<PendingTest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        console.error('User not authenticated for tester dashboard')
        return
      }

      // Загружаем статистику тестера
      const { data: statsData } = await supabase
        .from('tester_statistics')
        .select('*')
        .eq('tester_id', user.id)
        .single()

      if (statsData) {
        setStats({
          totalTests: statsData.total_tests || 0,
          completedTests: statsData.completed_tests || 0,
          approvedTests: statsData.approved_tests || 0,
          rejectedTests: statsData.rejected_tests || 0,
          pendingTests: (statsData.total_tests || 0) - (statsData.completed_tests || 0),
          avgRegistrationTime: statsData.avg_registration_time || 0,
          avgWithdrawalTime: statsData.avg_withdrawal_time || 0
        })
      } else {
        // Если нет данных, устанавливаем нулевые значения
        setStats({
          totalTests: 0,
          completedTests: 0,
          approvedTests: 0,
          rejectedTests: 0,
          pendingTests: 0,
          avgRegistrationTime: 0,
          avgWithdrawalTime: 0
        })
      }

      // Загружаем активные тесты
      const { data: testsData } = await supabase
        .from('active_casino_tests')
        .select('id, casino_name, casino_url, status, created_at')
        .eq('tester_id', user.id)
        .order('created_at', { ascending: true })
        .limit(5)

      setPendingTests(testsData || [])

    } catch (error) {
      console.error('Error loading tester dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8">Загрузка...</div>

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Tester Dashboard</h1>
        <div className="flex gap-4">
          <Link 
            href="/tester/tests/new" 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Новый тест
          </Link>
          <Link 
            href="/tester/casinos" 
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Управление казино
          </Link>
        </div>
      </div>

      {/* KPI карточки */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-sm text-gray-500">Всего тестов</div>
          <div className="text-3xl font-bold text-blue-600">{stats?.totalTests}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-sm text-gray-500">Завершено</div>
          <div className="text-3xl font-bold text-green-600">{stats?.completedTests}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-sm text-gray-500">Одобрено</div>
          <div className="text-3xl font-bold text-emerald-600">{stats?.approvedTests}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-sm text-gray-500">Отклонено</div>
          <div className="text-3xl font-bold text-red-600">{stats?.rejectedTests}</div>
        </div>
      </div>

      {/* Дополнительная статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-sm text-gray-500">В ожидании</div>
          <div className="text-2xl font-bold text-yellow-600">{stats?.pendingTests}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-sm text-gray-500">Среднее время регистрации</div>
          <div className="text-2xl font-bold text-purple-600">
            {stats?.avgRegistrationTime ? `${Math.round(stats.avgRegistrationTime / 60)} мин` : 'N/A'}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-sm text-gray-500">Среднее время вывода</div>
          <div className="text-2xl font-bold text-indigo-600">
            {stats?.avgWithdrawalTime ? `${Math.round(stats.avgWithdrawalTime / 60)} мин` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Активные тесты */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Активные тесты</h2>
        </div>
        <div className="p-6">
          {pendingTests.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>Нет активных тестов</p>
              <Link 
                href="/tester/tests/new" 
                className="text-blue-600 hover:underline mt-2 inline-block"
              >
                Создать новый тест
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingTests.map(test => (
                <div key={test.id} className="flex justify-between items-center p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-semibold">{test.casino_name}</h3>
                    <p className="text-sm text-gray-500">{test.casino_url}</p>
                    <p className="text-xs text-gray-400">
                      Создан: {new Date(test.created_at).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      test.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      test.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {test.status === 'pending' ? 'Ожидает' :
                       test.status === 'in_progress' ? 'В процессе' : test.status}
                    </span>
                    <Link 
                      href={`/tester/tests/${test.id}`}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Открыть
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Быстрые действия */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link 
          href="/tester/tests" 
          className="bg-blue-50 hover:bg-blue-100 p-6 rounded-lg text-blue-800 font-medium text-center transition-colors group"
        >
          <div className="text-2xl mb-2">🧪</div>
          <div className="font-semibold">Управление тестами</div>
          <div className="text-xs text-blue-600 mt-1">Создать, запустить, завершить тесты</div>
        </Link>
        <Link 
          href="/tester/casinos" 
          className="bg-green-50 hover:bg-green-100 p-6 rounded-lg text-green-800 font-medium text-center transition-colors group"
        >
          <div className="text-2xl mb-2">🎰</div>
          <div className="font-semibold">Казино</div>
          <div className="text-xs text-green-600 mt-1">Просмотр и тестирование казино</div>
        </Link>
        <Link 
          href="/tester/manuals" 
          className="bg-purple-50 hover:bg-purple-100 p-6 rounded-lg text-purple-800 font-medium text-center transition-colors group"
        >
          <div className="text-2xl mb-2">📋</div>
          <div className="font-semibold">Мануалы</div>
          <div className="text-xs text-purple-600 mt-1">Создание инструкций для казино</div>
        </Link>
        <Link 
          href="/tester/reports" 
          className="bg-orange-50 hover:bg-orange-100 p-6 rounded-lg text-orange-800 font-medium text-center transition-colors group"
        >
          <div className="text-2xl mb-2">📊</div>
          <div className="font-semibold">Отчеты</div>
          <div className="text-xs text-orange-600 mt-1">Статистика и аналитика</div>
        </Link>
      </div>
    </div>
  )
}
