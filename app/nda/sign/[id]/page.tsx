'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'
import SignaturePad from '@/components/ui/SignaturePad'

interface NDAData {
  id: string
  full_name: string
  email: string
  status: string
  template: {
    name: string
    content: string
  }
}

export default function SignNDAPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { addToast } = useToast()

  const [ndaData, setNdaData] = useState<NDAData | null>(null)
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    email: '',
    documentNumber: '',
    issuanceAddress: '',
    issuanceDate: '',
    residentialAddress: '',
    agreed: false
  })
  const [files, setFiles] = useState({
    passportPhoto: null as File | null,
    selfieWithPassport: null as File | null
  })
  const [signature, setSignature] = useState<string | null>(null)

  const agreementId = params.id as string
  const token = searchParams.get('token')

  useEffect(() => {
    if (agreementId && token) {
      fetchNDAData()
    }
  }, [agreementId, token])

  const fetchNDAData = async () => {
    try {
      const response = await fetch(`/api/nda/sign/${agreementId}?token=${token}`)
      const data = await response.json()

      if (data.success) {
        setNdaData(data.data)
        setFormData(prev => ({
          ...prev,
          fullName: data.data.full_name || '',
          email: data.data.email || ''
        }))
      } else {
        addToast({ type: 'error', title: 'Ошибка', description: data.error })
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Не удалось загрузить данные NDA' })
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (field: keyof typeof files, file: File | null) => {
    setFiles(prev => ({ ...prev, [field]: file }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.agreed) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Необходимо согласиться с условиями NDA' })
      return
    }

    if (!signature) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Необходимо поставить электронную подпись' })
      return
    }

    if (!files.passportPhoto || !files.selfieWithPassport) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Необходимо загрузить фото документа и селфи' })
      return
    }

    setSigning(true)

    try {
      const formDataToSend = new FormData()

      // Добавляем ID соглашения
      formDataToSend.append('agreementId', agreementId)

      // Добавляем данные формы
      Object.entries(formData).forEach(([key, value]) => {
        if (key !== 'agreed') {
          formDataToSend.append(key, value.toString())
        }
      })

      // Добавляем подпись
      if (signature) {
        formDataToSend.append('signature', signature)
      }

      // Добавляем файлы
      if (files.passportPhoto) {
        formDataToSend.append('passportPhoto', files.passportPhoto)
      }
      if (files.selfieWithPassport) {
        formDataToSend.append('selfieWithPassport', files.selfieWithPassport)
      }

      const response = await fetch(`/api/nda/test-sign`, {
        method: 'POST',
        body: formDataToSend
      })

      const result = await response.json()

      if (result.success) {
        addToast({
          type: 'success',
          title: 'Успешно',
          description: 'NDA успешно подписано!'
        })
        // Перенаправляем на страницу успеха
        window.location.href = '/nda/success'
      } else {
        addToast({ type: 'error', title: 'Ошибка', description: result.error })
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Не удалось подписать NDA' })
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-lg">Загрузка NDA...</div>
      </div>
    )
  }

  if (!ndaData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">NDA не найдено</h1>
          <p className="text-gray-600">Ссылка недействительна или истекла</p>
        </div>
      </div>
    )
  }

  if (ndaData.status !== 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-blue-600 mb-4">NDA уже подписано</h1>
          <p className="text-gray-600">Это соглашение уже было подписано</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center mb-8">
            Подписание соглашения о неразглашении
          </h1>

          {/* Контент NDA */}
          <div className="mb-8 p-6 border rounded-lg bg-gray-50 max-h-96 overflow-y-auto">
            <div className="whitespace-pre-line text-sm leading-relaxed">
              {ndaData.template.content
                .replace(/\[FULL_NAME\]/g, formData.fullName || '[ИМЯ]')
                .replace(/\[SIGNATURE_DATE\]/g, new Date().toLocaleDateString('uk-UA'))
                .replace(/\[ADDRESS\]/g, formData.residentialAddress || '[АДРЕС]')
                .replace(/\[PASSPORT\]/g, formData.documentNumber || '[ПАСПОРТ]')
              }
            </div>

            {/* Подписи сторон */}
            <div className="mt-8 pt-6 border-t border-gray-300">
              <div className="grid grid-cols-2 gap-8">
                {/* Подпись директора */}
                <div className="text-center">
                  <div className="mb-4">
                    <div className="text-sm font-medium mb-2">Сторона – Роботодавець</div>
                    <div className="text-sm">Андрій Головач</div>
                    <div className="text-xs text-gray-600 mt-1">Директор</div>
                  </div>

                  {/* Подпись директора (изображение или текст) */}
                  <div className="h-16 border-b border-gray-400 mb-2 flex items-end justify-center">
                    <svg 
                      width="120" 
                      height="50" 
                      viewBox="0 0 120 50" 
                      className="mb-1"
                    >
                      <path 
                        d="M10 35 Q15 10 25 15 Q35 20 45 12 Q55 5 65 18 Q75 30 85 15 Q95 8 105 25 Q110 35 115 20" 
                        stroke="#1e3a8a" 
                        strokeWidth="2" 
                        fill="none" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                      <path 
                        d="M20 25 L25 35 M30 20 L35 40 M50 15 L55 35 M70 10 L75 30 M90 20 L95 40" 
                        stroke="#1e3a8a" 
                        strokeWidth="1.5" 
                        strokeLinecap="round"
                      />
                      <ellipse 
                        cx="60" 
                        cy="25" 
                        rx="50" 
                        ry="15" 
                        stroke="#1e3a8a" 
                        strokeWidth="1.5" 
                        fill="none"
                      />
                    </svg>
                  </div>
                  <div className="text-xs text-gray-500">(підпис)</div>
                </div>

                {/* Место для подписи сотрудника */}
                <div className="text-center">
                  <div className="mb-4">
                    <div className="text-sm font-medium mb-2">Сторона – Працівник</div>
                    <div className="text-sm">{formData.fullName || '[ИМЯ]'}</div>
                    <div className="text-xs text-gray-600 mt-1">Співробітник</div>
                  </div>

                  {/* Место для подписи сотрудника */}
                  <div className="h-16 border-b border-gray-400 mb-2 flex items-end justify-center">
                    {signature ? (
                      <img src={signature} alt="Подпись" className="max-h-12 max-w-full" />
                    ) : (
                      <div className="text-xs text-gray-400">Место для подписи</div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">(підпис)</div>
                </div>
              </div>

              <div className="text-center mt-4 text-xs text-gray-600">
                Дата підписання: {new Date().toLocaleDateString('uk-UA')}
              </div>
            </div>
          </div>

          {/* Форма подписания */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">Полное имя *</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label className="form-label">Дата рождения *</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label className="form-label">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label className="form-label">Номер документа *</label>
                <input
                  type="text"
                  value={formData.documentNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, documentNumber: e.target.value }))}
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label className="form-label">Адрес выдачи *</label>
                <input
                  type="text"
                  value={formData.issuanceAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, issuanceAddress: e.target.value }))}
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label className="form-label">Дата выдачи *</label>
                <input
                  type="date"
                  value={formData.issuanceDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, issuanceDate: e.target.value }))}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div>
              <label className="form-label">Адрес проживания *</label>
              <textarea
                value={formData.residentialAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, residentialAddress: e.target.value }))}
                className="form-input"
                rows={3}
                required
              />
            </div>

            {/* Электронная подпись */}
            <div className="mb-6">
              <SignaturePad onSignatureChange={setSignature} />
            </div>

            {/* Загрузка файлов */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">Фото документа *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange('passportPhoto', e.target.files?.[0] || null)}
                  className="form-input"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Четкое фото документа (паспорт, ID карта)
                </p>
              </div>

              <div>
                <label className="form-label">Селфи с документом *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange('selfieWithPassport', e.target.files?.[0] || null)}
                  className="form-input"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Фото себя с документом в руках
                </p>
              </div>
            </div>

            {/* Согласие */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="agreed"
                checked={formData.agreed}
                onChange={(e) => setFormData(prev => ({ ...prev, agreed: e.target.checked }))}
                className="mt-1"
                required
              />
              <label htmlFor="agreed" className="text-sm text-gray-700">
                Я прочитал(а) и согласен(на) с условиями соглашения о неразглашении.
                Понимаю свои обязательства и ответственность за нарушение условий договора.
              </label>
            </div>

            <div className="flex justify-center pt-6">
              <button
                type="submit"
                disabled={signing || !formData.agreed}
                className="btn-primary px-8 py-3 text-lg disabled:opacity-50"
              >
                {signing ? 'Подписание...' : 'Подписать NDA'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
