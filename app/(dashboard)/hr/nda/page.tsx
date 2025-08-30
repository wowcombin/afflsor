'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import DataTable, { Column } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import StatusBadge from '@/components/ui/StatusBadge'
import { useToast } from '@/components/ui/Toast'
import { 
  DocumentTextIcon, 
  LinkIcon, 
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline'

interface NDARequest {
  id: string
  token: string
  expires_at: string
  status: 'pending' | 'expired' | 'signed' | 'revoked'
  was_viewed: boolean
  view_count: number
  created_at: string
  request_type: 'internal' | 'external'
  user: {
    id: string | null
    email: string
    first_name: string
    last_name: string
    role: string
    status?: string
  }
  template: {
    name: string
    version: number
  }
}

interface NDAStats {
  totalRequests: number
  pendingRequests: number
  signedRequests: number
  expiredRequests: number
  complianceRate: number
}

export default function HRNDAPage() {
  const { addToast } = useToast()
  const [requests, setRequests] = useState<NDARequest[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [stats, setStats] = useState<NDAStats>({
    totalRequests: 0,
    pendingRequests: 0,
    signedRequests: 0,
    expiredRequests: 0,
    complianceRate: 0
  })
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [showExternalForm, setShowExternalForm] = useState(false)
  const [externalEmail, setExternalEmail] = useState('')
  const [externalFullName, setExternalFullName] = useState('')
  const [generatingExternal, setGeneratingExternal] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadData()
    } else {
      setLoading(false)
    }
  }, [])

  async function loadData() {
    try {
      const supabase = createClient()
      
      // Загружаем активные NDA запросы (временно используем прямые запросы пока представление не работает)
      const { data: requestsData, error: requestsError } = await supabase
        .from('nda_tokens')
        .select(`
          id,
          token,
          expires_at,
          created_at,
          is_used,
          users!nda_tokens_user_id_fkey(
            id,
            email,
            first_name,
            last_name,
            role,
            status
          )
        `)
        .order('created_at', { ascending: false })

      if (requestsError) throw requestsError

      // Загружаем всех пользователей (включая неактивных - они еще не подписали NDA)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role, status')
        .in('status', ['active', 'inactive']) // Исключаем только уволенных
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      // Преобразуем данные в правильный формат для интерфейса
      const formattedRequests: NDARequest[] = (requestsData || []).map(token => {
        const user_info = Array.isArray(token.users) ? token.users[0] : token.users
        
        // Определяем статус с правильным типом
        let status: 'pending' | 'expired' | 'signed' | 'revoked' = 'pending'
        if (token.is_used) {
          status = 'signed'
        } else if (new Date(token.expires_at) <= new Date()) {
          status = 'expired'
        }
        // is_revoked пока не используем, так как поле может не существовать в БД
        
        return {
          id: token.id,
          token: token.token,
          expires_at: token.expires_at,
          created_at: token.created_at,
          request_type: 'internal' as const,
          status,
          was_viewed: false, // TODO: добавить логику просмотра
          view_count: 0,
          user: {
            id: user_info?.id || null,
            email: user_info?.email || '',
            first_name: user_info?.first_name || '',
            last_name: user_info?.last_name || '',
            role: user_info?.role || '',
            status: user_info?.status || ''
          },
          template: {
            name: 'Стандартный NDA',
            version: 1
          }
        }
      })

      setRequests(formattedRequests)
      setUsers(usersData || [])

      // Временное логирование для отладки
      console.log('🔍 Original NDA Tokens:', requestsData?.slice(0, 1))
      console.log('✨ Formatted Requests:', JSON.stringify(formattedRequests?.slice(0, 1), null, 2))
      console.log('👥 Users Data:', usersData?.slice(0, 1))
      
      // Логируем первый токен детально
      if (requestsData && requestsData.length > 0) {
        console.log('📋 First token detailed:', JSON.stringify(requestsData[0], null, 2))
      }

      // Рассчитываем статистику
      const totalRequests = formattedRequests?.length || 0
      const pendingRequests = formattedRequests?.filter(r => r.status === 'pending').length || 0
      const signedRequests = formattedRequests?.filter(r => r.status === 'signed').length || 0
      const expiredRequests = formattedRequests?.filter(r => r.status === 'expired').length || 0
      const complianceRate = totalRequests > 0 ? Math.round((signedRequests / totalRequests) * 100) : 0

      setStats({
        totalRequests,
        pendingRequests,
        signedRequests,
        expiredRequests,
        complianceRate
      })

    } catch (error) {
      console.error('Ошибка загрузки NDA данных:', error)
      addToast({ type: 'error', title: 'Ошибка загрузки данных NDA' })
    } finally {
      setLoading(false)
    }
  }

  async function generateNDALink() {
    if (!selectedUserId) {
      addToast({ type: 'warning', title: 'Выберите пользователя' })
      return
    }

    setGenerating(true)

    try {
      const response = await fetch('/api/hr/nda/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: selectedUserId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      // Копируем ссылку в буфер обмена
      await navigator.clipboard.writeText(data.link)

      addToast({
        type: 'success',
        title: 'NDA ссылка создана',
        description: `Ссылка скопирована в буфер обмена. Отправьте ${data.user.name}`
      })

      setSelectedUserId('')
      await loadData()

    } catch (error: any) {
      console.error('Ошибка генерации NDA:', error)
      addToast({ type: 'error', title: 'Ошибка создания NDA ссылки' })
    } finally {
      setGenerating(false)
    }
  }

  async function resendNDA(requestId: string) {
    try {
      // TODO: Реализовать отправку напоминания
      addToast({ type: 'info', title: 'Напоминание отправлено' })
    } catch (error) {
      addToast({ type: 'error', title: 'Ошибка отправки напоминания' })
    }
  }

  async function revokeNDA(request: NDARequest) {
    if (!confirm('Вы уверены, что хотите отозвать этот запрос на подписание NDA?')) {
      return
    }

    try {
      const response = await fetch('/api/hr/nda/revoke-by-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: request.token,
          revocation_reason: 'Отозвано через интерфейс HR'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'NDA запрос отозван',
        description: 'Ссылка больше не действительна'
      })

      await loadData() // Перезагружаем данные

    } catch (error: any) {
      console.error('Ошибка отзыва NDA:', error)
      addToast({ 
        type: 'error', 
        title: 'Ошибка отзыва NDA запроса',
        description: error.message || 'Попробуйте еще раз'
      })
    }
  }

  async function generateExternalNDA() {
    if (!externalEmail) {
      addToast({ type: 'warning', title: 'Введите email' })
      return
    }

    setGeneratingExternal(true)

    try {
      const response = await fetch('/api/hr/nda/generate-external', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: externalEmail,
          full_name: externalFullName
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      // Копируем ссылку в буфер обмена
      await navigator.clipboard.writeText(data.link)

      addToast({
        type: 'success',
        title: 'NDA ссылка для внешнего пользователя создана',
        description: `Ссылка скопирована в буфер обмена. Отправьте на ${externalEmail}`
      })

      setExternalEmail('')
      setExternalFullName('')
      setShowExternalForm(false)
      await loadData()

    } catch (error: any) {
      console.error('Ошибка генерации внешнего NDA:', error)
      addToast({ 
        type: 'error', 
        title: 'Ошибка создания внешнего NDA',
        description: error.message || 'Попробуйте еще раз'
      })
    } finally {
      setGeneratingExternal(false)
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'signed': return 'bg-green-100 text-green-800'
      case 'expired': return 'bg-red-100 text-red-800'
      case 'revoked': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'pending': return '⏳ Ожидает'
      case 'signed': return '✅ Подписан'
      case 'expired': return '❌ Истек'
      case 'revoked': return '🚫 Отозван'
      default: return status
    }
  }

  const columns: Column[] = [
    {
      key: 'user',
      label: 'Сотрудник',
      sortable: true,
      render: (request: NDARequest) => {
        // Временное логирование для отладки конкретного запроса
        console.log('👤 Rendering user for request:', request?.id, request?.user)
        
        const user = request?.user
        const firstName = user?.first_name?.trim()
        const lastName = user?.last_name?.trim()
        const email = user?.email?.trim()
        const role = user?.role?.trim()
        
        // Определяем отображаемое имя
        let displayName = 'Неизвестно'
        if (firstName && lastName) {
          displayName = `${firstName} ${lastName}`
        } else if (firstName) {
          displayName = firstName
        } else if (lastName) {
          displayName = lastName
        } else if (email) {
          displayName = email.split('@')[0]
        }
        
        return (
          <div>
            <div className="font-medium text-gray-900">
              {displayName}
            </div>
            <div className="text-sm text-gray-500">
              {email || 'Email не указан'}
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-xs text-blue-600 capitalize">
                {role === 'external' ? 'Внешний пользователь' : (role || 'Роль не указана')}
              </div>
              {request?.request_type === 'external' && (
                <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                  Внешний
                </span>
              )}
            </div>
          </div>
        )
      }
    },
    {
      key: 'status',
      label: 'Статус',
      sortable: true,
      render: (request: NDARequest) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request?.status || 'pending')}`}>
          {getStatusLabel(request?.status || 'pending')}
        </span>
      )
    },
    {
      key: 'activity',
      label: 'Активность',
      render: (request: NDARequest) => (
        <div className="text-sm">
          <div className={request?.was_viewed ? 'text-green-600' : 'text-gray-500'}>
            {request?.was_viewed ? '👁️ Просмотрен' : '📄 Не просмотрен'}
          </div>
          {(request?.view_count || 0) > 0 && (
            <div className="text-xs text-gray-500">
              {request.view_count} просмотров
            </div>
          )}
        </div>
      )
    },
    {
      key: 'expires_at',
      label: 'Истекает',
      sortable: true,
      render: (request: NDARequest) => {
        if (!request?.expires_at) {
          return <div className="text-sm text-gray-500">Не указано</div>
        }
        
        const expiresAt = new Date(request.expires_at)
        const now = new Date()
        const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        
        return (
          <div className="text-sm">
            <div className={daysLeft <= 1 ? 'text-red-600 font-medium' : 'text-gray-600'}>
              {daysLeft > 0 ? `${daysLeft} дней` : 'Истек'}
            </div>
            <div className="text-xs text-gray-500">
              {expiresAt.toLocaleDateString('ru-RU')}
            </div>
          </div>
        )
      }
    }
  ]

  const actions = [
    {
      label: 'Копировать ссылку',
      action: (request: NDARequest) => {
        const link = `${window.location.origin}/nda/${request.token}`
        navigator.clipboard.writeText(link)
        addToast({ type: 'success', title: 'Ссылка скопирована' })
      },
      condition: (request: NDARequest) => request.status === 'pending',
      variant: 'primary' as const
    },
    {
      label: 'Напоминание',
      action: (request: NDARequest) => resendNDA(request.id),
      condition: (request: NDARequest) => request.status === 'pending',
      variant: 'secondary' as const
    },
    {
      label: 'Отозвать',
      action: (request: NDARequest) => revokeNDA(request),
      condition: (request: NDARequest) => request.status === 'pending',
      variant: 'danger' as const
    }
  ]

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Управление NDA</h1>
        <div className="flex space-x-3">
          {/* Создание NDA для зарегистрированных пользователей */}
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Выберите сотрудника</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.first_name || 'Имя не указано'} {user.last_name || ''} - {user.email} ({user.role})
              </option>
            ))}
          </select>
          
          <button
            onClick={generateNDALink}
            disabled={!selectedUserId || generating}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <PaperAirplaneIcon className="h-5 w-5 mr-2" />
            {generating ? 'Создание...' : 'Создать NDA ссылку'}
          </button>

          {/* Кнопка для внешних NDA */}
          <button
            onClick={() => setShowExternalForm(!showExternalForm)}
            className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            Внешний NDA
          </button>
        </div>
      </div>

      {/* Форма для создания внешних NDA */}
      {showExternalForm && (
        <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h3 className="font-medium text-orange-900 mb-3">📧 Создать NDA для внешнего пользователя</h3>
          <div className="flex space-x-3">
            <input
              type="email"
              placeholder="Email (обязательно)"
              value={externalEmail}
              onChange={(e) => setExternalEmail(e.target.value)}
              className="flex-1 px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
            <input
              type="text"
              placeholder="Полное имя (необязательно)"
              value={externalFullName}
              onChange={(e) => setExternalFullName(e.target.value)}
              className="flex-1 px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
            <button
              onClick={generateExternalNDA}
              disabled={!externalEmail || generatingExternal}
              className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              <PaperAirplaneIcon className="h-5 w-5 mr-2" />
              {generatingExternal ? 'Создание...' : 'Создать'}
            </button>
          </div>
          <div className="mt-2 text-sm text-orange-700">
            💡 Внешние NDA создаются для людей, которые не зарегистрированы в системе
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Всего запросов"
          value={stats.totalRequests.toString()}
          icon={<DocumentTextIcon className="h-6 w-6" />}
        />
        <KPICard
          title="Ожидают подписания"
          value={stats.pendingRequests.toString()}
          color="yellow"
          icon={<ClockIcon className="h-6 w-6" />}
        />
        <KPICard
          title="Подписано"
          value={stats.signedRequests.toString()}
          color="green"
          icon={<CheckCircleIcon className="h-6 w-6" />}
        />
        <KPICard
          title="Соответствие"
          value={`${stats.complianceRate}%`}
          color={stats.complianceRate >= 90 ? "green" : stats.complianceRate >= 70 ? "yellow" : "red"}
          icon={<span className="text-xl">📋</span>}
        />
      </div>

      {/* NDA Requests Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            Запросы на подписание NDA ({requests.length})
          </h3>
        </div>
        
        <DataTable
          data={requests}
          columns={columns}
          actions={actions}
          pagination={{ pageSize: 20 }}
          sorting={{ key: 'created_at', direction: 'desc' }}
          export={true}
        />
      </div>

      {/* Instructions */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-medium text-blue-900 mb-3">📋 Инструкция по работе с NDA</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <div>1. <strong>Выберите сотрудника</strong> из списка выше</div>
          <div>2. <strong>Нажмите "Создать NDA ссылку"</strong> - ссылка автоматически скопируется</div>
          <div>3. <strong>Отправьте ссылку сотруднику</strong> через Telegram или email</div>
          <div>4. <strong>Отслеживайте статус</strong> в таблице ниже</div>
          <div>5. <strong>Ссылка действует 7 дней</strong>, после чего нужно создать новую</div>
        </div>
      </div>
    </div>
  )
}
