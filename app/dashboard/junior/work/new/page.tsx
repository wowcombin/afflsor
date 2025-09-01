'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'
import { 
  BriefcaseIcon,
  CreditCardIcon,
  ComputerDesktopIcon,
  EyeIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'

interface Casino {
  id: string
  name: string
  url: string
  promo?: string
  currency: string
  status: string
  allowed_bins: string[]
  auto_approve_limit: number
}

interface Card {
  id: string
  card_number_mask: string
  card_bin: string
  card_type: string
  status: string
  account_balance: number
  account_currency: string
  bank_account: {
    id: string
    holder_name: string
    currency: string
    bank: {
      name: string
      country: string
    } | null
  }
  casino_assignments: Array<{
    assignment_id: string
    casino_id: string
    casino_name: string
    casino_company?: string
    casino_currency?: string
    assignment_type: string
    status: string
    deposit_amount?: number
    has_deposit: boolean
  }>
}

export default function NewWorkPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToast } = useToast()
  const [casinos, setCasinos] = useState<Casino[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  // Форма создания работы
  const [workForm, setWorkForm] = useState({
    casino_id: '',
    card_id: '',
    deposit_amount: 0,
    casino_login: '',
    casino_password: '',
    notes: ''
  })

  const [showCardModal, setShowCardModal] = useState(false)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      // Получаем card_id из URL параметров
      const preselectedCardId = searchParams.get('card_id')

      // Загружаем доступные казино
      const casinosResponse = await fetch('/api/casinos?status=approved')
      if (casinosResponse.ok) {
        const { casinos: casinosData } = await casinosResponse.json()
        setCasinos(casinosData.filter((c: Casino) => c.status === 'approved'))
      }

      // Загружаем назначенные карты
      const cardsResponse = await fetch('/api/cards')
      if (cardsResponse.ok) {
        const { cards: cardsData } = await cardsResponse.json()
        const availableCards = cardsData.filter((c: Card) => c.status === 'active')
        setCards(availableCards)

        // Предзаполняем карту из URL параметра
        if (preselectedCardId && availableCards.find((c: Card) => c.id === preselectedCardId)) {
          setWorkForm(prev => ({ ...prev, card_id: preselectedCardId }))
          addToast({
            type: 'success',
            title: 'Карта выбрана',
            description: 'Карта автоматически выбрана из ссылки'
          })
        }
      }

    } catch (error: any) {
      console.error('Ошибка загрузки данных:', error)
      addToast({
        type: 'error',
        title: 'Ошибка загрузки данных',
        description: 'Проверьте подключение к серверу'
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateWork() {
    if (!workForm.casino_id || !workForm.card_id || !workForm.deposit_amount) {
      addToast({ type: 'error', title: 'Заполните все обязательные поля' })
      return
    }

    if (workForm.deposit_amount <= 0) {
      addToast({ type: 'error', title: 'Сумма депозита должна быть больше 0' })
      return
    }

    setCreating(true)

    try {
      const response = await fetch('/api/works', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          casino_id: workForm.casino_id,
          card_id: workForm.card_id,
          deposit_amount: workForm.deposit_amount,
          casino_login: workForm.casino_login,
          casino_password: workForm.casino_password,
          notes: workForm.notes
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'Работа создана',
        description: data.message
      })

      // Перенаправляем на дашборд
      router.push('/dashboard/junior')

    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ошибка создания работы',
        description: error.message
      })
    } finally {
      setCreating(false)
    }
  }

  function getSelectedCasino() {
    return casinos.find(c => c.id === workForm.casino_id)
  }

  function getSelectedCard() {
    return cards.find(c => c.id === workForm.card_id)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => router.back()}
          className="btn-secondary"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Назад
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Создать новую работу</h1>
          <p className="text-gray-600">Выберите казино и карту для создания депозита</p>
        </div>
      </div>

      <div className="max-w-2xl">
        {/* Форма создания */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Параметры работы</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="form-label">Казино *</label>
              <select
                value={workForm.casino_id}
                onChange={(e) => setWorkForm({ ...workForm, casino_id: e.target.value })}
                className="form-input"
                required
              >
                <option value="">Выберите казино</option>
                {casinos.map(casino => (
                  <option key={casino.id} value={casino.id}>
                    {casino.name}
                  </option>
                ))}
              </select>
              {getSelectedCasino() && (
                <div className="mt-2">
                  <button
                    onClick={() => {
                      const casino = getSelectedCasino()!
                      const promoText = casino.promo || 'Промо-код не указан'
                      navigator.clipboard.writeText(promoText)
                      addToast({
                        type: 'success',
                        title: 'Скопировано!',
                        description: casino.promo ? 'Промо-код скопирован в буфер обмена' : 'Промо-код не найден'
                      })
                    }}
                    className="btn-secondary text-xs"
                    disabled={!getSelectedCasino()?.promo}
                  >
                    📋 Скопировать промо
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="form-label">Карта *</label>
              <select
                value={workForm.card_id}
                onChange={(e) => setWorkForm({ ...workForm, card_id: e.target.value })}
                className="form-input"
                required
              >
                <option value="">Выберите карту</option>
                {cards.map(card => (
                  <option key={card.id} value={card.id}>
                    {card.card_number_mask} - {card.bank_account?.bank?.name || 'Неизвестный банк'}
                  </option>
                ))}
              </select>
              {getSelectedCard() && (
                <div className="mt-2 text-sm text-gray-600">
                  <div>Тип: {getSelectedCard()!.card_type}</div>
                  <div>Аккаунт: {getSelectedCard()!.bank_account?.holder_name || 'Неизвестный аккаунт'}</div>
                </div>
              )}
            </div>

            <div>
              <label className="form-label">
                Сумма депозита ({getSelectedCasino()?.currency || '$'}) *
              </label>
              <input
                type="number"
                value={workForm.deposit_amount}
                onChange={(e) => setWorkForm({ ...workForm, deposit_amount: parseFloat(e.target.value) || 0 })}
                className="form-input"
                placeholder="100.00"
                min="1"
                step="0.01"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Логин для казино</label>
                <input
                  type="text"
                  value={workForm.casino_login}
                  onChange={(e) => setWorkForm({ ...workForm, casino_login: e.target.value })}
                  className="form-input"
                  placeholder="username"
                />
              </div>
              <div>
                <label className="form-label">Пароль для казино</label>
                <input
                  type="password"
                  value={workForm.casino_password}
                  onChange={(e) => setWorkForm({ ...workForm, casino_password: e.target.value })}
                  className="form-input"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Заметки</label>
              <textarea
                value={workForm.notes}
                onChange={(e) => setWorkForm({ ...workForm, notes: e.target.value })}
                className="form-input"
                rows={3}
                placeholder="Особенности, заметки по работе..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Кнопки действий */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={() => router.push('/dashboard/junior')}
          className="btn-secondary"
        >
          Отмена
        </button>
        <button
          onClick={handleCreateWork}
          disabled={creating || !workForm.casino_id || !workForm.card_id || !workForm.deposit_amount}
          className="btn-primary"
        >
          {creating ? 'Создание...' : 'Создать работу'}
        </button>
      </div>

      {/* Modal показа секретов карты (упрощенная версия) */}
      <Modal
        isOpen={showCardModal}
        onClose={() => {
          setShowCardModal(false)
          setSelectedCard(null)
        }}
        title={`Секреты карты ${selectedCard?.card_number_mask}`}
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
            <div className="text-sm text-warning-800">
              <p className="font-medium">Функция в разработке</p>
              <p>Показ секретов карты будет доступен в следующем обновлении.</p>
              <p className="mt-2">Пока используйте страницу "Мои карты" для получения секретов.</p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setShowCardModal(false)}
              className="btn-secondary"
            >
              Закрыть
            </button>
          </div>
        </div>
      </Modal>

      {/* Инструкции */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
        <h3 className="font-medium text-primary-900 mb-3">📋 Создание работы</h3>
        <div className="text-sm text-primary-800 space-y-2">
          <div>1. <strong>Выберите одобренное казино</strong> из списка</div>
          <div>2. <strong>Выберите доступную карту</strong> с достаточным балансом</div>
          <div>3. <strong>Укажите сумму депозита</strong> для работы</div>
          <div>4. <strong>Заполните данные входа</strong> в казино (если есть)</div>
          <div>5. <strong>Создайте работу</strong> и переходите к выполнению</div>
        </div>
      </div>
    </div>
  )
}
