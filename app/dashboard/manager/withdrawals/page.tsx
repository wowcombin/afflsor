'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import StatusBadge from '@/components/ui/StatusBadge'
import { useToast } from '@/components/ui/Toast'
import { TestWithdrawal, CasinoTest, User, Card, Casino } from '@/types/database.types'

interface WithdrawalWithDetails extends TestWithdrawal {
  work?: CasinoTest & {
    tester?: User
    casino?: Casino
    card?: Card
  }
}

export default function WithdrawalsQueue() {
  const router = useRouter()
  const { addToast } = useToast()
  const [withdrawals, setWithdrawals] = useState<WithdrawalWithDetails[]>([])
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchWithdrawals()
  }, [])

  const fetchWithdrawals = async () => {
    try {
      const response = await fetch('/api/manager/withdrawals')
      const data = await response.json()
      
      if (data.success) {
        setWithdrawals(data.data)
      } else {
        addToast({ type: 'error', title: 'Ошибка', description: data.error || 'Не удалось загрузить выводы' })
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Ошибка сети' })
    } finally {
      setLoading(false)
    }
  }

  const handleWithdrawalAction = async (withdrawalId: string, action: 'approve' | 'reject', comment?: string) => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/manager/withdrawals/${withdrawalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, comment })
      })

      const data = await response.json()
      
      if (data.success) {
        addToast({ type: 'success', title: 'Успешно', description: `Вывод ${action === 'approve' ? 'одобрен' : 'отклонен'}` })
        setSelectedWithdrawal(null)
        fetchWithdrawals()
      } else {
        addToast({ type: 'error', title: 'Ошибка', description: data.error || 'Не удалось обновить статус' })
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Ошибка сети' })
    } finally {
      setActionLoading(false)
    }
  }

  const columns = [
    {
      key: 'created_at',
      label: 'Время ожидания',
      render: (item: WithdrawalWithDetails) => {
        const hours = Math.floor((Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60))
        const isUrgent = hours > 4
        return (
          <span className={isUrgent ? 'text-danger-600 font-semibold' : 'text-gray-600'}>
            {hours}ч {Math.floor(((Date.now() - new Date(item.created_at).getTime()) % (1000 * 60 * 60)) / (1000 * 60))}м
          </span>
        )
      }
    },
    {
      key: 'work.tester.first_name',
      label: 'Junior',
      render: (item: WithdrawalWithDetails) => (
        <div>
          <div className="font-medium">
            {item.work?.tester?.first_name} {item.work?.tester?.last_name}
          </div>
          <div className="text-sm text-gray-500">
            Рейтинг: ⭐ 4.2/5
          </div>
        </div>
      )
    },
    {
      key: 'work.casino.name',
      label: 'Казино',
      render: (item: WithdrawalWithDetails) => (
        <div>
          <div className="font-medium">{item.work?.casino?.name}</div>
          <div className="text-sm text-gray-500">{item.work?.casino?.company}</div>
        </div>
      )
    },
    {
      key: 'work.card.card_number_mask',
      label: 'Карта',
      render: (item: WithdrawalWithDetails) => (
        <div>
          <div className="font-mono text-sm">{item.work?.card?.card_number_mask}</div>
          <StatusBadge status={item.work?.card?.status || 'active'} />
        </div>
      )
    },
    {
      key: 'withdrawal_amount',
      label: 'Сумма',
      render: (item: WithdrawalWithDetails) => (
        <div>
          <div className="font-semibold text-lg">${item.withdrawal_amount}</div>
          <div className="text-sm text-gray-500">
            Депозит: ${item.work?.deposit_amount || 0}
          </div>
        </div>
      )
    },
    {
      key: 'profit',
      label: 'Профит',
      render: (item: WithdrawalWithDetails) => {
        const profit = (item.withdrawal_amount || 0) - (item.work?.deposit_amount || 0)
        return (
          <div className={`font-semibold ${profit > 0 ? 'text-success-600' : 'text-danger-600'}`}>
            ${profit.toFixed(2)}
          </div>
        )
      }
    },
    {
      key: 'withdrawal_status',
      label: 'Статус',
      render: (item: WithdrawalWithDetails) => (
        <StatusBadge status={item.withdrawal_status} />
      )
    }
  ]

  const actions = [
    {
      label: 'Проверить',
      action: (item: WithdrawalWithDetails) => setSelectedWithdrawal(item),
      variant: 'primary' as const
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Очередь выводов</h1>
          <p className="text-gray-600">Проверка и одобрение выводов от junior'ов</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => router.push('/dashboard/manager')}>
            ← Назад
          </button>
          <button className="btn-success" onClick={() => handleBulkApprove()}>
            Одобрить все &lt; $200
          </button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">В очереди</h3>
          <p className="text-2xl font-bold text-warning-600">
            {withdrawals.filter(w => w.withdrawal_status === 'pending').length}
          </p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Просрочено (&gt;4ч)</h3>
          <p className="text-2xl font-bold text-danger-600">
            {withdrawals.filter(w => {
              const hours = Math.floor((Date.now() - new Date(w.created_at).getTime()) / (1000 * 60 * 60))
              return hours > 4 && w.withdrawal_status === 'pending'
            }).length}
          </p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Сегодня одобрено</h3>
          <p className="text-2xl font-bold text-success-600">
            {withdrawals.filter(w => {
              const today = new Date().toDateString()
              return new Date(w.updated_at).toDateString() === today && w.withdrawal_status === 'approved'
            }).length}
          </p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Общий профит</h3>
          <p className="text-2xl font-bold text-success-600">
            ${withdrawals.reduce((sum, w) => {
              if (w.withdrawal_status === 'approved') {
                return sum + ((w.withdrawal_amount || 0) - (w.work?.deposit_amount || 0))
              }
              return sum
            }, 0).toFixed(2)}
          </p>
        </div>
      </div>

      <DataTable
        data={withdrawals}
        columns={columns}
        actions={actions}
        loading={loading}
      />

      {/* Модальное окно проверки вывода */}
      {selectedWithdrawal && (
        <WithdrawalReviewModal
          withdrawal={selectedWithdrawal}
          onClose={() => setSelectedWithdrawal(null)}
          onAction={handleWithdrawalAction}
          loading={actionLoading}
        />
      )}
    </div>
  )

  async function handleBulkApprove() {
    const smallWithdrawals = withdrawals.filter(w => 
      w.withdrawal_status === 'pending' && (w.withdrawal_amount || 0) < 200
    )
    
    if (smallWithdrawals.length === 0) {
      addToast({ type: 'info', title: 'Информация', description: 'Нет выводов менее $200 для одобрения' })
      return
    }

    // Здесь будет API для массового одобрения
    addToast({ type: 'info', title: 'В разработке', description: 'Функция массового одобрения будет добавлена' })
  }
}

