'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface Casino {
  id: string
  name: string
  url: string
}

interface CasinoTest {
  id?: string
  casino_id: string
  test_type: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  rating?: number
  deposit_test_amount?: number
  withdrawal_test_amount?: number
  test_notes?: string
  issues_found?: string
  recommendations?: string
  casinos?: {
    name: string
  }
}

interface CasinoTestModalProps {
  test?: CasinoTest | null
  isOpen: boolean
  onClose: () => void
  onSubmit: (testData: any) => Promise<void>
  mode: 'create' | 'complete'
}

export default function CasinoTestModal({ 
  test, 
  isOpen, 
  onClose, 
  onSubmit,
  mode 
}: CasinoTestModalProps) {
  const [casinos, setCasinos] = useState<Casino[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // Форма данных
  const [formData, setFormData] = useState({
    casino_id: '',
    test_type: 'full',
    rating: 5,
    deposit_test_amount: 100,
    withdrawal_test_amount: 50,
    test_notes: '',
    issues_found: '',
    recommendations: ''
  })

  useEffect(() => {
    if (isOpen) {
      if (mode === 'create') {
        loadCasinos()
        resetForm()
      } else if (mode === 'complete' && test) {
        setFormData({
          casino_id: test.casino_id,
          test_type: test.test_type,
          rating: test.rating || 5,
          deposit_test_amount: test.deposit_test_amount || 100,
          withdrawal_test_amount: test.withdrawal_test_amount || 50,
          test_notes: test.test_notes || '',
          issues_found: test.issues_found || '',
          recommendations: test.recommendations || ''
        })
      }
    }
  }, [isOpen, mode, test])

  async function loadCasinos() {
    setLoading(true)
    try {
      const response = await fetch('/api/casinos')
      const data = await response.json()
      setCasinos(data.casinos || [])
    } catch (error) {
      console.error('Error loading casinos:', error)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setFormData({
      casino_id: '',
      test_type: 'full',
      rating: 5,
      deposit_test_amount: 100,
      withdrawal_test_amount: 50,
      test_notes: '',
      issues_found: '',
      recommendations: ''
    })
  }

  async function handleSubmit() {
    try {
      setSubmitting(true)
      
      const submitData = mode === 'create' 
        ? {
            casino_id: formData.casino_id,
            test_type: formData.test_type,
            deposit_test_amount: formData.deposit_test_amount,
            withdrawal_test_amount: formData.withdrawal_test_amount,
            test_notes: formData.test_notes
          }
        : {
            status: 'completed',
            rating: formData.rating,
            test_notes: formData.test_notes,
            issues_found: formData.issues_found,
            recommendations: formData.recommendations,
            completed_at: new Date().toISOString()
          }

      await onSubmit(submitData)
      onClose()
      if (mode === 'create') resetForm()
      
    } catch (error) {
      console.error('Error submitting test:', error)
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    onClose()
    if (mode === 'create') resetForm()
  }

  if (!isOpen) return null

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">
            {mode === 'create' ? 'Создать новый тест' : 'Завершить тест'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {mode === 'complete' && test && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Тестируемое казино</h3>
              <div className="text-lg font-medium">{test.casinos?.name}</div>
              <div className="text-sm text-gray-600">Тип теста: {
                test.test_type === 'full' ? 'Полный тест' : 
                test.test_type === 'deposit' ? 'Тест депозита' : 
                test.test_type === 'withdrawal' ? 'Тест вывода' : test.test_type
              }</div>
            </div>
          )}

          {mode === 'create' && (
            <>
              {/* Выбор казино */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Казино для тестирования
                </label>
                {loading ? (
                  <div className="text-gray-500">Загрузка казино...</div>
                ) : (
                  <select
                    value={formData.casino_id}
                    onChange={(e) => setFormData({...formData, casino_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">-- Выберите казино --</option>
                    {casinos.map((casino) => (
                      <option key={casino.id} value={casino.id}>
                        {casino.name} ({casino.url})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Тип теста */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Тип теста
                </label>
                <select
                  value={formData.test_type}
                  onChange={(e) => setFormData({...formData, test_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="full">Полный тест (депозит + вывод)</option>
                  <option value="deposit">Только тест депозита</option>
                  <option value="withdrawal">Только тест вывода</option>
                </select>
              </div>

              {/* Суммы тестирования */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Сумма депозита ($)
                  </label>
                  <input
                    type="number"
                    value={formData.deposit_test_amount}
                    onChange={(e) => setFormData({...formData, deposit_test_amount: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="10"
                    max="1000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Сумма вывода ($)
                  </label>
                  <input
                    type="number"
                    value={formData.withdrawal_test_amount}
                    onChange={(e) => setFormData({...formData, withdrawal_test_amount: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="5"
                    max="500"
                  />
                </div>
              </div>
            </>
          )}

          {mode === 'complete' && (
            <>
              {/* Оценка казино */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Оценка казино (1-10)
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData.rating}
                    onChange={(e) => setFormData({...formData, rating: Number(e.target.value)})}
                    className="flex-1"
                  />
                  <div className="flex items-center">
                    <span className="text-2xl font-bold text-blue-600 mr-2">{formData.rating}</span>
                    <div className="flex">
                      {[...Array(10)].map((_, i) => (
                        <span
                          key={i}
                          className={`text-lg cursor-pointer ${i < formData.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                          onClick={() => setFormData({...formData, rating: i + 1})}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Найденные проблемы */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Найденные проблемы
                </label>
                <textarea
                  value={formData.issues_found}
                  onChange={(e) => setFormData({...formData, issues_found: e.target.value})}
                  placeholder="Опишите найденные проблемы или укажите 'Проблем не найдено'"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              {/* Рекомендации */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Рекомендации
                </label>
                <textarea
                  value={formData.recommendations}
                  onChange={(e) => setFormData({...formData, recommendations: e.target.value})}
                  placeholder="Рекомендации по улучшению или использованию казино"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </>
          )}

          {/* Заметки */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {mode === 'create' ? 'Заметки к тесту' : 'Дополнительные заметки'}
            </label>
            <textarea
              value={formData.test_notes}
              onChange={(e) => setFormData({...formData, test_notes: e.target.value})}
              placeholder={mode === 'create' ? 'Дополнительные инструкции для тестирования...' : 'Дополнительные заметки о тестировании...'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
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
            disabled={submitting || (mode === 'create' && !formData.casino_id)}
            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Сохранение...' : 
             mode === 'create' ? 'Создать тест' : 'Завершить тест'}
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
