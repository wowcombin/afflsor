'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import DataTable, { Column } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import ManualEditor from '@/components/ui/ManualEditor'
import { useToast } from '@/components/ui/Toast'
import { 
  DocumentTextIcon, 
  PlusIcon, 
  PencilIcon, 
  EyeIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface Casino {
  id: string
  name: string
  url: string
  status: string
}

interface Manual {
  id: string
  casino_id: string
  version: number
  sections: Array<{
    id: string
    title: string
    content: string
    order: number
  }>
  is_published: boolean
  created_by: string
  created_at: string
  updated_at: string
  casinos: {
    name: string
    status: string
  }
  users: {
    first_name: string
    last_name: string
  }
}

export default function TesterManualsNewPage() {
  const { addToast } = useToast()
  const [manuals, setManuals] = useState<Manual[]>([])
  const [casinos, setCasinos] = useState<Casino[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [editingManual, setEditingManual] = useState<Manual | null>(null)
  const [selectedCasinoId, setSelectedCasinoId] = useState('')
  const [stats, setStats] = useState({
    totalManuals: 0,
    publishedManuals: 0,
    draftManuals: 0,
    casinosWithoutManuals: 0
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadData()
    } else {
      setLoading(false)
    }
  }, [])

  async function loadData() {
    try {
      const supabase = createClient()
      
      // Загружаем мануалы
      const { data: manualsData, error: manualsError } = await supabase
        .from('casino_manuals')
        .select(`
          *,
          casinos!inner(name, status),
          users!inner(first_name, last_name)
        `)
        .order('updated_at', { ascending: false })

      if (manualsError) throw manualsError

      // Загружаем казино
      const { data: casinosData, error: casinosError } = await supabase
        .from('casinos')
        .select('id, name, url, status')
        .eq('status', 'active')
        .order('name')

      if (casinosError) throw casinosError

      setManuals(manualsData || [])
      setCasinos(casinosData || [])
      
      // Рассчитываем статистику
      const totalManuals = manualsData?.length || 0
      const publishedManuals = manualsData?.filter(m => m.is_published).length || 0
      const draftManuals = totalManuals - publishedManuals
      const casinosWithManuals = new Set(manualsData?.map(m => m.casino_id)).size
      const casinosWithoutManuals = (casinosData?.length || 0) - casinosWithManuals

      setStats({
        totalManuals,
        publishedManuals,
        draftManuals,
        casinosWithoutManuals
      })

    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
      addToast({ type: 'error', title: 'Ошибка загрузки мануалов' })
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateManual() {
    if (!selectedCasinoId) {
      addToast({ type: 'warning', title: 'Выберите казино для создания мануала' })
      return
    }
    
    setEditingManual(null)
    setShowEditor(true)
  }

  async function handleEditManual(manual: Manual) {
    setEditingManual(manual)
    setSelectedCasinoId(manual.casino_id)
    setShowEditor(true)
  }

  async function handleSaveManual(manualData: any) {
    try {
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user?.id)
        .single()

      if (!userData) throw new Error('Пользователь не найден')

      const saveData = {
        casino_id: selectedCasinoId,
        version: manualData.version,
        content: JSON.stringify(manualData.sections), // Сохраняем разделы как JSON
        is_published: manualData.is_published,
        created_by: userData.id,
        updated_at: new Date().toISOString()
      }

      if (editingManual) {
        // Обновляем существующий мануал
        const { error } = await supabase
          .from('casino_manuals')
          .update(saveData)
          .eq('id', editingManual.id)
      } else {
        // Создаем новый мануал
        const { error } = await supabase
          .from('casino_manuals')
          .insert(saveData)
      }

      addToast({ 
        type: 'success', 
        title: editingManual ? 'Мануал обновлен' : 'Мануал создан' 
      })
      
      setShowEditor(false)
      setEditingManual(null)
      await loadData()
    } catch (error: any) {
      console.error('Ошибка сохранения мануала:', error)
      addToast({ type: 'error', title: 'Ошибка сохранения мануала' })
      throw error
    }
  }

  const columns: Column[] = [
    {
      key: 'casino',
      label: 'Казино',
      sortable: true,
      render: (manual: Manual) => (
        <div>
          <div className="font-medium text-gray-900">
            {manual.casinos?.name || 'Неизвестно'}
          </div>
          <div className="text-sm text-gray-500">
            Версия {manual.version}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Статус',
      sortable: true,
      render: (manual: Manual) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          manual.is_published 
            ? 'bg-green-100 text-green-800' 
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {manual.is_published ? '✅ Опубликован' : '📝 Черновик'}
        </span>
      )
    },
    {
      key: 'author',
      label: 'Автор',
      render: (manual: Manual) => (
        <div className="text-sm text-gray-600">
          {manual.users?.first_name} {manual.users?.last_name}
        </div>
      )
    },
    {
      key: 'updated_at',
      label: 'Обновлен',
      sortable: true,
      render: (manual: Manual) => (
        <div className="text-sm text-gray-500">
          {new Date(manual.updated_at).toLocaleDateString('ru-RU')}
        </div>
      )
    }
  ]

  const actions = [
    {
      label: 'Редактировать',
      action: (manual: Manual) => handleEditManual(manual),
      variant: 'primary' as const
    },
    {
      label: 'Просмотр',
      action: (manual: Manual) => {
        // TODO: Открыть просмотр мануала
        console.log('View manual:', manual.id)
      },
      variant: 'secondary' as const
    }
  ]

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (showEditor) {
    return (
      <div className="p-8">
        <ManualEditor
          manual={editingManual}
          casinoId={selectedCasinoId}
          onSave={handleSaveManual}
          onCancel={() => {
            setShowEditor(false)
            setEditingManual(null)
          }}
        />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Мануалы казино</h1>
        <div className="flex space-x-3">
          <select
            value={selectedCasinoId}
            onChange={(e) => setSelectedCasinoId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Выберите казино</option>
            {casinos.map(casino => (
              <option key={casino.id} value={casino.id}>
                {casino.name}
              </option>
            ))}
          </select>
          
          <button
            onClick={handleCreateManual}
            disabled={!selectedCasinoId}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Создать мануал
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Всего мануалов"
          value={stats.totalManuals.toString()}
          icon={<DocumentTextIcon className="h-6 w-6" />}
        />
        <KPICard
          title="Опубликовано"
          value={stats.publishedManuals.toString()}
          color="green"
          icon={<span className="text-xl">✅</span>}
        />
        <KPICard
          title="Черновики"
          value={stats.draftManuals.toString()}
          color="yellow"
          icon={<span className="text-xl">📝</span>}
        />
        <KPICard
          title="Без мануалов"
          value={stats.casinosWithoutManuals.toString()}
          color="red"
          icon={<span className="text-xl">❌</span>}
        />
      </div>

      {/* Manuals Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            Список мануалов ({manuals.length})
          </h3>
        </div>
        
        <DataTable
          data={manuals}
          columns={columns}
          actions={actions}
          pagination={{ pageSize: 20 }}
          sorting={{ key: 'updated_at', direction: 'desc' }}
          export={true}
        />
      </div>
    </div>
  )
}
