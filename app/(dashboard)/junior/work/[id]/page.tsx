'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StatusBadge from '@/components/ui/StatusBadge'
import FormCard from '@/components/ui/FormCard'
import Alert from '@/components/ui/Alert'
import { useToast } from '@/components/ui/Toast'

interface Work {
  id: string
  deposit_amount: number
  casino_username: string
  casino_password: string
  status: string
  work_date: string
  created_at: string
  casinos: {
    name: string
    url: string
    auto_approve_limit: number
  }
  cards: {
    card_number_mask: string
    bank_accounts: {
      holder_name: string
      banks: {
        name: string
      }
    }
  }
  work_withdrawals: Array<{
    id: string
    withdrawal_amount: number
    status: string
    created_at: string
    checked_by?: string
    checked_at?: string
    alarm_message?: string
  }>
}

export default function WorkDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { addToast } = useToast()
  const [work, setWork] = useState<Work | null>(null)
  const [loading, setLoading] = useState(true)
  const [withdrawalAmount, setWithdrawalAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (params.id) {
      loadWorkDetail(params.id as string)
    }
  }, [params.id])

  async function loadWorkDetail(workId: string) {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      const { data: workData, error } = await supabase
        .from('works')
        .select(`
          *,
          casinos(name, url, auto_approve_limit),
          cards(
            card_number_mask,
            bank_accounts(
              holder_name,
              banks(name)
            )
          ),
          work_withdrawals(*)
        `)
        .eq('id', workId)
        .eq('junior_id', user.id)
        .single()

      if (error || !workData) {
        addToast('Работа не найдена', 'error')
        router.push('/junior/dashboard')
        return
      }

      setWork(workData as Work)

    } catch (error) {
      console.error('Error loading work detail:', error)
      addToast('Ошибка загрузки данных', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function createWithdrawal() {
    if (!work || !withdrawalAmount) return

    try {
      setSubmitting(true)

      const response = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          work_id: work.id,
          withdrawal_amount: parseFloat(withdrawalAmount)
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast('Вывод успешно создан', 'success')
      setWithdrawalAmount('')
      loadWorkDetail(work.id) // Перезагружаем данные

    } catch (error: any) {
      addToast(error.message || 'Ошибка создания вывода', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleWithdrawalStatus(withdrawalId: string, currentStatus: string) {
    try {
      const newStatus = currentStatus === 'new' ? 'waiting' : 'new'

      const response = await fetch(`/api/withdrawals/${withdrawalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast(data.message, 'success')
      loadWorkDetail(work!.id) // Перезагружаем данные

    } catch (error: any) {
      addToast(error.message || 'Ошибка изменения статуса', 'error')
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-200 rounded"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!work) {
    return (
      <div className="p-8">
        <Alert type="error" title="Работа не найдена">
          Запрашиваемая работа не существует или у вас нет к ней доступа.
        </Alert>
      </div>
    )
  }

  const totalWithdrawals = work.work_withdrawals.reduce((sum, w) => sum + w.withdrawal_amount, 0)
  const totalProfit = totalWithdrawals - work.deposit_amount
  const canCreateWithdrawal = work.status === 'active'

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Детали работы</h1>
        <div className="flex gap-4">
          <button
            onClick={() => router.push('/junior/withdrawals')}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Все выводы
          </button>
          <button
            onClick={() => router.push('/junior/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Дашборд
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Информация о работе */}
        <FormCard title="Информация о депозите">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Казино
                </label>
                <div className="text-lg font-semibold">{work.casinos.name}</div>
                {work.casinos.url && (
                  <a 
                    href={work.casinos.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Открыть сайт →
                  </a>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Статус работы
                </label>
                <StatusBadge status={work.status} type="work" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Карта
                </label>
                <div className="font-medium">{work.cards.card_number_mask}</div>
                <div className="text-sm text-gray-600">
                  {work.cards.bank_accounts.banks.name} • {work.cards.bank_accounts.holder_name}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Сумма депозита
                </label>
                <div className="text-lg font-semibold text-blue-600">
                  ${work.deposit_amount.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Логин в казино
                </label>
                <div className="font-mono text-sm bg-gray-100 p-2 rounded">
                  {work.casino_username}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Дата создания
                </label>
                <div className="text-sm">
                  {new Date(work.created_at).toLocaleString('ru-RU')}
                </div>
              </div>
            </div>

            {/* Сводка по выводам */}
            <div className="border-t pt-4 mt-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-sm text-gray-600">Всего выводов</div>
                  <div className="text-lg font-semibold">${totalWithdrawals.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Профит</div>
                  <div className={`text-lg font-semibold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${totalProfit.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Количество</div>
                  <div className="text-lg font-semibold">{work.work_withdrawals.length}</div>
                </div>
              </div>
            </div>
          </div>
        </FormCard>

        {/* Создание нового вывода */}
        <FormCard title="Создать вывод">
          {canCreateWithdrawal ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Сумма вывода ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Введите сумму вывода"
                />
              </div>

              {work.casinos.auto_approve_limit && (
                <Alert type="info" title="Автоодобрение">
                  Выводы до ${work.casinos.auto_approve_limit} могут быть одобрены автоматически.
                </Alert>
              )}

              <button
                onClick={createWithdrawal}
                disabled={!withdrawalAmount || submitting}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Создание...' : 'Создать вывод'}
              </button>
            </div>
          ) : (
            <Alert type="warning" title="Работа неактивна">
              Нельзя создавать выводы для неактивной работы.
            </Alert>
          )}
        </FormCard>
      </div>

      {/* Список выводов */}
      {work.work_withdrawals.length > 0 && (
        <div className="mt-8">
          <FormCard title="История выводов">
            <div className="space-y-4">
              {work.work_withdrawals
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((withdrawal) => (
                  <div key={withdrawal.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <span className="font-semibold text-lg">
                            ${withdrawal.withdrawal_amount.toFixed(2)}
                          </span>
                          <StatusBadge status={withdrawal.status} type="withdrawal" />
                          <span className="text-sm text-gray-600">
                            {new Date(withdrawal.created_at).toLocaleString('ru-RU')}
                          </span>
                        </div>
                        
                        {withdrawal.checked_at && (
                          <div className="text-sm text-gray-600">
                            Проверено: {new Date(withdrawal.checked_at).toLocaleString('ru-RU')}
                          </div>
                        )}
                        
                        {withdrawal.alarm_message && (
                          <Alert type="warning" title="Сообщение от менеджера">
                            {withdrawal.alarm_message}
                          </Alert>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        {['new', 'waiting'].includes(withdrawal.status) && (
                          <button
                            onClick={() => toggleWithdrawalStatus(withdrawal.id, withdrawal.status)}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                          >
                            {withdrawal.status === 'new' ? 'Отправить на проверку' : 'Вернуть в черновик'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </FormCard>
        </div>
      )}
    </div>
  )
}
