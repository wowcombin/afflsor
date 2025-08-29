'use client'

import { useState } from 'react'
import { CreditCardIcon, CheckCircleIcon, ExclamationTriangleIcon, EyeIcon } from '@heroicons/react/24/outline'
import CVVRevealModal from './CVVRevealModal'

interface AssignedCard {
  id: string
  card_number_mask: string
  full_number: string
  exp_month: number
  exp_year: number
  status: 'available' | 'in_use' | 'used'
  casino_name?: string
  bank_name: string
  holder_name: string
  card_bin: string
  is_bin_compatible?: boolean
}

interface AssignedCardsBlockProps {
  cards: AssignedCard[]
  loading?: boolean
}

export default function AssignedCardsBlock({ cards, loading }: AssignedCardsBlockProps) {
  const [selectedCard, setSelectedCard] = useState<AssignedCard | null>(null)
  const [cvvModalOpen, setCvvModalOpen] = useState(false)

  function openCvvModal(card: AssignedCard) {
    setSelectedCard(card)
    setCvvModalOpen(true)
  }

  function closeCvvModal() {
    setSelectedCard(null)
    setCvvModalOpen(false)
  }
  function getStatusColor(status: string): string {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-50'
      case 'in_use': return 'text-blue-600 bg-blue-50'
      case 'used': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'available': return 'Свободна'
      case 'in_use': return 'В работе'
      case 'used': return 'Использована'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Активные карты</h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse border rounded-lg p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Активные карты</h3>
        <div className="text-sm text-gray-500">
          {cards.length} карт назначено
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <CreditCardIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <div className="text-lg font-medium">Нет назначенных карт</div>
          <div className="text-sm">Карты будут назначены менеджером</div>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map(card => (
            <div 
              key={card.id} 
              className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                card.is_bin_compatible === false ? 'border-red-200 bg-red-50' : 'border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {/* Номер карты */}
                  <div className="flex items-center mb-2">
                    <CreditCardIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <div className="font-mono text-lg font-semibold">
                      {card.full_number}
                    </div>
                    {card.is_bin_compatible === false && (
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500 ml-2" title="БИН не совместим с казино" />
                    )}
                    {card.is_bin_compatible === true && (
                      <CheckCircleIcon className="h-5 w-5 text-green-500 ml-2" title="БИН совместим" />
                    )}
                  </div>

                  {/* Срок действия */}
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Срок:</span> {String(card.exp_month).padStart(2, '0')}/{card.exp_year}
                  </div>

                  {/* Банк */}
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Банк:</span> {card.bank_name} - {card.holder_name}
                  </div>

                  {/* Казино */}
                  {card.casino_name && (
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Казино:</span> {card.casino_name}
                    </div>
                  )}

                  {/* БИН */}
                  <div className="text-xs font-mono text-gray-500">
                    БИН: {card.card_bin}
                  </div>
                </div>

                {/* Действия */}
                <div className="ml-4 space-y-2">
                  <div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(card.status)}`}>
                      {getStatusLabel(card.status)}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => openCvvModal(card)}
                    className="flex items-center px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                    title="Показать CVV (требуется PIN)"
                  >
                    <EyeIcon className="h-3 w-3 mr-1" />
                    Показать CVV
                  </button>
                </div>
              </div>

              {/* Предупреждение о несовместимости БИН */}
              {card.is_bin_compatible === false && (
                <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-700">
                  ⚠️ БИН карты не совместим с казино. Обратитесь к менеджеру.
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* CVV Reveal Modal */}
      <CVVRevealModal
        card={selectedCard ? {
          id: selectedCard.id,
          card_number_mask: selectedCard.card_number_mask,
          card_bin: selectedCard.card_bin,
          exp_month: selectedCard.exp_month,
          exp_year: selectedCard.exp_year
        } : null}
        isOpen={cvvModalOpen}
        onClose={closeCvvModal}
      />
    </div>
  )
}
