'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column, ActionButton } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import StatusBadge from '@/components/ui/StatusBadge'
import Modal from '@/components/ui/Modal'
import { 
  BanknotesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  ChatBubbleLeftRightIcon
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
}

interface WithdrawalStats {
  totalWithdrawals: number
  pendingWithdrawals: number
  approvedWithdrawals: number
  rejectedWithdrawals: number
  completedWithdrawals: number
  totalAmount: number
}

export default function TeamLeadWithdrawalsPage() {
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
  const [showActionModal, setShowActionModal] = useState(false)
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null)
  const [action, setAction] = useState<'approve' | 'reject'>('approve')
  const [comment, setComment] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadWithdrawals()
  }, [])

  async function loadWithdrawals() {
    try {
      // Получаем выводы только от своих Junior'ов
      const response = await fetch('/api/teamlead/withdrawals')
      
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

  async function handleWithdrawalAction(withdrawal: Withdrawal, actionType: 'approve' | 'reject') {
    setSelectedWithdrawal(withdrawal)
    setAction(actionType)
    setComment('')
    setShowActionModal(true)
  }

  async function processWithdrawal() {
    if (!selectedWithdrawal) return

    setProcessing(true)

    try {
      const response = await fetch(`/api/teamlead/withdrawals/${selectedWithdrawal.id}/${action}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comment: comment.trim()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Ошибка ${action === 'approve' ? 'одобрения' : 'отклонения'}`)
      }

      addToast({
        type: 'success',
        title: action === 'approve' ? 'Вывод одобрен' : 'Вывод отклонен',
        description: `Вывод ${selectedWithdrawal.amount} ${selectedWithdrawal.currency} ${action === 'approve' ? 'одобрен' : 'отклонен'}`
      })

      setShowActionModal(false)
      setSelectedWithdrawal(null)
      setComment('')
      await loadWithdrawals()

    } catch (error: any) {
      console.error('Ошибка обработки вывода:', error)
      addToast({
        type: 'error',
        title: 'Ошибка обработки',
        description: error.message
      })
    } finally {
      setProcessing(false)
    }
  }

  const columns: Column<Withdrawal>[] = [
    {
      key: 'user',
      label: 'Junior',
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
      key: 'comment',
      label: 'Комментарий',
      render: (withdrawal) => (
        withdrawal.manager_comment ? (
          <div className="text-xs bg-blue-50 p-2 rounded">
            <div className="text-blue-700">{withdrawal.manager_comment}</div>
          </div>
        ) : (
          <span className="text-xs text-gray-400">Нет комментария</span>
        )
      )
    }
  ]

  const actions: ActionButton<Withdrawal>[] = [
    {
      label: 'Одобрить',
      action: (withdrawal) => handleWithdrawalAction(withdrawal, 'approve'),
      variant: 'success',
      condition: (withdrawal) => withdrawal.status === 'pending'
    },
    {
      label: 'Отклонить',
      action: (withdrawal) => handleWithdrawalAction(withdrawal, 'reject'),
      variant: 'danger',
      condition: (withdrawal) => withdrawal.status === 'pending'
    },
    {
      label: 'Просмотр',
      action: (withdrawal) => {
        setSelectedWithdrawal(withdrawal)
        setShowActionModal(true)
      },
      variant: 'primary',
      condition: (withdrawal) => withdrawal.status !== 'pending'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Выводы моей команды</h1>
          <p className="text-gray-600">Управление выводами Junior сотрудников</p>
        </div>
      </div>

      {/* Информация о роли Team Lead */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <BanknotesIcon className="h-5 w-5 text-orange-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-orange-800">
              Права Team Lead по выводам
            </h3>
            <div className="mt-2 text-sm text-orange-700">
              <p>• Видите выводы только от назначенных вам Junior сотрудников</p>
              <p>• Можете одобрять или отклонять выводы с комментариями</p>
              <p>• Отвечаете за контроль выводов своей команды</p>
              <p>• Работаете с банками, которые назначены вашей команде</p>
            </div>
          </div>
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
          color="success"
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

      {/* Таблица выводов */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">
            Выводы команды ({withdrawals.length})
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

      {/* Modal для действий с выводом */}
      <Modal
        isOpen={showActionModal}
        onClose={() => {
          setShowActionModal(false)
          setSelectedWithdrawal(null)
          setComment('')
        }}
        title={
          selectedWithdrawal?.status === 'pending' 
            ? (action === 'approve' ? 'Одобрить вывод' : 'Отклонить вывод')
            : 'Детали вывода'
        }
        size="lg"
      >
        {selectedWithdrawal && (
          <div className="space-y-4">
            {/* Информация о выводе */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Junior</label>
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

            {/* Существующий комментарий */}
            {selectedWithdrawal.manager_comment && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Существующий комментарий:</h4>
                <p className="text-blue-700 text-sm">{selectedWithdrawal.manager_comment}</p>
              </div>
            )}

            {/* Комментарий для действия (только для pending) */}
            {selectedWithdrawal.status === 'pending' && (
              <div>
                <label className="form-label">
                  Комментарий {action === 'approve' ? 'одобрения' : 'отклонения'}
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="form-input"
                  rows={3}
                  placeholder={
                    action === 'approve' 
                      ? "Укажите причину одобрения или оставьте пустым..."
                      : "Укажите причину отклонения (обязательно)"
                  }
                  required={action === 'reject'}
                />
              </div>
            )}

            {selectedWithdrawal.status === 'pending' && (
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowActionModal(false)
                    setSelectedWithdrawal(null)
                    setComment('')
                  }}
                  className="btn-secondary"
                  disabled={processing}
                >
                  Отмена
                </button>
                <button
                  onClick={processWithdrawal}
                  className={action === 'approve' ? 'btn-success' : 'btn-danger'}
                  disabled={processing || (action === 'reject' && !comment.trim())}
                >
                  {processing 
                    ? (action === 'approve' ? 'Одобрение...' : 'Отклонение...') 
                    : (action === 'approve' ? 'Одобрить вывод' : 'Отклонить вывод')
                  }
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
