'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import { 
  DocumentTextIcon,
  LinkIcon,
  UserIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  nda_signed: boolean
}

interface Template {
  id: string
  name: string
  description: string
  is_active: boolean
}

export default function GenerateNDAPage() {
  const { addToast } = useToast()
  
  const [users, setUsers] = useState<User[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    full_name: ''
  })
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [generatedLinks, setGeneratedLinks] = useState<Array<{
    email: string
    full_name: string
    link: string
    created_at: string
  }>>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Получаем пользователей без NDA для статистики
      const usersResponse = await fetch('/api/users')
      const usersData = await usersResponse.json()
      
      if (usersData.success) {
        setUsers(usersData.data.filter((user: User) => !user.nda_signed))
      }

      // Получаем шаблоны
      const templatesResponse = await fetch('/api/nda/templates')
      const templatesData = await templatesResponse.json()
      
      if (templatesData.success) {
        setTemplates(templatesData.data.filter((t: Template) => t.is_active))
        // Выбираем первый активный шаблон по умолчанию
        if (templatesData.data.length > 0) {
          setSelectedTemplate(templatesData.data[0].id)
        }
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Не удалось загрузить данные' })
    } finally {
      setLoading(false)
    }
  }

  const generateNDALink = async () => {
    if (!formData.email || !formData.full_name || !selectedTemplate) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Заполните все поля и выберите шаблон' })
      return
    }

    // Проверяем валидность email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Введите корректный email адрес' })
      return
    }

    setGenerating(true)

    try {
      const response = await fetch('/api/nda/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: null, // Для будущих сотрудников
          template_id: selectedTemplate,
          full_name: formData.full_name,
          email: formData.email
        })
      })

      const result = await response.json()

      if (result.success) {
        setGeneratedLinks(prev => [{
          email: formData.email,
          full_name: formData.full_name,
          link: result.data.sign_url,
          created_at: new Date().toISOString()
        }, ...prev])
        
        addToast({ 
          type: 'success', 
          title: 'Успешно', 
          description: 'Ссылка для подписания NDA создана' 
        })
        
        // Сбрасываем форму
        setFormData({ email: '', full_name: '' })
        
        // Обновляем статистику
        await fetchData()
      } else {
        addToast({ type: 'error', title: 'Ошибка', description: result.error })
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Не удалось создать ссылку' })
    } finally {
      setGenerating(false)
    }
  }

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link)
    addToast({ type: 'success', title: 'Скопировано', description: 'Ссылка скопирована в буфер обмена' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-lg text-gray-500">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Текущих сотрудников без NDA</h3>
          <p className="text-2xl font-bold text-warning-600">{users.length}</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Активных шаблонов</h3>
          <p className="text-2xl font-bold text-primary-600">{templates.length}</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Создано ссылок сегодня</h3>
          <p className="text-2xl font-bold text-success-600">{generatedLinks.length}</p>
        </div>
      </div>

      {/* Форма создания NDA */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">Создать NDA для сотрудника</h3>
          <p className="text-sm text-gray-500">Введите данные сотрудника и выберите шаблон для генерации ссылки подписания</p>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="form-label">Email сотрудника *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="form-input w-full"
                placeholder="example@company.com"
                disabled={generating}
              />
              <p className="text-sm text-gray-500 mt-1">
                Email для отправки ссылки на подписание
              </p>
            </div>

            <div>
              <label className="form-label">Полное имя *</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                className="form-input w-full"
                placeholder="Иван Иванов"
                disabled={generating}
              />
              <p className="text-sm text-gray-500 mt-1">
                ФИО сотрудника для договора
              </p>
            </div>

            <div>
              <label className="form-label">Шаблон NDA *</label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="form-input w-full"
                disabled={generating}
              >
                <option value="">-- Выберите шаблон --</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              {templates.length === 0 && (
                <p className="text-sm text-red-500 mt-1">
                  Нет активных шаблонов
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-6">
            <button
              onClick={generateNDALink}
              disabled={!formData.email || !formData.full_name || !selectedTemplate || generating}
              className="btn-primary disabled:opacity-50"
            >
              <DocumentTextIcon className="w-5 h-5 mr-2" />
              {generating ? 'Создание...' : 'Создать ссылку'}
            </button>
          </div>
        </div>
      </div>

      {/* Созданные ссылки */}
      {generatedLinks.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Созданные ссылки</h3>
            <p className="text-sm text-gray-500">Отправьте эти ссылки сотрудникам для подписания NDA</p>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {generatedLinks.map((item, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <UserIcon className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.full_name}
                        </p>
                        <p className="text-sm text-gray-500">{item.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <CheckCircleIcon className="w-4 h-4 mr-1" />
                      Создано {new Date(item.created_at).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.link}
                        readOnly
                        className="form-input flex-1 text-sm bg-white"
                      />
                      <button
                        onClick={() => copyLink(item.link)}
                        className="btn-secondary p-2"
                        title="Копировать ссылку"
                      >
                        <LinkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Инструкции */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-medium text-blue-900 mb-3">📋 Инструкции по использованию</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <div>• Введите email и полное имя будущего сотрудника</div>
          <div>• Выберите подходящий шаблон соглашения</div>
          <div>• Скопируйте созданную ссылку и отправьте кандидату</div>
          <div>• Кандидат заполнит форму и загрузит необходимые документы</div>
          <div>• После подписания вы получите уведомление и сможете просмотреть детали в разделе "Соглашения"</div>
          <div>• Система подходит как для текущих сотрудников, так и для кандидатов на трудоустройство</div>
        </div>
      </div>
    </div>
  )
}
