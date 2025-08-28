'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface Junior {
  id: string
  full_name: string
  email: string
  active_assignments: any[]
}

interface Casino {
  id: string
  name: string
  allowed_bins?: string[]
}

interface Card {
  id: string
  card_number_mask: string
  card_bin: string
  bank: {
    name: string
    currency: string
  }
  bank_account: {
    balance: number
    holder_name: string
  }
}

interface CardAssignmentModalProps {
  card: Card
  isOpen: boolean
  onClose: () => void
  onSubmit: (juniorId: string, casinoId: string) => Promise<void>
}

export default function CardAssignmentModal({ 
  card, 
  isOpen, 
  onClose, 
  onSubmit 
}: CardAssignmentModalProps) {
  const [juniors, setJuniors] = useState<Junior[]>([])
  const [casinos, setCasinos] = useState<Casino[]>([])
  const [selectedJunior, setSelectedJunior] = useState('')
  const [selectedCasino, setSelectedCasino] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  async function loadData() {
    setLoading(true)
    try {
      // Загружаем Junior'ов и казино параллельно
      const [juniorsRes, casinosRes] = await Promise.all([
        fetch('/api/manager/juniors'),
        fetch('/api/casinos')
      ])

      const juniorsData = await juniorsRes.json()
      const casinosData = await casinosRes.json()

      setJuniors(juniorsData.juniors || [])
      setCasinos(casinosData.casinos || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit() {
    if (!selectedJunior || !selectedCasino) return

    try {
      setSubmitting(true)
      await onSubmit(selectedJunior, selectedCasino)
      onClose()
      setSelectedJunior('')
      setSelectedCasino('')
    } catch (error) {
      console.error('Error submitting assignment:', error)
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    onClose()
    setSelectedJunior('')
    setSelectedCasino('')
  }

  if (!isOpen) return null

  // Фильтруем казино по BIN-совместимости
  const compatibleCasinos = casinos.filter(casino => {
    if (!casino.allowed_bins || casino.allowed_bins.length === 0) {
      return true // Если нет ограничений по BIN, казино подходит
    }
    return casino.allowed_bins.includes(card.card_bin)
  })

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">Назначение карты</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Информация о карте */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Карта для назначения</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Номер карты:</span>
                <div className="font-mono font-medium">{card.card_number_mask}</div>
              </div>
              <div>
                <span className="text-gray-600">BIN:</span>
                <div className="font-mono font-medium">{card.card_bin}</div>
              </div>
              <div>
                <span className="text-gray-600">Банк:</span>
                <div className="font-medium">{card.bank.name}</div>
              </div>
              <div>
                <span className="text-gray-600">Баланс:</span>
                <div className="font-medium text-green-600">
                  ${card.bank_account.balance.toFixed(2)} {card.bank.currency}
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Держатель:</span>
                <div className="font-medium">{card.bank_account.holder_name}</div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Загрузка данных...</div>
            </div>
          ) : (
            <>
              {/* Выбор Junior'а */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Выберите Junior'а
                </label>
                <select
                  value={selectedJunior}
                  onChange={(e) => setSelectedJunior(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">-- Выберите Junior'а --</option>
                  {juniors.map((junior) => (
                    <option key={junior.id} value={junior.id}>
                      {junior.full_name} ({junior.email}) - {junior.active_assignments.length} карт
                    </option>
                  ))}
                </select>
              </div>

              {/* Выбор казино */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Выберите казино
                </label>
                <select
                  value={selectedCasino}
                  onChange={(e) => setSelectedCasino(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">-- Выберите казино --</option>
                  {compatibleCasinos.map((casino) => (
                    <option key={casino.id} value={casino.id}>
                      {casino.name}
                      {casino.allowed_bins && casino.allowed_bins.length > 0 && 
                        ` (BIN: ${casino.allowed_bins.join(', ')})`
                      }
                    </option>
                  ))}
                </select>
                {casinos.length > compatibleCasinos.length && (
                  <div className="mt-2 text-sm text-amber-600">
                    ⚠️ Некоторые казино скрыты из-за несовместимости BIN {card.card_bin}
                  </div>
                )}
              </div>

              {/* Предупреждения */}
              {selectedJunior && selectedCasino && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Подтверждение назначения</h4>
                  <div className="text-sm text-blue-700">
                    Карта <span className="font-mono">{card.card_number_mask}</span> будет назначена 
                    Junior'у <span className="font-medium">
                      {juniors.find(j => j.id === selectedJunior)?.full_name}
                    </span> для работы в казино <span className="font-medium">
                      {casinos.find(c => c.id === selectedCasino)?.name}
                    </span>.
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={submitting}
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedJunior || !selectedCasino || submitting || loading}
            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Назначение...' : 'Назначить карту'}
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
