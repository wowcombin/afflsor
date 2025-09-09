'use client'

import { useState, useEffect } from 'react'
import DataTable from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import {
  EyeIcon,
  DocumentTextIcon,
  TrashIcon
} from '@heroicons/react/24/outline'

interface NDARecord {
  id: string
  full_name: string
  date_of_birth: string
  email: string
  document_number: string
  issuance_address: string
  issuance_date: string
  residential_address: string
  signed_at: string
  status: string
  created_at: string
  nda_files?: Array<{
    file_type: string
    file_path: string
    original_filename: string
  }>
}

export default function NDAgreementsPage() {
  const { addToast } = useToast()

  const [ndaRecords, setNdaRecords] = useState<NDARecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewingNDA, setViewingNDA] = useState<NDARecord | null>(null)

  useEffect(() => {
    fetchAgreements()
  }, [])

  const fetchAgreements = async () => {
    try {
      const response = await fetch('/api/nda/agreements')
      const data = await response.json()

      if (data.success) {
        setNdaRecords(data.data)
      } else {
        addToast({ type: 'error', title: 'Ошибка', description: data.error })
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Ошибка', description: 'Не удалось загрузить соглашения' })
    } finally {
      setLoading(false)
    }
  }

  const viewNDADetails = (nda: NDARecord) => {
    setViewingNDA(nda)
    setShowViewModal(true)
  }

  const deleteNDA = async (nda: NDARecord) => {
    const statusText = nda.status === 'signed' ? 'подписанное' : 'неподписанное'
    if (!confirm(`Вы уверены, что хотите удалить ${statusText} NDA соглашение для ${nda.full_name}?\n\nЭто действие удалит все связанные файлы и нельзя будет отменить.`)) {
      return
    }

    try {
      const response = await fetch(`/api/nda/agreements?id=${nda.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        addToast({
          type: 'success',
          title: 'Успех',
          description: 'NDA соглашение удалено'
        })
        fetchAgreements() // Обновляем список
      } else {
        addToast({
          type: 'error',
          title: 'Ошибка',
          description: data.error || 'Не удалось удалить NDA'
        })
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Ошибка',
        description: 'Произошла ошибка при удалении NDA'
      })
    }
  }

  const getFileUrl = (filePath: string) => {
    // Здесь будет логика получения публичного URL файла из Supabase Storage
    return `/api/nda/files/${filePath}`
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
      key: 'date_of_birth',
      label: 'Дата рождения',
      render: (nda: NDARecord) => (
        <div className="text-sm">
          {nda.date_of_birth ? new Date(nda.date_of_birth).toLocaleDateString('ru-RU') : '-'}
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
      key: 'issuance_address',
      label: 'Адрес выдачи',
      render: (nda: NDARecord) => (
        <div className="text-sm max-w-xs truncate" title={nda.issuance_address}>
          {nda.issuance_address}
        </div>
      )
    },
    {
      key: 'issuance_date',
      label: 'Дата выдачи',
      render: (nda: NDARecord) => (
        <div className="text-sm">
          {nda.issuance_date ? new Date(nda.issuance_date).toLocaleDateString('ru-RU') : '-'}
        </div>
      )
    },
    {
      key: 'residential_address',
      label: 'Адрес проживания',
      render: (nda: NDARecord) => (
        <div className="text-sm max-w-xs truncate" title={nda.residential_address}>
          {nda.residential_address}
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
      label: '',
      action: (nda: NDARecord) => viewNDADetails(nda),
      variant: 'ghost' as const,
      icon: EyeIcon,
      tooltip: 'Просмотр'
    },
    {
      label: '',
      action: (nda: NDARecord) => deleteNDA(nda),
      variant: 'ghost' as const,
      icon: TrashIcon,
      tooltip: 'Удалить'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Всего соглашений</h3>
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
          <h3 className="text-sm font-medium text-gray-500">Отклоненных</h3>
          <p className="text-2xl font-bold text-danger-600">
            {ndaRecords.filter(n => n.status === 'rejected').length}
          </p>
        </div>
      </div>

      {/* Таблица соглашений */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">Все NDA соглашения</h3>
        </div>
        <DataTable
          data={ndaRecords}
          columns={columns}
          actions={actions}
          loading={loading}
          filtering={true}
        />
      </div>

      {/* Модальное окно просмотра NDA */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false)
          setViewingNDA(null)
        }}
        title="Детали NDA соглашения"
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
                  {viewingNDA.date_of_birth ? new Date(viewingNDA.date_of_birth).toLocaleDateString('ru-RU') : '-'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">№ документа</label>
                <p className="text-gray-900 font-mono">{viewingNDA.document_number}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Адрес выдачи</label>
                <p className="text-gray-900">{viewingNDA.issuance_address}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Дата выдачи</label>
                <p className="text-gray-900">
                  {viewingNDA.issuance_date ? new Date(viewingNDA.issuance_date).toLocaleDateString('ru-RU') : '-'}
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Адрес проживания</label>
              <p className="text-gray-900">{viewingNDA.residential_address}</p>
            </div>

            {/* Статус и даты */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Статус</label>
                <div className="mt-1">
                  <StatusBadge status={viewingNDA.status} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Дата подписания</label>
                <p className="text-gray-900">
                  {viewingNDA.signed_at ? new Date(viewingNDA.signed_at).toLocaleDateString('ru-RU') : 'Не подписан'}
                </p>
              </div>
            </div>

            {/* Файлы */}
            {viewingNDA.nda_files && viewingNDA.nda_files.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Загруженные файлы</h4>
                <div className="space-y-3">
                  {viewingNDA.nda_files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center">
                        <DocumentTextIcon className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {file.file_type === 'signature' && 'Электронная подпись'}
                            {file.file_type === 'passport_photo' && 'Фото документа'}
                            {file.file_type === 'selfie_with_passport' && 'Селфи с документом'}
                          </p>
                          <p className="text-sm text-gray-500">{file.original_filename}</p>
                        </div>
                      </div>
                      <a
                        href={getFileUrl(file.file_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary text-sm"
                      >
                        Скачать
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
