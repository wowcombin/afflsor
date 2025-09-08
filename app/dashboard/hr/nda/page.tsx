'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DataTable from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { 
  DocumentTextIcon,
  UserPlusIcon,
  EyeIcon,
  LinkIcon
} from '@heroicons/react/24/outline'

interface NDARecord {
  id: string
  full_name: string
  birth_date: string
  email: string
  document_number: string
  document_issued_by: string
  document_issued_date: string
  address: string
  signed_at: string
  status: string
  passport_photo_url?: string
  selfie_with_passport_url?: string
  signed_document_url?: string
  users?: {
    first_name: string
    last_name: string
    role: string
  }
}

interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  nda_signed: boolean
}

export default function HRNDAPage() {
  const router = useRouter()
  const { addToast } = useToast()
  
  const [ndaRecords, setNdaRecords] = useState<NDARecord[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [viewingNDA, setViewingNDA] = useState<NDARecord | null>(null)
  const [generatedLink, setGeneratedLink] = useState<string>('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Получаем NDA записи
      const ndaResponse = await fetch('/api/nda/agreements')
      const ndaData = await ndaResponse.json()
      
      if (ndaData.success) {
        setNdaRecords(ndaData.data)
      }

      // Получаем пользователей без NDA
      const usersResponse = await fetch('/api/users')
      const usersData = await usersResponse.json()
      
      if (usersData.success) {
        setUsers(usersData.data.filter((user: User) => !user.nda_signed))
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Не удалось загрузить данные' })
    } finally {
      setLoading(false)
    }
  }

  const generateNDALink = async () => {
    if (!selectedUser) return

    try {
      const user = users.find(u => u.id === selectedUser)
      if (!user) return

      const response = await fetch('/api/nda/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUser,
          template_id: '1', // ID базового шаблона
          full_name: `${user.first_name} ${user.last_name}`,
          email: user.email
        })
      })

      const result = await response.json()

      if (result.success) {
        setGeneratedLink(result.data.sign_url)
        addToast({ 
          type: 'success', 
          title: 'Успешно', 
          description: 'Ссылка для подписания NDA создана' 
        })
        await fetchData() // Обновляем данные
      } else {
        addToast({ type: 'error', title: 'Ошибка', description: result.error })
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Не удалось создать ссылку' })
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink)
    addToast({ type: 'success', title: 'Скопировано', description: 'Ссылка скопирована в буфер обмена' })
  }

  const viewNDADetails = (nda: NDARecord) => {
    setViewingNDA(nda)
    setShowViewModal(true)
  }

  const columns = [
    {
      key: 'full_name',
      label: 'ФИО',
      render: (nda: NDARecord) => (
        <div>
          <div className="font-medium text-gray-900">{nda.full_name}</div>
          <div className="text-sm text-gray-500">{nda.email}</div>
        </div>
      )
    },
    {
      key: 'birth_date',
      label: 'Дата рождения',
      render: (nda: NDARecord) => (
        <div className="text-sm">
          {nda.birth_date ? new Date(nda.birth_date).toLocaleDateString('ru-RU') : '-'}
        </div>
      )
    },
    {
      key: 'document_number',
      label: '№ документа',
      render: (nda: NDARecord) => (
        <div className="text-sm font-mono">{nda.document_number}</div>
      )
    },
    {
      key: 'document_issued_by',
      label: 'Адрес выдачи',
      render: (nda: NDARecord) => (
        <div className="text-sm max-w-xs truncate" title={nda.document_issued_by}>
          {nda.document_issued_by}
        </div>
      )
    },
    {
      key: 'document_issued_date',
      label: 'Дата выдачи',
      render: (nda: NDARecord) => (
        <div className="text-sm">
          {nda.document_issued_date ? new Date(nda.document_issued_date).toLocaleDateString('ru-RU') : '-'}
        </div>
      )
    },
    {
      key: 'address',
      label: 'Адрес проживания',
      render: (nda: NDARecord) => (
        <div className="text-sm max-w-xs truncate" title={nda.address}>
          {nda.address}
        </div>
      )
    },
    {
      key: 'signed_at',
      label: 'Когда подписан NDA',
      render: (nda: NDARecord) => (
        <div className="text-sm">
          {nda.signed_at ? new Date(nda.signed_at).toLocaleDateString('ru-RU') : 'Не подписан'}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Статус',
      render: (nda: NDARecord) => <StatusBadge status={nda.status} />
    }
  ]

  const actions = [
    {
      label: 'Просмотр',
      action: (nda: NDARecord) => viewNDADetails(nda),
      variant: 'primary' as const,
      icon: EyeIcon
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Управление NDA</h1>
          <p className="text-gray-600">Соглашения о неразглашении</p>
        </div>
        <div className="flex gap-2">
          <button 
            className="btn-secondary"
            onClick={() => router.push('/dashboard/hr')}
          >
            ← Назад
          </button>
          <button 
            className="btn-primary"
            onClick={() => setShowGenerateModal(true)}
          >
            <UserPlusIcon className="w-5 h-5 mr-2" />
            Создать NDA
          </button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Всего NDA</h3>
          <p className="text-2xl font-bold text-gray-900">{ndaRecords.length}</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Подписанных</h3>
          <p className="text-2xl font-bold text-success-600">
            {ndaRecords.filter(n => n.status === 'signed').length}
          </p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Ожидают подписания</h3>
          <p className="text-2xl font-bold text-warning-600">
            {ndaRecords.filter(n => n.status === 'pending').length}
          </p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Без NDA</h3>
          <p className="text-2xl font-bold text-danger-600">{users.length}</p>
        </div>
      </div>

      {/* Таблица NDA */}
      <div className="card">
        <DataTable
          data={ndaRecords}
          columns={columns}
          actions={actions}
          loading={loading}
          filtering={true}
        />
      </div>

      {/* Модальное окно создания NDA */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => {
          setShowGenerateModal(false)
          setSelectedUser('')
          setGeneratedLink('')
        }}
        title="Создать NDA для сотрудника"
      >
        <div className="space-y-4">
          {!generatedLink ? (
            <>
              <div>
                <label className="form-label">Выберите сотрудника</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="form-input w-full"
                >
                  <option value="">-- Выберите сотрудника --</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email}) - {user.role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={generateNDALink}
                  disabled={!selectedUser}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  <DocumentTextIcon className="w-5 h-5 mr-2" />
                  Создать ссылку
                </button>
                <button
                  onClick={() => {
                    setShowGenerateModal(false)
                    setSelectedUser('')
                  }}
                  className="btn-secondary flex-1"
                >
                  Отмена
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center">
                <div className="text-green-600 text-lg font-semibold mb-4">
                  ✅ Ссылка для подписания создана!
                </div>
                <div className="bg-gray-100 p-4 rounded-lg mb-4">
                  <p className="text-sm text-gray-600 mb-2">Ссылка для подписания:</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={generatedLink}
                      readOnly
                      className="form-input flex-1 text-sm"
                    />
                    <button
                      onClick={copyLink}
                      className="btn-secondary p-2"
                      title="Копировать ссылку"
                    >
                      <LinkIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Отправьте эту ссылку сотруднику для подписания NDA
                </p>
              </div>
              
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => {
                    setShowGenerateModal(false)
                    setSelectedUser('')
                    setGeneratedLink('')
                  }}
                  className="btn-primary"
                >
                  Закрыть
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Модальное окно просмотра NDA */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false)
          setViewingNDA(null)
        }}
        title="Детали NDA"
        size="xl"
      >
        {viewingNDA && (
          <div className="space-y-6">
            {/* Основная информация */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">ФИО</label>
                <p className="text-gray-900">{viewingNDA.full_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-gray-900">{viewingNDA.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Дата рождения</label>
                <p className="text-gray-900">
                  {viewingNDA.birth_date ? new Date(viewingNDA.birth_date).toLocaleDateString('ru-RU') : '-'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">№ документа</label>
                <p className="text-gray-900 font-mono">{viewingNDA.document_number}</p>
              </div>
            </div>

            {/* Документы */}
            {(viewingNDA.passport_photo_url || viewingNDA.selfie_with_passport_url) && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Документы</h4>
                <div className="grid grid-cols-2 gap-4">
                  {viewingNDA.passport_photo_url && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Фото документа</label>
                      <img 
                        src={viewingNDA.passport_photo_url} 
                        alt="Документ" 
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                    </div>
                  )}
                  {viewingNDA.selfie_with_passport_url && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Селфи с документом</label>
                      <img 
                        src={viewingNDA.selfie_with_passport_url} 
                        alt="Селфи" 
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Подписанный документ */}
            {viewingNDA.signed_document_url && (
              <div>
                <label className="text-sm font-medium text-gray-500">Подписанный NDA</label>
                <a 
                  href={viewingNDA.signed_document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary inline-flex items-center mt-2"
                >
                  <DocumentTextIcon className="w-5 h-5 mr-2" />
                  Скачать PDF
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
