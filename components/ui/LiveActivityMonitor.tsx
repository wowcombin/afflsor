'use client'

import { useState, useEffect } from 'react'
import { 
  ArrowDownIcon, 
  ArrowUpIcon, 
  UserPlusIcon,
  ClockIcon,
  WifiIcon
} from '@heroicons/react/24/outline'

interface Activity {
  id: string
  time: string
  user: string
  action: string
  details: string
  type: 'deposit' | 'withdrawal' | 'assignment' | 'other'
  status: string
  impact: 'positive' | 'negative' | 'neutral'
}

interface ActivityStats {
  totalActivities: number
  depositsCount: number
  withdrawalsCount: number
  assignmentsCount: number
  successfulActions: number
  problematicActions: number
}

interface TeamStatus {
  onlineJuniors: number
  totalJuniors: number
  onlinePercentage: number
}

interface LiveActivityMonitorProps {
  activities: Activity[]
  stats: ActivityStats
  teamStatus: TeamStatus
  loading?: boolean
  lastUpdate?: string
}

export default function LiveActivityMonitor({ 
  activities, 
  stats, 
  teamStatus, 
  loading,
  lastUpdate 
}: LiveActivityMonitorProps) {
  const [autoRefresh, setAutoRefresh] = useState(true)

  function getActivityIcon(type: string) {
    switch (type) {
      case 'deposit':
        return <ArrowDownIcon className="h-4 w-4 text-blue-600" />
      case 'withdrawal':
        return <ArrowUpIcon className="h-4 w-4 text-green-600" />
      case 'assignment':
        return <UserPlusIcon className="h-4 w-4 text-purple-600" />
      default:
        return <ClockIcon className="h-4 w-4 text-gray-400" />
    }
  }

  function getActivityColor(impact: string): string {
    switch (impact) {
      case 'positive': return 'border-l-green-400 bg-green-50'
      case 'negative': return 'border-l-red-400 bg-red-50'
      case 'neutral': return 'border-l-blue-400 bg-blue-50'
      default: return 'border-l-gray-400 bg-gray-50'
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'success':
      case 'received': return 'text-green-600'
      case 'waiting': return 'text-yellow-600'
      case 'problem': return 'text-orange-600'
      case 'block': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  function formatTimeAgo(timeString: string): string {
    const time = new Date(timeString)
    const now = new Date()
    const diffMs = now.getTime() - time.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffMins < 1) return 'только что'
    if (diffMins < 60) return `${diffMins} мин назад`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}ч ${diffMins % 60}м назад`
    
    return time.toLocaleString('ru-RU')
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Live Activity Monitor</h3>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center p-3 border-l-4 border-gray-200 bg-gray-50 rounded">
              <div className="w-8 h-8 bg-gray-200 rounded mr-3"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <h3 className="text-lg font-semibold mr-3">Live Activity Monitor</h3>
          <div className="flex items-center text-sm text-gray-500">
            <WifiIcon className={`h-4 w-4 mr-1 ${autoRefresh ? 'text-green-500' : 'text-gray-400'}`} />
            {autoRefresh ? 'Обновление каждые 10 сек' : 'Автообновление отключено'}
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Команда онлайн */}
          <div className="text-sm">
            <span className="font-medium text-gray-700">Команда онлайн:</span>
            <span className={`ml-1 font-bold ${teamStatus.onlinePercentage >= 70 ? 'text-green-600' : 'text-yellow-600'}`}>
              {teamStatus.onlineJuniors}/{teamStatus.totalJuniors}
            </span>
            <span className="text-gray-500 ml-1">
              ({teamStatus.onlinePercentage}%)
            </span>
          </div>

          {/* Переключатель автообновления */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              autoRefresh 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {autoRefresh ? 'Авто ВКЛ' : 'Авто ВЫКЛ'}
          </button>
        </div>
      </div>

      {/* Быстрая статистика */}
      <div className="grid grid-cols-4 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-lg font-bold text-blue-600">{stats.depositsCount}</div>
          <div className="text-xs text-gray-600">Депозитов</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-green-600">{stats.withdrawalsCount}</div>
          <div className="text-xs text-gray-600">Выводов</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-purple-600">{stats.assignmentsCount}</div>
          <div className="text-xs text-gray-600">Назначений</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-orange-600">{stats.problematicActions}</div>
          <div className="text-xs text-gray-600">Проблем</div>
        </div>
      </div>

      {/* Список активности */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ClockIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <div className="text-lg font-medium">Нет активности</div>
            <div className="text-sm">Активность появится в реальном времени</div>
          </div>
        ) : (
          activities.map(activity => (
            <div 
              key={activity.id}
              className={`border-l-4 p-3 rounded transition-all hover:shadow-sm ${getActivityColor(activity.impact)}`}
            >
              <div className="flex items-start">
                <div className="mr-3 mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-900 truncate">
                      {activity.user} {activity.action}
                    </div>
                    <div className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                      {formatTimeAgo(activity.time)}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 mt-1">
                    {activity.details}
                  </div>
                  
                  <div className={`text-xs font-medium mt-1 ${getStatusColor(activity.status)}`}>
                    {activity.status.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Время последнего обновления */}
      {lastUpdate && (
        <div className="mt-4 pt-3 border-t border-gray-200 text-center">
          <div className="text-xs text-gray-500">
            Последнее обновление: {new Date(lastUpdate).toLocaleTimeString('ru-RU')}
          </div>
        </div>
      )}
    </div>
  )
}