// Компонент модального окна для проверки вывода
function WithdrawalReviewModal({ 
  withdrawal, 
  onClose, 
  onAction, 
  loading 
}: {
  withdrawal: WithdrawalWithDetails
  onClose: () => void
  onAction: (id: string, action: 'approve' | 'reject', comment?: string) => void
  loading: boolean
}) {
  const [comment, setComment] = useState('')
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)

  const profit = (withdrawal.withdrawal_amount || 0) - (withdrawal.work?.deposit_amount || 0)

  return (
    <Modal isOpen={true} onClose={onClose} title="Проверка вывода">
      <div className="space-y-6">
        {/* Основная информация */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Junior</h3>
            <p>{withdrawal.work?.tester?.first_name} {withdrawal.work?.tester?.last_name}</p>
            <p className="text-sm text-gray-500">{withdrawal.work?.tester?.email}</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Казино</h3>
            <p>{withdrawal.work?.casino?.name}</p>
            <p className="text-sm text-gray-500">{withdrawal.work?.casino?.company}</p>
          </div>
        </div>

        {/* Финансовые детали */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-500">Депозит</p>
              <p className="text-lg font-semibold">${withdrawal.work?.deposit_amount || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Вывод</p>
              <p className="text-lg font-semibold">${withdrawal.withdrawal_amount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Профит</p>
              <p className={`text-lg font-semibold ${profit > 0 ? 'text-success-600' : 'text-danger-600'}`}>
                ${profit.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Карта */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Карта</h3>
          <div className="flex items-center gap-4">
            <span className="font-mono">{withdrawal.work?.card?.card_number_mask}</span>
            <StatusBadge status={withdrawal.work?.card?.status || 'active'} />
          </div>
        </div>

        {/* Комментарий */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Комментарий (опционально)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg"
            rows={3}
            placeholder="Добавьте комментарий к решению..."
          />
        </div>

        {/* Действия */}
        <div className="flex gap-3">
          <button
            onClick={() => onAction(withdrawal.id, 'approve', comment)}
            disabled={loading}
            className="btn-success flex-1"
          >
            {loading ? 'Обработка...' : '✓ Одобрить'}
          </button>
          <button
            onClick={() => onAction(withdrawal.id, 'reject', comment)}
            disabled={loading}
            className="btn-danger flex-1"
          >
            {loading ? 'Обработка...' : '✗ Отклонить'}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="btn-secondary"
          >
            Отмена
          </button>
        </div>
      </div>
    </Modal>
  )
}
