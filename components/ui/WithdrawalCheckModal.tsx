'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'

interface WithdrawalData {
  id: string
  withdrawal_amount: number
  status: string
  created_at: string
  works: {
    deposit_amount: number
    casino_username: string
    users: {
      first_name?: string
      last_name?: string
    }
    casinos: {
      name: string
    }
    cards: {
      card_number_mask: string
    }
  }
}

interface WithdrawalCheckModalProps {
  withdrawal: WithdrawalData
  isOpen: boolean
  onClose: () => void
  onSubmit: (status: string, message?: string) => Promise<void>
}

export default function WithdrawalCheckModal({ 
  withdrawal, 
  isOpen, 
  onClose, 
  onSubmit 
}: WithdrawalCheckModalProps) {
  const [selectedAction, setSelectedAction] = useState<string>('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const profit = withdrawal.withdrawal_amount - withdrawal.works.deposit_amount
  const waitingTime = Math.floor((Date.now() - new Date(withdrawal.created_at).getTime()) / 60000)

  const actions = [
    {
      id: 'received',
      label: 'Одобрить',
      color: 'bg-green-600 hover:bg-green-700',
      description: 'Вывод успешно получен'
    },
    {
      id: 'problem',
      label: 'Проблема',
      color: 'bg-yellow-600 hover:bg-yellow-700',
      description: 'Есть проблема, требует действий Junior'
    },
    {
      id: 'block',
      label: 'Заблокировать',
      color: 'bg-red-600 hover:bg-red-700',
      description: 'Серьезная проблема, эскалация к HR'
    }
  ]

  async function handleSubmit() {
    if (!selectedAction) return

    try {
      setSubmitting(true)
      await onSubmit(selectedAction, message.trim() || undefined)
      onClose()
      setSelectedAction('')
      setMessage('')
    } catch (error) {
      console.error('Error submitting withdrawal check:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">Проверка вывода</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Информация о выводе */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Детали вывода</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Junior:</span>
                <div className="font-medium">
                  {withdrawal.works.users.first_name} {withdrawal.works.users.last_name}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Казино:</span>
                <div className="font-medium">{withdrawal.works.casinos.name}</div>
              </div>
              <div>
                <span className="text-gray-600">Карта:</span>
                <div className="font-mono">{withdrawal.works.cards.card_number_mask}</div>
              </div>
              <div>
                <span className="text-gray-600">Логин в казино:</span>
                <div className="font-mono">{withdrawal.works.casino_username}</div>
              </div>
              <div>
                <span className="text-gray-600">Депозит:</span>
                <div className="font-medium">${withdrawal.works.deposit_amount.toFixed(2)}</div>
              </div>
              <div>
                <span className="text-gray-600">Вывод:</span>
                <div className="font-medium">${withdrawal.withdrawal_amount.toFixed(2)}</div>
              </div>
              <div>
                <span className="text-gray-600">Профит:</span>
                <div className={`font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${profit.toFixed(2)}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Ожидание:</span>
                <div className="font-medium">
                  {waitingTime < 60 
                    ? `${waitingTime} мин` 
                    : `${Math.floor(waitingTime / 60)}ч ${waitingTime % 60}м`
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Выбор действия */}
          <div>
            <h3 className="font-semibold mb-3">Выберите действие</h3>
            <div className="space-y-2">
              {actions.map((action) => (
                <label
                  key={action.id}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedAction === action.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="action"
                    value={action.id}
                    checked={selectedAction === action.id}
                    onChange={(e) => setSelectedAction(e.target.value)}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium">{action.label}</div>
                    <div className="text-sm text-gray-600">{action.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Сообщение (обязательно для problem и block) */}
          {selectedAction && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {['problem', 'block'].includes(selectedAction) ? 'Сообщение (обязательно)' : 'Сообщение (опционально)'}
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  selectedAction === 'received' 
                    ? 'Дополнительные комментарии...'
                    : selectedAction === 'problem'
                    ? 'Опишите проблему и что нужно исправить...'
                    : 'Причина блокировки...'
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                required={['problem', 'block'].includes(selectedAction)}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={submitting}
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedAction || submitting || (['problem', 'block'].includes(selectedAction) && !message.trim())}
            className={`px-4 py-2 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${
              selectedAction 
                ? actions.find(a => a.id === selectedAction)?.color || 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-400'
            }`}
          >
            {submitting ? 'Обработка...' : 'Подтвердить'}
          </button>
        </div>
      </div>
    </div>
  )

  // Рендерим модальное окно в портале
  return typeof window !== 'undefined' 
    ? createPortal(modalContent, document.body)
    : null
}
