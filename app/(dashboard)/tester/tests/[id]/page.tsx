'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface CasinoTest {
  id: string
  casino_id: string
  status: string
  registration_time?: number
  deposit_success: boolean
  withdrawal_time?: number
  issues_found?: string[]
  recommended_bins?: string[]
  test_result?: string
  notes?: string
  created_at: string
  completed_at?: string
  casinos: {
    name: string
    url: string
    status: string
    allowed_bins?: string[]
    auto_approve_limit: number
  }
  users: {
    first_name: string
    last_name: string
  }
}

export default function TestDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [test, setTest] = useState<CasinoTest | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Форма данных
  const [formData, setFormData] = useState({
    status: '',
    registration_time: '',
    deposit_success: false,
    withdrawal_time: '',
    issues_found: '',
    recommended_bins: '',
    test_result: '',
    notes: ''
  })

  useEffect(() => {
    if (params.id) {
      loadTest()
    }
  }, [params.id])

  async function loadTest() {
    try {
      const response = await fetch(`/api/casino-tests/${params.id}`)
      const data = await response.json()
      
      if (response.ok) {
        setTest(data.test)
        // Заполняем форму текущими данными
        setFormData({
          status: data.test.status || '',
          registration_time: data.test.registration_time ? String(data.test.registration_time) : '',
          deposit_success: data.test.deposit_success || false,
          withdrawal_time: data.test.withdrawal_time ? String(data.test.withdrawal_time) : '',
          issues_found: data.test.issues_found ? data.test.issues_found.join('\n') : '',
          recommended_bins: data.test.recommended_bins ? data.test.recommended_bins.join(', ') : '',
          test_result: data.test.test_result || '',
          notes: data.test.notes || ''
        })
      } else {
        console.error('Error loading test:', data.error)
        router.push('/tester/tests')
      }
    } catch (error) {
      console.error('Error loading test:', error)
      router.push('/tester/tests')
    } finally {
      setLoading(false)
    }
  }

  async function saveTest() {
    if (!test) return
    
    setSaving(true)
    try {
      const updateData = {
        status: formData.status,
        registration_time: formData.registration_time ? parseInt(formData.registration_time) : null,
        deposit_success: formData.deposit_success,
        withdrawal_time: formData.withdrawal_time ? parseInt(formData.withdrawal_time) : null,
        issues_found: formData.issues_found ? formData.issues_found.split('\n').filter(issue => issue.trim()) : [],
        recommended_bins: formData.recommended_bins ? formData.recommended_bins.split(',').map(bin => bin.trim()).filter(bin => bin) : [],
        test_result: formData.test_result || null,
        notes: formData.notes || null
      }

      const response = await fetch(`/api/casino-tests/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      const data = await response.json()

      if (response.ok) {
        alert('Тест успешно обновлен!')
        loadTest() // Перезагружаем данные
      } else {
        alert('Ошибка сохранения: ' + data.error)
      }
    } catch (error) {
      console.error('Error saving test:', error)
      alert('Ошибка сохранения теста')
    } finally {
      setSaving(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const canEdit = test && ['pending', 'in_progress'].includes(test.status)

  if (loading) return <div className="p-8">Загрузка...</div>
  if (!test) return <div className="p-8">Тест не найден</div>

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Тест казино: {test.casinos.name}</h1>
          <p className="text-gray-600 mt-2">
            <a href={test.casinos.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {test.casinos.url}
            </a>
          </p>
        </div>
        <div className="flex gap-4">
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(test.status)}`}>
            {test.status === 'pending' ? 'Ожидает' :
             test.status === 'in_progress' ? 'В процессе' :
             test.status === 'completed' ? 'Завершен' :
             test.status === 'failed' ? 'Провален' : test.status}
          </span>
          <button
            onClick={() => router.push('/tester/tests')}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Назад к списку
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Левая колонка - Информация о казино */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Информация о казино</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Название:</span>
                <div className="font-medium">{test.casinos.name}</div>
              </div>
              <div>
                <span className="text-sm text-gray-500">URL:</span>
                <div className="font-medium">
                  <a href={test.casinos.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {test.casinos.url}
                  </a>
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-500">Лимит автоподтверждения:</span>
                <div className="font-medium">${test.casinos.auto_approve_limit}</div>
              </div>
              <div>
                <span className="text-sm text-gray-500">Разрешенные BIN:</span>
                <div className="font-medium">
                  {test.casinos.allowed_bins && test.casinos.allowed_bins.length > 0 
                    ? test.casinos.allowed_bins.join(', ')
                    : 'Не указаны'
                  }
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Информация о тесте</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Тестер:</span>
                <div className="font-medium">{test.users.first_name} {test.users.last_name}</div>
              </div>
              <div>
                <span className="text-sm text-gray-500">Создан:</span>
                <div className="font-medium">{new Date(test.created_at).toLocaleString('ru-RU')}</div>
              </div>
              {test.completed_at && (
                <div>
                  <span className="text-sm text-gray-500">Завершен:</span>
                  <div className="font-medium">{new Date(test.completed_at).toLocaleString('ru-RU')}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Центральная и правая колонки - Форма теста */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-6">Результаты тестирования</h2>
            
            <div className="space-y-6">
              {/* Статус теста */}
              <div>
                <label className="block text-sm font-medium mb-2">Статус теста</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  disabled={!canEdit}
                  className="w-full p-3 border rounded-lg disabled:bg-gray-100"
                >
                  <option value="pending">Ожидает</option>
                  <option value="in_progress">В процессе</option>
                  <option value="completed">Завершен</option>
                  <option value="failed">Провален</option>
                </select>
              </div>

              {/* Время регистрации */}
              <div>
                <label className="block text-sm font-medium mb-2">Время регистрации (секунды)</label>
                <input
                  type="number"
                  value={formData.registration_time}
                  onChange={(e) => setFormData({ ...formData, registration_time: e.target.value })}
                  disabled={!canEdit}
                  className="w-full p-3 border rounded-lg disabled:bg-gray-100"
                  placeholder="Введите время в секундах"
                />
              </div>

              {/* Успешность депозита */}
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.deposit_success}
                    onChange={(e) => setFormData({ ...formData, deposit_success: e.target.checked })}
                    disabled={!canEdit}
                    className="w-5 h-5 text-blue-600 disabled:opacity-50"
                  />
                  <span className="text-sm font-medium">Депозит прошел успешно</span>
                </label>
              </div>

              {/* Время вывода */}
              <div>
                <label className="block text-sm font-medium mb-2">Время вывода (секунды)</label>
                <input
                  type="number"
                  value={formData.withdrawal_time}
                  onChange={(e) => setFormData({ ...formData, withdrawal_time: e.target.value })}
                  disabled={!canEdit}
                  className="w-full p-3 border rounded-lg disabled:bg-gray-100"
                  placeholder="Введите время в секундах"
                />
              </div>

              {/* Найденные проблемы */}
              <div>
                <label className="block text-sm font-medium mb-2">Найденные проблемы (по одной на строке)</label>
                <textarea
                  value={formData.issues_found}
                  onChange={(e) => setFormData({ ...formData, issues_found: e.target.value })}
                  disabled={!canEdit}
                  rows={4}
                  className="w-full p-3 border rounded-lg disabled:bg-gray-100"
                  placeholder="Опишите найденные проблемы..."
                />
              </div>

              {/* Рекомендуемые BIN */}
              <div>
                <label className="block text-sm font-medium mb-2">Рекомендуемые BIN коды (через запятую)</label>
                <input
                  type="text"
                  value={formData.recommended_bins}
                  onChange={(e) => setFormData({ ...formData, recommended_bins: e.target.value })}
                  disabled={!canEdit}
                  className="w-full p-3 border rounded-lg disabled:bg-gray-100"
                  placeholder="Например: 4111, 5555, 3782"
                />
              </div>

              {/* Результат теста */}
              <div>
                <label className="block text-sm font-medium mb-2">Результат теста</label>
                <select
                  value={formData.test_result}
                  onChange={(e) => setFormData({ ...formData, test_result: e.target.value })}
                  disabled={!canEdit}
                  className="w-full p-3 border rounded-lg disabled:bg-gray-100"
                >
                  <option value="">Не определено</option>
                  <option value="approved">Одобрено</option>
                  <option value="rejected">Отклонено</option>
                </select>
              </div>

              {/* Заметки */}
              <div>
                <label className="block text-sm font-medium mb-2">Заметки</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  disabled={!canEdit}
                  rows={4}
                  className="w-full p-3 border rounded-lg disabled:bg-gray-100"
                  placeholder="Дополнительные заметки о тестировании..."
                />
              </div>

              {/* Кнопки действий */}
              {canEdit && (
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={saveTest}
                    disabled={saving}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Сохранение...' : 'Сохранить изменения'}
                  </button>
                  <button
                    onClick={loadTest}
                    disabled={saving}
                    className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 disabled:opacity-50"
                  >
                    Отменить изменения
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
