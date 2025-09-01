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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <div className="mt-2 text-sm text-gray-600">
                  <div>URL: <a href={getSelectedCasino()!.url} target="_blank" className="text-primary-600 hover:underline">{getSelectedCasino()!.url}</a></div>
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
                    {card.card_number_mask} - {card.bank_account?.bank?.name || 'Неизвестный банк'} ({card.account_currency === 'USD' ? '$' : card.account_currency}{card.account_balance})
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
              <label className="form-label">Сумма депозита ($) *</label>
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

        {/* Предпросмотр */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Предпросмотр</h3>
          </div>

          <div className="space-y-4">
            {getSelectedCasino() && (
              <div className="info-block">
                <h4 className="font-medium text-primary-900 mb-2">🎰 Казино</h4>
                <div className="text-sm text-primary-800">
                  <div className="font-medium">{getSelectedCasino()!.name}</div>
                  <div className="text-primary-600 break-all">{getSelectedCasino()!.url}</div>
                  {getSelectedCasino()!.promo && (
                    <div className="text-primary-700 mt-1">
                      Промо: <span className="font-mono bg-primary-100 px-1 rounded">{getSelectedCasino()!.promo}</span>
                    </div>
                  )}
                </div>
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
                  className="mt-2 btn-secondary text-xs"
                  disabled={!getSelectedCasino()?.promo}
                >
                  📋 Скопировать промо
                </button>
              </div>
            )}

            {getSelectedCard() && (
              <div className="success-block">
                <h4 className="font-medium text-success-900 mb-2">🃏 Карта</h4>
                <div className="text-sm text-success-800">
                  <div className="font-mono font-medium">{getSelectedCard()!.card_number_mask}</div>
                  <div>{getSelectedCard()!.bank_account?.bank?.name || 'Неизвестный банк'}</div>
                  <div>Баланс: <span className="font-medium">{getSelectedCard()!.account_currency === 'USD' ? '$' : getSelectedCard()!.account_currency}{getSelectedCard()!.account_balance}</span></div>
                  {getSelectedCard()!.casino_assignments.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-success-700">Назначения:</div>
                      {getSelectedCard()!.casino_assignments.map((assignment, index) => (
                        <div key={assignment.assignment_id} className="text-xs">
                          • {assignment.casino_name} ({assignment.assignment_type === 'junior_work' ? 'Работа' : 'Тест'})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedCard(getSelectedCard()!)
                    setShowCardModal(true)
                  }}
                  className="mt-3 btn-primary text-xs"
                >
                  <EyeIcon className="h-3 w-3 mr-1" />
                  Показать секреты
                </button>
              </div>
            )}

            {workForm.deposit_amount > 0 && (
              <div className="warning-block">
                <h4 className="font-medium text-warning-900 mb-2">💰 Депозит</h4>
                <div className="text-2xl font-bold text-warning-800">
                  ${workForm.deposit_amount.toFixed(2)}
                </div>
                <div className="text-xs text-warning-700 mt-1">
                  Убедитесь, что сумма корректна
                </div>
              </div>
            )}
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
