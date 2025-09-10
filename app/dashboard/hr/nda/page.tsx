'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import KPICard from '@/components/ui/KPICard'
import { useToast } from '@/components/ui/Toast'
import { 
  DocumentTextIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'

interface NDAStats {
  totalAgreements: number
  signedAgreements: number
  pendingAgreements: number
  usersWithoutNDA: number
  recentActivity: Array<{
    id: string
    full_name: string
    action: string
    date: string
  }>
}

export default function HRNDAOverviewPage() {
  const router = useRouter()
  const { addToast } = useToast()
  
  const [stats, setStats] = useState<NDAStats>({
    totalAgreements: 0,
    signedAgreements: 0,
    pendingAgreements: 0,
    usersWithoutNDA: 0,
    recentActivity: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Получаем статистику NDA
      const ndaResponse = await fetch('/api/nda/agreements')
      const ndaData = await ndaResponse.json()
      
      // Получаем пользователей
      const usersResponse = await fetch('/api/users')
      const usersData = await usersResponse.json()
      
      if (ndaData.success && usersData.success) {
        const agreements = ndaData.data
        const users = usersData.data
        
        setStats({
          totalAgreements: agreements.length,
          signedAgreements: agreements.filter((a: any) => a.status === 'signed').length,
          pendingAgreements: agreements.filter((a: any) => a.status === 'pending').length,
          usersWithoutNDA: users.filter((u: any) => !u.nda_signed).length,
          recentActivity: agreements
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5)
            .map((a: any) => ({
              id: a.id,
              full_name: a.full_name || 'Неизвестно',
              action: a.status === 'signed' ? 'Подписал NDA' : 'Создано соглашение',
              date: a.signed_date || a.created_at
            }))
        })
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Не удалось загрузить статистику' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* KPI карточки */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Всего соглашений"
          value={stats.totalAgreements}
          icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
          color="primary"
          loading={loading}
        />
        <KPICard
          title="Подписанных"
          value={stats.signedAgreements}
          icon={<CheckCircleIcon className="w-6 h-6" />}
          color="success"
          loading={loading}
        />
        <KPICard
          title="Ожидают подписания"
          value={stats.pendingAgreements}
          icon={<ClockIcon className="w-6 h-6" />}
          color="warning"
          loading={loading}
        />
        <KPICard
          title="Без NDA"
          value={stats.usersWithoutNDA}
          icon={<ExclamationTriangleIcon className="w-6 h-6" />}
          color="danger"
          loading={loading}
        />
      </div>

      {/* Быстрые действия */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card hover:shadow-md transition-shadow cursor-pointer" 
             onClick={() => router.push('/dashboard/hr/nda/generate')}>
          <div className="flex items-center p-6">
            <UserGroupIcon className="w-8 h-8 text-blue-600 mr-4" />
            <div>
              <h3 className="font-semibold text-gray-900">Создать NDA</h3>
              <p className="text-sm text-gray-500">Генерация ссылок для подписания</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md transition-shadow cursor-pointer"
             onClick={() => router.push('/dashboard/hr/nda/agreements')}>
          <div className="flex items-center p-6">
            <ClipboardDocumentListIcon className="w-8 h-8 text-green-600 mr-4" />
            <div>
              <h3 className="font-semibold text-gray-900">Все соглашения</h3>
              <p className="text-sm text-gray-500">Просмотр подписанных NDA</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md transition-shadow cursor-pointer"
             onClick={() => router.push('/dashboard/hr/nda/templates')}>
          <div className="flex items-center p-6">
            <DocumentTextIcon className="w-8 h-8 text-purple-600 mr-4" />
            <div>
              <h3 className="font-semibold text-gray-900">Шаблоны</h3>
              <p className="text-sm text-gray-500">Управление шаблонами NDA</p>
            </div>
          </div>
        </div>
      </div>

      {/* Последняя активность */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">Последняя активность</h3>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-pulse text-gray-500">Загрузка...</div>
            </div>
          ) : stats.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <div>
                      <p className="font-medium text-gray-900">{activity.full_name}</p>
                      <p className="text-sm text-gray-500">{activity.action}</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    {new Date(activity.date).toLocaleDateString('ru-RU')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Нет активности
            </div>
          )}
        </div>
      </div>

      {/* Статистика по ролям */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Статус NDA</h3>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Подписанных</span>
                <div className="flex items-center">
                  <div className="w-20 bg-gray-200 rounded-full h-2 mr-3">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ 
                        width: `${stats.totalAgreements > 0 ? (stats.signedAgreements / stats.totalAgreements) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  <span className="font-semibold">{stats.signedAgreements}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Ожидают</span>
                <div className="flex items-center">
                  <div className="w-20 bg-gray-200 rounded-full h-2 mr-3">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full" 
                      style={{ 
                        width: `${stats.totalAgreements > 0 ? (stats.pendingAgreements / stats.totalAgreements) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  <span className="font-semibold">{stats.pendingAgreements}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Без NDA</span>
                <div className="flex items-center">
                  <div className="w-20 bg-gray-200 rounded-full h-2 mr-3">
                    <div 
                      className="bg-red-500 h-2 rounded-full" 
                      style={{ 
                        width: `${(stats.totalAgreements + stats.usersWithoutNDA) > 0 ? (stats.usersWithoutNDA / (stats.totalAgreements + stats.usersWithoutNDA)) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  <span className="font-semibold">{stats.usersWithoutNDA}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Быстрые ссылки</h3>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              <button 
                onClick={() => router.push('/dashboard/hr/nda/agreements')}
                className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <ClipboardDocumentListIcon className="w-5 h-5 text-gray-400 mr-3" />
                  <span>Просмотреть все соглашения</span>
                </div>
              </button>
              <button 
                onClick={() => router.push('/dashboard/hr/nda/generate')}
                className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <UserGroupIcon className="w-5 h-5 text-gray-400 mr-3" />
                  <span>Создать новое NDA</span>
                </div>
              </button>
              <button 
                onClick={() => router.push('/dashboard/hr/nda/settings')}
                className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <Cog6ToothIcon className="w-5 h-5 text-gray-400 mr-3" />
                  <span>Настройки системы</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
