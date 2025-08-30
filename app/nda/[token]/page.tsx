'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DocumentTextIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface NDAData {
  token: string
  user: {
    email: string
    name: string
  }
  template: {
    name: string
    content: string
    version: number
  }
  expires_at: string
  status: 'valid' | 'expired' | 'signed'
}

export default function NDASigningPage() {
  const params = useParams()
  const router = useRouter()
  const [ndaData, setNdaData] = useState<NDAData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [signing, setSigning] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    passport: '',
    address: '',
    email: '',
    agreed: false
  })

  useEffect(() => {
    if (params.token) {
      loadNDAData(params.token as string)
    }
  }, [params.token])

  async function loadNDAData(token: string) {
    try {
      const response = await fetch(`/api/nda/${token}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      setNdaData(data)
      
      // Предзаполняем email если есть
      if (data.user.email) {
        setFormData(prev => ({
          ...prev,
          email: data.user.email,
          full_name: data.user.name
        }))
      }

      // Логирование просмотра пока отключено

    } catch (error: any) {
      console.error('Ошибка загрузки NDA:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSign() {
    if (!formData.agreed) {
      setError('Необходимо согласиться с условиями договора')
      return
    }

    if (!formData.full_name.trim()) {
      setError('Укажите полное имя')
      return
    }

    if (!formData.email.trim()) {
      setError('Укажите email')
      return
    }

    setSigning(true)
    setError('')

    try {
      const response = await fetch(`/api/nda/${params.token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          full_name: formData.full_name,
          passport_data: formData.passport,
          address: formData.address,
          signature_data: { agreed: formData.agreed, signed_at: new Date().toISOString() }
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      // Перенаправляем на страницу успеха
      router.push(`/nda/${params.token}/success`)

    } catch (error: any) {
      console.error('Ошибка подписания:', error)
      setError(error.message)
    } finally {
      setSigning(false)
    }
  }

  function formatNDAContent(content: string): string {
    if (!ndaData) return content

    const today = new Date().toLocaleDateString('uk-UA')
    
    return content
      .replace(/\[SIGNATURE_DATE\]/g, today)
      .replace(/\[FULL_NAME\]/g, formData.full_name || '[ПІБ]')
      .replace(/\[PASSPORT\]/g, formData.passport || '[ПАСПОРТНІ ДАНІ]')
      .replace(/\[ADDRESS\]/g, formData.address || '[АДРЕСА]')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse bg-white rounded-lg shadow p-8 max-w-2xl w-full">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !ndaData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Ошибка</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Закрыть
          </button>
        </div>
      </div>
    )
  }

  if (ndaData?.status === 'expired') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Ссылка истекла</h1>
          <p className="text-gray-600 mb-4">
            Срок действия ссылки для подписания NDA истек. 
            Обратитесь к HR отделу для получения новой ссылки.
          </p>
        </div>
      </div>
    )
  }

  if (ndaData?.status === 'signed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Уже подписано</h1>
          <p className="text-gray-600 mb-4">
            Договор NDA уже был подписан ранее.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex items-center">
            <DocumentTextIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Подписание договора NDA
              </h1>
              <p className="text-gray-600">
                {ndaData?.template.name} (версия {ndaData?.template.version})
              </p>
            </div>
          </div>
          
          {/* Countdown */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⏰ Ссылка действительна до: {ndaData ? new Date(ndaData.expires_at).toLocaleString('ru-RU') : ''}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* NDA Content */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Текст договора</h2>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {ndaData ? formatNDAContent(ndaData.template.content) : ''}
                </pre>
              </div>
            </div>
          </div>

          {/* Signing Form */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Данные для подписания</h2>
            </div>
            <div className="p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Полное имя *
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Иванов Иван Иванович"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Паспортные данные
                  </label>
                  <input
                    type="text"
                    value={formData.passport}
                    onChange={(e) => setFormData({...formData, passport: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="AA123456"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Адрес проживания
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="г. Киев, ул. Примерная, 123"
                  />
                </div>

                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="agreed"
                    checked={formData.agreed}
                    onChange={(e) => setFormData({...formData, agreed: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                  />
                  <label htmlFor="agreed" className="ml-2 block text-sm text-gray-900">
                    Я прочитал(а) и согласен(на) с условиями договора о неразглашении конфиденциальной информации
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleSign}
                  disabled={!formData.agreed || signing}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {signing ? 'Подписание...' : '✍️ Подписать договор'}
                </button>
              </form>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Информация о подписании</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>• Электронная подпись имеет ту же юридическую силу, что и собственноручная</div>
                  <div>• Ваш IP адрес и время подписания будут зафиксированы</div>
                  <div>• После подписания вы получите копию договора на email</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
