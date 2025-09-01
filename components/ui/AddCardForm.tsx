'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/Toast'

interface AddCardFormProps {
  accountId: string | null
  onSuccess: () => void
  onCancel: () => void
}

export default function AddCardForm({ accountId, onSuccess, onCancel }: AddCardFormProps) {
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    card_number: '',
    cvv: '',
    exp_month: '',
    exp_year: '',
    card_type: 'grey',
    daily_limit: '',
    notes: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!accountId) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Не выбран аккаунт' })
      return
    }

    // Валидация
    if (!formData.card_number || formData.card_number.length !== 16) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Номер карты должен содержать 16 цифр' })
      return
    }

    if (!formData.cvv || formData.cvv.length !== 3) {
      addToast({ type: 'error', title: 'Ошибка', description: 'CVV должен содержать 3 цифры' })
      return
    }

    if (!formData.exp_month || !formData.exp_year) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Укажите месяц и год истечения' })
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_account_id: accountId,
          full_card_number: formData.card_number,
          cvv: formData.cvv,
          exp_month: parseInt(formData.exp_month),
          exp_year: parseInt(formData.exp_year),
          card_type: formData.card_type,
          daily_limit: formData.daily_limit ? parseFloat(formData.daily_limit) : null,
          notes: formData.notes || null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка создания карты')
      }

      const result = await response.json()
      addToast({
        type: 'success',
        title: 'Карта создана',
        description: `Карта ${result.card.card_number_mask} успешно добавлена`
      })

      onSuccess()
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка создания карты',
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Номер карты *
          </label>
          <input
            type="text"
            value={formData.card_number}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 16)
              handleInputChange('card_number', value)
            }}
            placeholder="1234567890123456"
            className="form-input w-full font-mono"
            required
          />
          <p className="text-xs text-gray-500 mt-1">16 цифр без пробелов</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CVV *
          </label>
          <input
            type="text"
            value={formData.cvv}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 3)
              handleInputChange('cvv', value)
            }}
            placeholder="123"
            className="form-input w-full font-mono"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Месяц истечения *
          </label>
          <select
            value={formData.exp_month}
            onChange={(e) => handleInputChange('exp_month', e.target.value)}
            className="form-select w-full"
            required
          >
            <option value="">Выберите месяц</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
              <option key={month} value={month}>
                {month.toString().padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Год истечения *
          </label>
          <select
            value={formData.exp_year}
            onChange={(e) => handleInputChange('exp_year', e.target.value)}
            className="form-select w-full"
            required
          >
            <option value="">Выберите год</option>
            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Тип карты
          </label>
          <select
            value={formData.card_type}
            onChange={(e) => handleInputChange('card_type', e.target.value)}
            className="form-select w-full"
          >
            <option value="grey">⚫ Grey</option>
            <option value="pink">🌸 Pink</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Дневной лимит (USD)
        </label>
        <input
          type="number"
          value={formData.daily_limit}
          onChange={(e) => handleInputChange('daily_limit', e.target.value)}
          placeholder="1000"
          min="0"
          step="0.01"
          className="form-input w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Заметки
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder="Дополнительная информация о карте..."
          rows={3}
          className="form-textarea w-full"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
          disabled={loading}
        >
          Отмена
        </button>
        <button
          type="submit"
          className="btn-success"
          disabled={loading}
        >
          {loading ? 'Создание...' : 'Создать карту'}
        </button>
      </div>
    </form>
  )
}
