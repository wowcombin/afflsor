'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon, PlusIcon, TrashIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

interface Casino {
  id: string
  name: string
  url: string
  status: string
  allowed_bins?: string[]
}

interface BinManagementModalProps {
  casino: Casino | null
  isOpen: boolean
  onClose: () => void
  onSave: (casinoId: string, bins: string[]) => Promise<void>
}

export default function BinManagementModal({ 
  casino, 
  isOpen, 
  onClose, 
  onSave 
}: BinManagementModalProps) {
  const [bins, setBins] = useState<string[]>([])
  const [newBin, setNewBin] = useState('')
  const [saving, setSaving] = useState(false)
  const [duplicateError, setDuplicateError] = useState('')

  useEffect(() => {
    if (isOpen && casino) {
      setBins(casino.allowed_bins || [])
      setNewBin('')
      setDuplicateError('')
    }
  }, [isOpen, casino])

  function validateBin(bin: string): boolean {
    // БИН должен быть 6 цифр
    return /^\d{6}$/.test(bin)
  }

  function addBin() {
    const trimmedBin = newBin.trim()
    
    if (!validateBin(trimmedBin)) {
      setDuplicateError('БИН должен содержать ровно 6 цифр')
      return
    }

    if (bins.includes(trimmedBin)) {
      setDuplicateError('Этот БИН уже добавлен')
      return
    }

    setBins([...bins, trimmedBin])
    setNewBin('')
    setDuplicateError('')
  }

  function removeBin(binToRemove: string) {
    setBins(bins.filter(bin => bin !== binToRemove))
  }

  async function handleSave() {
    if (!casino) return

    try {
      setSaving(true)
      await onSave(casino.id, bins)
      onClose()
    } catch (error) {
      console.error('Ошибка сохранения БИНов:', error)
    } finally {
      setSaving(false)
    }
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addBin()
    }
  }

  if (!isOpen || !casino) return null

  const modalContent = (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Управление БИНами
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {casino.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {/* Информация */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h3 className="font-medium text-blue-900 mb-2">📝 Что такое БИН?</h3>
              <p className="text-sm text-blue-700 mb-2">
                БИН (Bank Identification Number) - это первые 6 цифр номера карты, которые идентифицируют банк-эмитент.
              </p>
              <p className="text-sm text-blue-700">
                <strong>Примеры:</strong> 423456, 534567, 645678
              </p>
            </div>

            {/* Добавление нового БИНа */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Добавить новый БИН
              </label>
              <div className="flex space-x-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={newBin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                      setNewBin(value)
                      setDuplicateError('')
                    }}
                    onKeyPress={handleKeyPress}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-lg"
                    placeholder="123456"
                    maxLength={6}
                  />
                  {duplicateError && (
                    <div className="mt-1 text-sm text-red-600">{duplicateError}</div>
                  )}
                </div>
                <button
                  onClick={addBin}
                  disabled={!newBin || newBin.length !== 6}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <PlusIcon className="h-5 w-5 mr-1" />
                  Добавить
                </button>
              </div>
            </div>

            {/* Список БИНов */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">
                  Разрешенные БИНы ({bins.length})
                </label>
                {bins.length > 0 && (
                  <button
                    onClick={() => setBins([])}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Очистить все
                  </button>
                )}
              </div>

              {bins.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                  <div className="text-4xl mb-2">💳</div>
                  <div className="text-lg font-medium">Нет БИНов</div>
                  <div className="text-sm">Добавьте БИНы карт, которые работают с этим казино</div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {bins.map((bin, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50"
                    >
                      <div className="flex items-center">
                        <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                        <span className="font-mono text-lg font-semibold">{bin}</span>
                      </div>
                      <button
                        onClick={() => removeBin(bin)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                        title="Удалить БИН"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Статистика */}
            {bins.length > 0 && (
              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">📊 Статистика БИНов</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-green-700">Всего БИНов:</span>
                    <span className="font-bold ml-2">{bins.length}</span>
                  </div>
                  <div>
                    <span className="text-green-700">Покрытие карт:</span>
                    <span className="font-bold ml-2">~{bins.length * 15}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Сохранение...' : 'Сохранить БИНы'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
