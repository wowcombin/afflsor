'use client'

import { useState } from 'react'
import { useToast } from './Toast'
import { 
  PencilIcon, 
  CheckIcon, 
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

interface BankAccount {
  id: string
  holder_name: string
  account_number: string
  balance: number
  currency: string
  balance_updated_at: string
  last_updated: string
  cards_available: boolean
}

interface BankBalanceEditorProps {
  account: BankAccount
  userRole: string
  onUpdate?: () => void
  showHistory?: boolean
}

export default function BankBalanceEditor({ 
  account, 
  userRole, 
  onUpdate,
  showHistory = false
}: BankBalanceEditorProps) {
  const { addToast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [newBalance, setNewBalance] = useState(account.balance)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const canEdit = ['manager', 'hr', 'cfo', 'admin'].includes(userRole)

  async function handleSave() {
    if (newBalance < 0) {
      addToast({ type: 'error', title: 'Баланс не может быть отрицательным' })
      return
    }

    if (!comment.trim()) {
      addToast({ type: 'warning', title: 'Укажите причину изменения баланса' })
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/bank-accounts/${account.id}/balance`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          balance: newBalance,
          comment: comment.trim()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      const oldBalance = account.balance
      const changeAmount = newBalance - oldBalance

      addToast({
        type: 'success',
        title: 'Баланс обновлен',
        description: `${account.holder_name}: $${oldBalance.toFixed(2)} → $${newBalance.toFixed(2)} (${changeAmount >= 0 ? '+' : ''}${changeAmount.toFixed(2)})`
      })

      // Показываем информацию о затронутых картах
      if (data.affected_cards > 0) {
        addToast({
          type: 'info',
          title: 'Карты обновлены',
          description: `Затронуто карт: ${data.affected_cards}. Доступно: ${data.cards_status.available}, Скрыто: ${data.cards_status.hidden}`
        })
      }

      setIsEditing(false)
      setComment('')
      
      if (onUpdate) {
        onUpdate()
      }

    } catch (error: any) {
      console.error('Ошибка обновления баланса:', error)
      addToast({
        type: 'error',
        title: 'Ошибка обновления баланса',
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  function handleCancel() {
    setNewBalance(account.balance)
    setComment('')
    setIsEditing(false)
  }

  async function loadHistory() {
    setLoadingHistory(true)
    
    try {
      const response = await fetch(`/api/bank-accounts/${account.id}/balance`)
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки истории')
      }

      const { history: historyData } = await response.json()
      setHistory(historyData)
      setShowHistoryModal(true)

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка загрузки истории',
        description: error.message
      })
    } finally {
      setLoadingHistory(false)
    }
  }

  function getBalanceStatus() {
    if (account.balance >= 10) {
      return {
        color: 'text-success-600',
        bg: 'bg-success-100',
        icon: <CheckCircleIcon className="h-4 w-4" />,
        text: 'Карты доступны'
      }
    } else {
      return {
        color: 'text-danger-600',
        bg: 'bg-danger-100',
        icon: <ExclamationTriangleIcon className="h-4 w-4" />,
        text: 'Карты скрыты'
      }
    }
  }

  const status = getBalanceStatus()

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="flex justify-between items-center mb-2">
        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
          {status.icon}
          <span className="ml-1">{status.text}</span>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <span className="text-lg font-medium">$</span>
            <input
              type="number"
              value={newBalance}
              onChange={(e) => setNewBalance(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
              className="flex-1 form-input"
              placeholder="0.00"
            />
            <span className="text-sm text-gray-500">{account.currency}</span>
          </div>

          <textarea
            placeholder="Причина изменения баланса (обязательно)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full form-input"
            rows={2}
            required
          />

          <div className="flex justify-end space-x-2">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="btn-secondary text-sm"
            >
              <XMarkIcon className="h-4 w-4 mr-1" />
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !comment.trim()}
              className="btn-primary text-sm"
            >
              <CheckIcon className="h-4 w-4 mr-1" />
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-end items-center mb-2">
            <div className="flex space-x-1">
              {showHistory && (
                <button
                  onClick={loadHistory}
                  disabled={loadingHistory}
                  className="btn-secondary text-xs px-2 py-1"
                >
                  <EyeIcon className="h-3 w-3 mr-1" />
                  {loadingHistory ? 'Загрузка...' : 'История'}
                </button>
              )}
              {canEdit && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn-primary text-xs px-2 py-1"
                >
                  <PencilIcon className="h-3 w-3 mr-1" />
                  Изменить
                </button>
              )}
            </div>
          </div>

          <div className="text-xs text-gray-500 flex items-center">
            <ClockIcon className="h-3 w-3 mr-1" />
            Обновлено {new Date(account.balance_updated_at).toLocaleDateString('ru-RU')} в {new Date(account.balance_updated_at).toLocaleTimeString('ru-RU')}
          </div>
        </div>
      )}

      {/* Modal истории изменений */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">История изменений баланса</h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {history.map(entry => (
                <div key={entry.id} className="border-l-4 border-primary-200 pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900">
                        ${entry.old_balance} → ${entry.new_balance}
                        <span className={`ml-2 ${entry.change_amount >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                          ({entry.change_amount >= 0 ? '+' : ''}${entry.change_amount})
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">{entry.change_reason}</div>
                      <div className="text-xs text-gray-500">
                        {entry.changed_by_user?.name} ({entry.changed_by_user?.role})
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(entry.created_at).toLocaleDateString('ru-RU')} {new Date(entry.created_at).toLocaleTimeString('ru-RU')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
