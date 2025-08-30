'use client'

import { useState } from 'react'
import { useToast } from './Toast'
import { 
  PencilIcon, 
  CheckIcon, 
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface BankAccount {
  id: string
  holder_name: string
  account_number: string
  balance: number
  currency: string
  balance_updated_at: string
  updated_by_user: {
    name: string
    role: string
  } | null
  cards_available: boolean
}

interface BankBalanceEditorProps {
  account: BankAccount
  userRole: string
  onUpdate?: () => void
}

export default function BankBalanceEditor({ account, userRole, onUpdate }: BankBalanceEditorProps) {
  const { addToast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [newBalance, setNewBalance] = useState(account.balance)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  const canEdit = ['manager', 'hr', 'cfo', 'admin'].includes(userRole)

  async function handleSave() {
    if (newBalance < 0) {
      addToast({ type: 'error', title: 'Баланс не может быть отрицательным' })
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/banks/${account.id}/balance`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          balance: newBalance,
          comment: comment || `Обновлено через интерфейс ${userRole}`
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'Баланс обновлен',
        description: `${account.holder_name}: $${account.balance} → $${newBalance}`
      })

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

  function getBalanceStatus() {
    if (account.balance >= 10) {
      return {
        color: 'text-green-600',
        bg: 'bg-green-100',
        icon: <CheckCircleIcon className="h-4 w-4" />,
        text: 'Карты доступны'
      }
    } else {
      return {
        color: 'text-red-600',
        bg: 'bg-red-100',
        icon: <ExclamationTriangleIcon className="h-4 w-4" />,
        text: 'Карты скрыты'
      }
    }
  }

  const status = getBalanceStatus()

  if (!canEdit) {
    // Только просмотр для ролей без прав редактирования
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-medium text-gray-900">{account.holder_name}</h3>
            <p className="text-sm text-gray-500">{account.account_number}</p>
          </div>
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
            {status.icon}
            <span className="ml-1">{status.text}</span>
          </div>
        </div>
        
        <div className="text-2xl font-bold text-gray-900 mb-2">
          ${account.balance.toFixed(2)} {account.currency}
        </div>

        {account.updated_by_user && (
          <div className="text-xs text-gray-500 flex items-center">
            <ClockIcon className="h-3 w-3 mr-1" />
            Обновлено {account.updated_by_user.name} ({account.updated_by_user.role})
            <span className="ml-1">
              {new Date(account.balance_updated_at).toLocaleDateString('ru-RU')}
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-medium text-gray-900">{account.holder_name}</h3>
          <p className="text-sm text-gray-500">{account.account_number}</p>
        </div>
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
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
            <span className="text-sm text-gray-500">{account.currency}</span>
          </div>

          <textarea
            placeholder="Комментарий к изменению (необязательно)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={2}
          />

          <div className="flex justify-end space-x-2">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="flex items-center px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              <XMarkIcon className="h-4 w-4 mr-1" />
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <CheckIcon className="h-4 w-4 mr-1" />
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-2">
            <div className="text-2xl font-bold text-gray-900">
              ${account.balance.toFixed(2)} {account.currency}
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
            >
              <PencilIcon className="h-4 w-4 mr-1" />
              Изменить
            </button>
          </div>

          {account.updated_by_user && (
            <div className="text-xs text-gray-500 flex items-center">
              <ClockIcon className="h-3 w-3 mr-1" />
              Обновлено {account.updated_by_user.name} ({account.updated_by_user.role})
              <span className="ml-1">
                {new Date(account.balance_updated_at).toLocaleDateString('ru-RU')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
