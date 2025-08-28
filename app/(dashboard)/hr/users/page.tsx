'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import DataTable, { Column } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import StatusBadge from '@/components/ui/StatusBadge'
import RoleBadge from '@/components/ui/RoleBadge'
import Alert from '@/components/ui/Alert'
import { useToast } from '@/components/ui/Toast'
import { PlusIcon, PencilIcon, TrashIcon, UserIcon } from '@heroicons/react/24/outline'

interface User {
  id: string
  email: string
  role: 'junior' | 'manager' | 'hr' | 'cfo' | 'admin' | 'tester'
  status: 'active' | 'inactive' | 'terminated'
  first_name?: string
  last_name?: string
  telegram_username?: string
  usdt_wallet?: string
  salary_percentage: number
  salary_bonus: number
  created_at: string
  updated_at: string
}

interface UserStats {
  total: number
  active: number
  inactive: number
  terminated: number
  byRole: {
    junior: number
    manager: number
    tester: number
    hr: number
    cfo: number
    admin: number
  }
}

export default function UsersPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setUsers(data || [])
      calculateStats(data || [])
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error)
      addToast({ type: 'error', title: 'Ошибка загрузки пользователей' })
    } finally {
      setLoading(false)
    }
  }

  function calculateStats(userData: User[]) {
    const stats: UserStats = {
      total: userData.length,
      active: userData.filter(u => u.status === 'active').length,
      inactive: userData.filter(u => u.status === 'inactive').length,
      terminated: userData.filter(u => u.status === 'terminated').length,
      byRole: {
        junior: userData.filter(u => u.role === 'junior').length,
        manager: userData.filter(u => u.role === 'manager').length,
        tester: userData.filter(u => u.role === 'tester').length,
        hr: userData.filter(u => u.role === 'hr').length,
        cfo: userData.filter(u => u.role === 'cfo').length,
        admin: userData.filter(u => u.role === 'admin').length
      }
    }
    setStats(stats)
  }

  async function handleStatusChange(userId: string, newStatus: 'active' | 'inactive' | 'terminated') {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('users')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error

      addToast({ type: 'success', title: `Статус пользователя изменен на ${newStatus}` })
      await loadUsers()
    } catch (error) {
      console.error('Ошибка изменения статуса:', error)
      addToast({ type: 'error', title: 'Ошибка изменения статуса' })
    }
  }

  async function handleBulkStatusChange(status: 'active' | 'inactive' | 'terminated') {
    if (selectedUsers.length === 0) {
      addToast({ type: 'warning', title: 'Выберите пользователей для изменения статуса' })
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('users')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .in('id', selectedUsers)

      if (error) throw error

      addToast({ type: 'success', title: `Статус ${selectedUsers.length} пользователей изменен` })
      setSelectedUsers([])
      await loadUsers()
    } catch (error) {
      console.error('Ошибка массового изменения статуса:', error)
      addToast({ type: 'error', title: 'Ошибка изменения статуса' })
    }
  }

  const columns: Column[] = [
    {
      key: 'full_name',
      label: 'Имя',
      sortable: true,
      render: (user: User) => (
        <div className="flex items-center">
          <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
          <div>
            <div className="font-medium text-gray-900">
              {user.first_name && user.last_name 
                ? `${user.first_name} ${user.last_name}`
                : 'Не указано'
              }
            </div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      label: 'Роль',
      sortable: true,
      render: (user: User) => <RoleBadge role={user.role} />
    },
    {
      key: 'status',
      label: 'Статус',
      sortable: true,
      render: (user: User) => <StatusBadge status={user.status} />
    },
    {
      key: 'salary_info',
      label: 'Зарплата',
      render: (user: User) => (
        <div className="text-sm">
          <div>{user.salary_percentage}%</div>
          {user.salary_bonus > 0 && (
            <div className="text-green-600">+${user.salary_bonus}</div>
          )}
        </div>
      )
    },
    {
      key: 'contact_info',
      label: 'Контакты',
      render: (user: User) => (
        <div className="text-sm">
          {user.telegram_username && (
            <div className="text-blue-600">@{user.telegram_username}</div>
          )}
          {user.usdt_wallet && (
            <div className="text-gray-500 font-mono text-xs">
              {user.usdt_wallet.slice(0, 8)}...{user.usdt_wallet.slice(-6)}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'created_at',
      label: 'Создан',
      sortable: true,
      render: (user: User) => (
        <div className="text-sm text-gray-500">
          {new Date(user.created_at).toLocaleDateString('ru-RU')}
        </div>
      )
    }
  ]

  const actions = [
    {
      label: 'Редактировать',
      icon: <PencilIcon className="h-4 w-4" />,
      onClick: (user: User) => router.push(`/hr/users/${user.id}/edit`),
      variant: 'primary' as const
    },
    {
      label: 'Активировать',
      onClick: (user: User) => handleStatusChange(user.id, 'active'),
      condition: (user: User) => user.status !== 'active',
      variant: 'success' as const
    },
    {
      label: 'Деактивировать',
      onClick: (user: User) => handleStatusChange(user.id, 'inactive'),
      condition: (user: User) => user.status === 'active',
      variant: 'warning' as const
    },
    {
      label: 'Уволить',
      icon: <TrashIcon className="h-4 w-4" />,
      onClick: (user: User) => handleStatusChange(user.id, 'terminated'),
      condition: (user: User) => user.status !== 'terminated',
      variant: 'danger' as const,
      confirmMessage: 'Вы уверены, что хотите уволить этого пользователя?'
    }
  ]

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-lg p-6">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Управление пользователями</h1>
        <div className="flex space-x-3">
          {selectedUsers.length > 0 && (
            <div className="flex space-x-2">
              <button
                onClick={() => handleBulkStatusChange('active')}
                className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
              >
                Активировать ({selectedUsers.length})
              </button>
              <button
                onClick={() => handleBulkStatusChange('inactive')}
                className="px-3 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700"
              >
                Деактивировать ({selectedUsers.length})
              </button>
              <button
                onClick={() => handleBulkStatusChange('terminated')}
                className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
              >
                Уволить ({selectedUsers.length})
              </button>
            </div>
          )}
          <button
            onClick={() => router.push('/hr/users/new')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Добавить пользователя
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            title="Всего пользователей"
            value={stats.total.toString()}
            icon="👥"
          />
          <KPICard
            title="Активные"
            value={stats.active.toString()}
            icon="✅"
            color="green"
            footer={`${Math.round((stats.active / stats.total) * 100)}% от общего`}
          />
          <KPICard
            title="Неактивные"
            value={stats.inactive.toString()}
            icon="⏸️"
            color="yellow"
          />
          <KPICard
            title="Уволенные"
            value={stats.terminated.toString()}
            icon="❌"
            color="red"
          />
        </div>
      )}

      {/* Role Distribution */}
      {stats && (
        <div className="bg-white rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Распределение по ролям</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.byRole.junior}</div>
              <div className="text-sm text-gray-500">Junior</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.byRole.manager}</div>
              <div className="text-sm text-gray-500">Manager</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.byRole.tester}</div>
              <div className="text-sm text-gray-500">Tester</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.byRole.hr}</div>
              <div className="text-sm text-gray-500">HR</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.byRole.cfo}</div>
              <div className="text-sm text-gray-500">CFO</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.byRole.admin}</div>
              <div className="text-sm text-gray-500">Admin</div>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow">
        <DataTable
          data={users}
          columns={columns}
          actions={actions}
          pagination={{ pageSize: 20 }}
          sorting={{ key: 'created_at', direction: 'desc' }}
          filtering={true}
          selection={{
            enabled: true,
            selectedIds: selectedUsers,
            onSelectionChange: setSelectedUsers
          }}
          export={{
            enabled: true,
            filename: 'users-export'
          }}
        />
      </div>
    </div>
  )
}
