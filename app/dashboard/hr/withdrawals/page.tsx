'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column, ActionButton } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import StatusBadge from '@/components/ui/StatusBadge'
import Modal from '@/components/ui/Modal'
import { 
  BanknotesIcon,
  ChatBubbleLeftRightIcon,
  EyeIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface Withdrawal {
  id: string
  user_id: string
  amount: number
  currency: string
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  created_at: string
  updated_at: string
  user?: {
    email: string
    first_name?: string
    last_name?: string
    role: string
  }
  manager_comment?: string
  hr_comment?: string
}

interface WithdrawalStats {
  totalWithdrawals: number
  pendingWithdrawals: number
  approvedWithdrawals: number
  rejectedWithdrawals: number
  completedWithdrawals: number
  totalAmount: number
}

export default function HRWithdrawalsPage() {
  const { addToast } = useToast()
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [stats, setStats] = useState<WithdrawalStats>({
    totalWithdrawals: 0,
    pendingWithdrawals: 0,
    approvedWithdrawals: 0,
    rejectedWithdrawals: 0,
    completedWithdrawals: 0,
    totalAmount: 0
  })
  const [loading, setLoading] = useState(true)
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null)
  const [hrComment, setHrComment] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadWithdrawals()
  }, [])

  async function loadWithdrawals() {
    try {
      const response = await fetch('/api/withdrawals')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка загрузки выводов')
      }

      const { withdrawals: withdrawalsData } = await response.json()
      setWithdrawals(withdrawalsData)

      // Рассчитываем статистику
      const totalWithdrawals = withdrawalsData.length
      const pendingWithdrawals = withdrawalsData.filter((w: Withdrawal) => w.status === 'pending').length
      const approvedWithdrawals = withdrawalsData.filter((w: Withdrawal) => w.status === 'approved').length
      const rejectedWithdrawals = withdrawalsData.filter((w: Withdrawal) => w.status === 'rejected').length
      const completedWithdrawals = withdrawalsData.filter((w: Withdrawal) => w.status === 'completed').length
      const totalAmount = withdrawalsData.reduce((sum: number, w: Withdrawal) => sum + w.amount, 0)

      setStats({
        totalWithdrawals,
        pendingWithdrawals,
        approvedWithdrawals,
        rejectedWithdrawals,
        completedWithdrawals,
        totalAmount
      })

    } catch (error: any) {
      console.error('Ошибка загрузки выводов:', error)
      addToast({
        type: 'error',
        title: 'Ошибка загрузки данных',
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleAddComment(withdrawal: Withdrawal) {
    setSelectedWithdrawal(withdrawal)
    setHrComment(withdrawal.hr_comment || '')
    setShowCommentModal(true)
  }

  async function saveComment() {
    if (!selectedWithdrawal) return

    setSaving(true)
    
    try {
      const response = await fetch(`/api/withdrawals/${selectedWithdrawal.id}/hr-comment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hr_comment: hrComment.trim()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка сохранения комментария')
      }

      addToast({
        type: 'success',
        title: 'Комментарий сохранен',
        description: 'HR комментарий успешно добавлен к выводу'
      })

      setShowCommentModal(false)
      setSelectedWithdrawal(null)
      setHrComment('')
      await loadWithdrawals()

    } catch (error: any) {
      console.error('Ошибка сохранения комментария:', error)
      addToast({
        type: 'error',
        title: 'Ошибка сохранения',
        description: error.message
      })
    } finally {
      setSaving(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-orange-600'
      case 'approved': return 'text-blue-600'
      case 'completed': return 'text-green-600'
      case 'rejected': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Ожидает'
      case 'approved': return 'Одобрен'
      case 'completed': return 'Завершен'
      case 'rejected': return 'Отклонен'
      default: return status
    }
  }

  const columns: Column<Withdrawal>[] = [
    {
      key: 'user',
      label: 'Пользователь',
      sortable: true,
      filterable: true,
      render: (withdrawal) => (
        <div>
          <div className="font-medium text-gray-900">
            {withdrawal.user?.first_name && withdrawal.user?.last_name 
              ? `${withdrawal.user.first_name} ${withdrawal.user.last_name}`
              : withdrawal.user?.email || 'Неизвестно'
            }
          </div>
          <div className="text-sm text-gray-500">
            {withdrawal.user?.email}
          </div>
          <div className="text-xs text-primary-600 capitalize">
            {withdrawal.user?.role || 'Неизвестно'}
          </div>
        </div>
      )
    },
    {
      key: 'amount',
      label: 'Сумма',
      sortable: true,
      align: 'right',
      render: (withdrawal) => (
        <div className="text-right">
          <div className="font-bold text-gray-900">
            {withdrawal.amount.toFixed(2)} {withdrawal.currency}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Статус',
      sortable: true,
      render: (withdrawal) => <StatusBadge status={withdrawal.status} />
    },
    {
      key: 'created_at',
      label: 'Создан',
      sortable: true,
      render: (withdrawal) => (
        <div className="text-sm">
          <div>{new Date(withdrawal.created_at).toLocaleDateString('ru-RU')}</div>
          <div className="text-gray-500">
            {new Date(withdrawal.created_at).toLocaleTimeString('ru-RU')}
          </div>
        </div>
      )
    },
    {
      key: 'comments',
      label: 'Комментарии',
      render: (withdrawal) => (
        <div className="space-y-1">
          {withdrawal.manager_comment && (
            <div className="text-xs bg-blue-50 p-2 rounded">
              <div className="font-medium text-blue-800">Manager:</div>
              <div className="text-blue-700">{withdrawal.manager_comment}</div>
            </div>
          )}
          {withdrawal.hr_comment && (
            <div className="text-xs bg-green-50 p-2 rounded">
              <div className="font-medium text-green-800">HR:</div>
              <div className="text-green-700">{withdrawal.hr_comment}</div>
            </div>
          )}
          {!withdrawal.manager_comment && !withdrawal.hr_comment && (
            <span className="text-xs text-gray-400">Нет комментариев</span>
          )}
        </div>
      )
    }
  ]

  const actions: ActionButton<Withdrawal>[] = [
    {
      label: 'Комментарий',
      action: handleAddComment,
      variant: 'primary'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">История выводов</h1>
          <p className="text-gray-600">Мониторинг и комментирование всех выводов в системе</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KPICard
          title="Всего выводов"
          value={stats.totalWithdrawals}
          icon={<BanknotesIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Ожидают"
          value={stats.pendingWithdrawals}
          icon={<ClockIcon className="h-6 w-6" />}
          color="warning"
        />
        <KPICard
          title="Одобрены"
          value={stats.approvedWithdrawals}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Завершены"
          value={stats.completedWithdrawals}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="success"
        />
        <KPICard
          title="Отклонены"
          value={stats.rejectedWithdrawals}
          icon={<XCircleIcon className="h-6 w-6" />}
          color="danger"
        />
      </div>

      {/* Информация о роли HR */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              HR функции для работы с выводами
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>• Просмотр всех выводов в системе независимо от статуса</p>
              <p>• Добавление HR комментариев для внутреннего учета</p>
              <p>• Мониторинг активности сотрудников по выводам</p>
              <p>• Отслеживание проблемных ситуаций и их решения</p>
            </div>
          </div>
        </div>
      </div>

      {/* Таблица выводов */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">
            Все выводы в системе ({withdrawals.length})
          </h3>
        </div>
        
        <DataTable
          data={withdrawals}
          columns={columns}
          actions={actions}
          loading={loading}
          pagination={{ pageSize: 20 }}
          filtering={true}
          exportable={true}
          emptyMessage="Выводы не найдены"
        />
      </div>

      {/* Modal для комментария */}
      <Modal
        isOpen={showCommentModal}
        onClose={() => {
          setShowCommentModal(false)
          setSelectedWithdrawal(null)
          setHrComment('')
        }}
        title="HR Комментарий к выводу"
        size="lg"
      >
        {selectedWithdrawal && (
          <div className="space-y-4">
            {/* Информация о выводе */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Пользователь</label>
                  <p className="text-sm text-gray-900">
                    {selectedWithdrawal.user?.first_name && selectedWithdrawal.user?.last_name 
                      ? `${selectedWithdrawal.user.first_name} ${selectedWithdrawal.user.last_name}`
                      : selectedWithdrawal.user?.email || 'Неизвестно'
                    }
                  </p>
                  <p className="text-xs text-gray-500">{selectedWithdrawal.user?.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Сумма и статус</label>
                  <p className="text-sm font-bold text-gray-900">
                    {selectedWithdrawal.amount.toFixed(2)} {selectedWithdrawal.currency}
                  </p>
                  <div className="mt-1">
                    <StatusBadge status={selectedWithdrawal.status} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Создан</label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedWithdrawal.created_at).toLocaleDateString('ru-RU')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(selectedWithdrawal.created_at).toLocaleTimeString('ru-RU')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Обновлен</label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedWithdrawal.updated_at).toLocaleDateString('ru-RU')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(selectedWithdrawal.updated_at).toLocaleTimeString('ru-RU')}
                  </p>
                </div>
              </div>
            </div>

            {/* Существующие комментарии */}
            {selectedWithdrawal.manager_comment && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Комментарий Manager:</h4>
                <p className="text-blue-700 text-sm">{selectedWithdrawal.manager_comment}</p>
              </div>
            )}

            {/* HR комментарий */}
            <div>
              <label className="form-label">HR Комментарий</label>
              <textarea
                value={hrComment}
                onChange={(e) => setHrComment(e.target.value)}
                className="form-input"
                rows={4}
                placeholder="Добавьте комментарий HR для внутреннего учета..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Комментарий будет виден только HR и администрации
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => {
                  setShowCommentModal(false)
                  setSelectedWithdrawal(null)
                  setHrComment('')
                }}
                className="btn-secondary"
                disabled={saving}
              >
                Отмена
              </button>
              <button
                onClick={saveComment}
                className="btn-primary"
                disabled={saving || hrComment.trim() === selectedWithdrawal?.hr_comment}
              >
                {saving ? 'Сохранение...' : 'Сохранить комментарий'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
