'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface CasinoManual {
  id: string
  casino_id: string
  version: number
  content: string
  created_by: string
  is_published: boolean
  created_at: string
  casinos: {
    name: string
    url: string
    status: string
  }
  users: {
    first_name: string
    last_name: string
  }
}

interface Casino {
  id: string
  name: string
  url: string
  status: string
}

export default function TesterManualsPage() {
  const [manuals, setManuals] = useState<CasinoManual[]>([])
  const [casinos, setCasinos] = useState<Casino[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedCasino, setSelectedCasino] = useState('')
  const [manualContent, setManualContent] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      // Загружаем мануалы
      const manualsResponse = await fetch('/api/casino-manuals')
      if (manualsResponse.ok) {
        const manualsData = await manualsResponse.json()
        setManuals(manualsData.manuals || [])
      }

      // Загружаем казино для создания новых мануалов
      const casinosResponse = await fetch('/api/casinos?status=approved')
      if (casinosResponse.ok) {
        const casinosData = await casinosResponse.json()
        setCasinos(casinosData.casinos || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function createManual() {
    if (!selectedCasino || !manualContent.trim()) {
      alert('Выберите казино и введите содержимое мануала')
      return
    }

    try {
      const response = await fetch('/api/casino-manuals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          casino_id: selectedCasino,
          content: manualContent
        })
      })

      const data = await response.json()

      if (response.ok) {
        setShowCreateForm(false)
        setSelectedCasino('')
        setManualContent('')
        loadData()
        alert('Мануал успешно создан!')
      } else {
        alert('Ошибка создания мануала: ' + data.error)
      }
    } catch (error) {
      console.error('Error creating manual:', error)
      alert('Ошибка создания мануала')
    }
  }

  async function togglePublish(manualId: string, isPublished: boolean) {
    try {
      const response = await fetch(`/api/casino-manuals/${manualId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_published: !isPublished
        })
      })

      if (response.ok) {
        loadData()
        alert(isPublished ? 'Мануал снят с публикации' : 'Мануал опубликован')
      } else {
        const data = await response.json()
        alert('Ошибка: ' + data.error)
      }
    } catch (error) {
      console.error('Error toggling publish:', error)
      alert('Ошибка изменения статуса публикации')
    }
  }

  if (loading) return <div className="p-8">Загрузка...</div>

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Управление мануалами</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Создать мануал
        </button>
      </div>

      {/* Форма создания мануала */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Создать новый мануал</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Казино</label>
                <select
                  value={selectedCasino}
                  onChange={(e) => setSelectedCasino(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Выберите казино</option>
                  {casinos.map(casino => (
                    <option key={casino.id} value={casino.id}>
                      {casino.name} - {casino.url}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Содержимое мануала</label>
                <textarea
                  value={manualContent}
                  onChange={(e) => setManualContent(e.target.value)}
                  className="w-full p-3 border rounded h-96"
                  placeholder="Введите подробный мануал для работы с казино..."
                  required
                />
                <div className="text-sm text-gray-500 mt-1">
                  Поддерживается Markdown форматирование
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setShowCreateForm(false)}
                className="flex-1 bg-gray-400 text-white py-2 rounded hover:bg-gray-500"
              >
                Отмена
              </button>
              <button
                onClick={createManual}
                className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                Создать мануал
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Список мануалов */}
      <div className="bg-white rounded-lg shadow-md">
        {manuals.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>Мануалы не найдены</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="text-blue-600 hover:underline mt-2"
            >
              Создать первый мануал
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Казино
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Версия
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Автор
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Создан
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {manuals.map(manual => (
                  <tr key={manual.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{manual.casinos.name}</div>
                        <div className="text-sm text-gray-500">
                          <a href={manual.casinos.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {manual.casinos.url}
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        v{manual.version}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {manual.users.first_name} {manual.users.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        manual.is_published 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {manual.is_published ? 'Опубликован' : 'Черновик'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(manual.created_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <Link
                        href={`/tester/manuals/${manual.id}`}
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 inline-block"
                      >
                        Редактировать
                      </Link>
                      <button
                        onClick={() => togglePublish(manual.id, manual.is_published)}
                        className={`px-3 py-1 rounded text-white ${
                          manual.is_published
                            ? 'bg-yellow-600 hover:bg-yellow-700'
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        {manual.is_published ? 'Снять' : 'Опубликовать'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Статистика */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-sm text-gray-500">Всего мануалов</div>
          <div className="text-2xl font-bold text-blue-600">{manuals.length}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-sm text-gray-500">Опубликовано</div>
          <div className="text-2xl font-bold text-green-600">
            {manuals.filter(m => m.is_published).length}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-sm text-gray-500">Черновиков</div>
          <div className="text-2xl font-bold text-yellow-600">
            {manuals.filter(m => !m.is_published).length}
          </div>
        </div>
      </div>
    </div>
  )
}
