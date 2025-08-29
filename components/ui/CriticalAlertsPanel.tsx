'use client'

import { useState } from 'react'
import { 
  ExclamationTriangleIcon, 
  XMarkIcon, 
  ClockIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline'

interface Alert {
  id: string
  type: 'critical' | 'warning' | 'info'
  title: string
  description: string
  details: string
  actions: Array<{
    label: string
    action: string
    data: any
  }>
  priority: 'critical' | 'high' | 'medium' | 'low'
  impact: string
  created_at: string
}

interface AlertsSummary {
  total: number
  critical: number
  warning: number
  hasUrgent: boolean
}

interface CriticalAlertsPanelProps {
  alerts: Alert[]
  summary: AlertsSummary
  loading?: boolean
  onActionClick?: (action: string, data: any) => void
  onDismiss?: (alertId: string) => void
}

export default function CriticalAlertsPanel({ 
  alerts, 
  summary, 
  loading, 
  onActionClick,
  onDismiss 
}: CriticalAlertsPanelProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())

  function getAlertColor(type: string): string {
    switch (type) {
      case 'critical': return 'bg-red-50 border-red-200'
      case 'warning': return 'bg-yellow-50 border-yellow-200'
      case 'info': return 'bg-blue-50 border-blue-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  function getAlertIcon(type: string) {
    switch (type) {
      case 'critical': 
        return <ShieldExclamationIcon className="h-5 w-5 text-red-600" />
      case 'warning': 
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
      case 'info': 
        return <ClockIcon className="h-5 w-5 text-blue-600" />
      default: 
        return <ClockIcon className="h-5 w-5 text-gray-600" />
    }
  }

  function getPriorityBadge(priority: string) {
    const colors = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-gray-100 text-gray-800'
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[priority as keyof typeof colors] || colors.low}`}>
        {priority.toUpperCase()}
      </span>
    )
  }

  function handleDismiss(alertId: string) {
    setDismissedAlerts(prev => new Set([...prev, alertId]))
    onDismiss?.(alertId)
  }

  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.id))

  if (loading) {
    return (
      <div className="mb-6">
        <div className="animate-pulse bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="h-4 bg-red-200 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-red-200 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  if (visibleAlerts.length === 0) {
    return (
      <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-green-600 mr-3">✅</div>
          <div>
            <div className="font-medium text-green-800">Нет критических алертов</div>
            <div className="text-sm text-green-600">Все системы работают нормально</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6">
      {/* Панель критических алертов */}
      {summary.hasUrgent && (
        <div className="bg-red-600 text-white p-4 rounded-lg mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ShieldExclamationIcon className="h-6 w-6 mr-3" />
              <div>
                <div className="font-bold">🚨 ТРЕБУЮТСЯ КРИТИЧЕСКИЕ РЕШЕНИЯ</div>
                <div className="text-sm opacity-90">
                  {summary.critical} критических алертов требуют немедленного внимания
                </div>
              </div>
            </div>
            <div className="text-2xl font-bold">
              {summary.total}
            </div>
          </div>
        </div>
      )}

      {/* Список алертов */}
      <div className="space-y-3">
        {visibleAlerts.map(alert => (
          <div 
            key={alert.id}
            className={`border rounded-lg p-4 ${getAlertColor(alert.type)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start flex-1">
                <div className="mr-3 mt-1">
                  {getAlertIcon(alert.type)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <div className="font-semibold text-gray-900 mr-3">
                      {alert.title}
                    </div>
                    {getPriorityBadge(alert.priority)}
                  </div>
                  
                  <div className="text-sm text-gray-700 mb-2">
                    {alert.description}
                  </div>
                  
                  <div className="text-xs text-gray-600 mb-3">
                    <div><strong>Детали:</strong> {alert.details}</div>
                    <div><strong>Влияние:</strong> {alert.impact}</div>
                    <div><strong>Время:</strong> {new Date(alert.created_at).toLocaleString('ru-RU')}</div>
                  </div>

                  {/* Быстрые действия */}
                  <div className="flex flex-wrap gap-2">
                    {alert.actions.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => onActionClick?.(action.action, action.data)}
                        className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                          index === 0 
                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Кнопка закрытия */}
              <button
                onClick={() => handleDismiss(alert.id)}
                className="ml-3 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
