'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon, EyeIcon, ClockIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'

interface Card {
  id: string
  card_number_mask: string
  card_bin: string
  exp_month: number
  exp_year: number
  cvv?: string
}

interface CVVRevealModalProps {
  card: Card | null
  isOpen: boolean
  onClose: () => void
}

export default function CVVRevealModal({ card, isOpen, onClose }: CVVRevealModalProps) {
  const [pin, setPin] = useState('')
  const [cvv, setCvv] = useState('')
  const [pinError, setPinError] = useState('')
  const [loading, setLoading] = useState(false)
  const [cvvVisible, setCvvVisible] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30)
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isOpen) {
      resetModal()
    }
  }, [isOpen])

  useEffect(() => {
    if (cvvVisible && timeLeft > 0) {
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            hideCvv()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      setTimer(interval)
      
      return () => {
        if (interval) clearInterval(interval)
      }
    }
  }, [cvvVisible, timeLeft])

  function resetModal() {
    setPin('')
    setCvv('')
    setPinError('')
    setCvvVisible(false)
    setTimeLeft(30)
    if (timer) {
      clearInterval(timer)
      setTimer(null)
    }
  }

  function hideCvv() {
    setCvvVisible(false)
    setCvv('')
    setTimeLeft(30)
    if (timer) {
      clearInterval(timer)
      setTimer(null)
    }
  }

  async function handlePinSubmit() {
    if (pin.length !== 4) {
      setPinError('PIN должен содержать 4 цифры')
      return
    }

    setLoading(true)
    setPinError('')

    try {
      const response = await fetch('/api/cards/reveal-cvv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          card_id: card?.id,
          pin: pin
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      setCvv(data.cvv)
      setCvvVisible(true)
      setTimeLeft(30)
    } catch (error: any) {
      setPinError(error.message || 'Неверный PIN')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  function handlePinInput(value: string) {
    const numericValue = value.replace(/\D/g, '').slice(0, 4)
    setPin(numericValue)
    setPinError('')
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && pin.length === 4) {
      handlePinSubmit()
    }
  }

  if (!isOpen || !card) return null

  const modalContent = (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center">
              <ShieldCheckIcon className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">
                Просмотр CVV
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Card Info */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-medium text-gray-900 mb-2">Информация о карте</h3>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-gray-500">Номер:</span>
                  <span className="ml-2 font-mono font-semibold">
                    {card.card_bin}** **** {card.card_number_mask?.slice(-4)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Срок:</span>
                  <span className="ml-2 font-mono">
                    {String(card.exp_month).padStart(2, '0')}/{card.exp_year}
                  </span>
                </div>
              </div>
            </div>

            {!cvvVisible ? (
              /* PIN Input */
              <div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    <EyeIcon className="h-5 w-5 text-yellow-600 mr-2" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Безопасный просмотр CVV</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        CVV будет отображен только на 30 секунд
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Введите PIN (4 цифры)
                  </label>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => handlePinInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-2xl font-mono tracking-widest"
                    placeholder="••••"
                    maxLength={4}
                    autoFocus
                  />
                  {pinError && (
                    <div className="mt-2 text-sm text-red-600">{pinError}</div>
                  )}
                </div>

                <button
                  onClick={handlePinSubmit}
                  disabled={pin.length !== 4 || loading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Проверка PIN...' : 'Показать CVV'}
                </button>
              </div>
            ) : (
              /* CVV Display */
              <div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ClockIcon className="h-5 w-5 text-green-600 mr-2" />
                      <span className="font-medium text-green-800">
                        CVV отображается
                      </span>
                    </div>
                    <div className="flex items-center text-green-700">
                      <span className="font-bold text-lg">{timeLeft}</span>
                      <span className="text-sm ml-1">сек</span>
                    </div>
                  </div>
                  
                  {/* Прогресс бар */}
                  <div className="mt-3 w-full bg-green-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${(timeLeft / 30) * 100}%` }}
                    />
                  </div>
                </div>

                {/* CVV */}
                <div className="text-center mb-6">
                  <div className="text-sm text-gray-500 mb-2">CVV код</div>
                  <div className="text-6xl font-mono font-bold text-gray-900 tracking-widest bg-gray-100 rounded-lg py-4">
                    {cvv}
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={hideCvv}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Скрыть CVV
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(cvv)
                      // TODO: Показать toast уведомление
                    }}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Копировать
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
