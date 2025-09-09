'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'

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
    full_name: '',
    birth_date: '',
    document_number: '',
    document_type: 'passport',
    document_issued_by: '',
    document_issued_date: '',
    address: '',
    agreed: false
  })
  const [files, setFiles] = useState({
    passport_photo: null as File | null,
    selfie_with_passport: null as File | null
  })

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
          full_name: data.data.full_name || '',
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

    if (!files.passport_photo || !files.selfie_with_passport) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Необходимо загрузить все документы' })
      return
    }

    setSigning(true)

    try {
      const formDataToSend = new FormData()
      
      // Добавляем данные формы
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value.toString())
      })
      
      // Добавляем файлы
      if (files.passport_photo) {
        formDataToSend.append('passport_photo', files.passport_photo)
      }
      if (files.selfie_with_passport) {
        formDataToSend.append('selfie_with_passport', files.selfie_with_passport)
      }
      
      formDataToSend.append('token', token || '')

      const response = await fetch(`/api/nda/sign/${agreementId}`, {
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
            <div 
              dangerouslySetInnerHTML={{ 
                __html: ndaData.template.content
                  .replace(/\[FULL_NAME\]/g, formData.full_name)
                  .replace(/\[SIGNATURE_DATE\]/g, new Date().toLocaleDateString('uk-UA'))
                  .replace(/\[ADDRESS\]/g, formData.address)
                  .replace(/\[PASSPORT\]/g, formData.document_number)
              }} 
            />
          </div>

          {/* Форма подписания */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">Полное имя *</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="form-input"
                  required
                />
              </div>
              
              <div>
                <label className="form-label">Дата рождения *</label>
                <input
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label className="form-label">Тип документа *</label>
                <select
                  value={formData.document_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, document_type: e.target.value }))}
                  className="form-input"
                >
                  <option value="passport">Паспорт</option>
                  <option value="id_card">ID карта</option>
                  <option value="driver_license">Водительские права</option>
                </select>
              </div>

              <div>
                <label className="form-label">Номер документа *</label>
                <input
                  type="text"
                  value={formData.document_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, document_number: e.target.value }))}
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label className="form-label">Кем выдан *</label>
                <input
                  type="text"
                  value={formData.document_issued_by}
                  onChange={(e) => setFormData(prev => ({ ...prev, document_issued_by: e.target.value }))}
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label className="form-label">Дата выдачи *</label>
                <input
                  type="date"
                  value={formData.document_issued_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, document_issued_date: e.target.value }))}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div>
              <label className="form-label">Адрес проживания *</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="form-input"
                rows={3}
                required
              />
            </div>

            {/* Загрузка файлов */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">Фото документа *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange('passport_photo', e.target.files?.[0] || null)}
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
                  onChange={(e) => handleFileChange('selfie_with_passport', e.target.files?.[0] || null)}
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
