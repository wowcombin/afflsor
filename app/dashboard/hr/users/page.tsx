'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import DataTable, { Column, ActionButton } from '@/components/ui/DataTable'
import KPICard from '@/components/ui/KPICard'
import StatusBadge from '@/components/ui/StatusBadge'
import Modal from '@/components/ui/Modal'
import { User } from '@/types/database.types'
import { 
  UsersIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserPlusIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

interface UserStats {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  terminatedUsers: number
}

export default function HRUsersPage() {
  const { addToast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    terminatedUsers: 0
  })
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // Форма нового пользователя
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'junior' as User['role'],
    telegram_username: '',
    usdt_wallet: '',
    salary_percentage: 0,
    salary_bonus: 0
  })

  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    try {
      const response = await fetch('/api/users')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка загрузки пользователей')
      }

      const { users: usersData } = await response.json()
      setUsers(usersData)

      // Рассчитываем статистику
      const totalUsers = usersData.length
      const activeUsers = usersData.filter((u: User) => u.status === 'active').length
      const inactiveUsers = usersData.filter((u: User) => u.status === 'inactive').length
      const terminatedUsers = usersData.filter((u: User) => u.status === 'terminated').length

      setStats({
        totalUsers,
        activeUsers,
        inactiveUsers,
        terminatedUsers
      })

    } catch (error: any) {
      console.error('Ошибка загрузки пользователей:', error)
      addToast({
        type: 'error',
        title: 'Ошибка загрузки данных',
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateUser() {
    if (!newUserForm.email || !newUserForm.password) {
      addToast({ type: 'error', title: 'Заполните обязательные поля' })
      return
    }

    setCreating(true)

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newUserForm)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'Пользователь создан',
        description: `${newUserForm.email} успешно добавлен в систему`
      })

      setShowCreateModal(false)
      setNewUserForm({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        role: 'junior',
        telegram_username: '',
        usdt_wallet: '',
        salary_percentage: 0,
        salary_bonus: 0
      })
      
      await loadUsers()

    } catch (error: any) {
      console.error('Ошибка создания пользователя:', error)
      addToast({
        type: 'error',
        title: 'Ошибка создания пользователя',
        description: error.message
      })
    } finally {
      setCreating(false)
    }
  }

  async function handleUpdateUser() {
    if (!selectedUser) return

    setUpdating(true)

    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: selectedUser.first_name,
          last_name: selectedUser.last_name,
          role: selectedUser.role,
          status: selectedUser.status,
          telegram_username: selectedUser.telegram_username,
          usdt_wallet: selectedUser.usdt_wallet,
          salary_percentage: selectedUser.salary_percentage,
          salary_bonus: selectedUser.salary_bonus
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'Пользователь обновлен',
        description: `Данные ${selectedUser.email} успешно сохранены`
      })

      setShowEditModal(false)
      setSelectedUser(null)
      await loadUsers()

    } catch (error: any) {
      console.error('Ошибка обновления пользователя:', error)
      addToast({
        type: 'error',
        title: 'Ошибка обновления',
        description: error.message
      })
    } finally {
      setUpdating(false)
    }
  }

  async function handleDeleteUser(user: User) {
    if (!confirm(`Вы уверены, что хотите удалить пользователя ${user.email}? Это действие необратимо.`)) {
      return
    }

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      addToast({
        type: 'success',
        title: 'Пользователь удален',
        description: `${user.email} удален из системы`
      })

      await loadUsers()

    } catch (error: any) {
      console.error('Ошибка удаления пользователя:', error)
      addToast({
        type: 'error',
        title: 'Ошибка удаления',
        description: error.message
      })
    }
  }

  const columns: Column<User>[] = [
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      filterable: true,
      render: (user) => (
        <div>
          <div className="font-medium text-gray-900">{user.email}</div>
          <div className="text-sm text-gray-500">
            {user.first_name} {user.last_name}
          </div>
        </div>
      )
    },
    {
      key: 'role',
      label: 'Роль',
      sortable: true,
      filterable: true,
      render: (user) => (
        <span className="capitalize font-medium text-primary-600">
          {user.role}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Статус',
      sortable: true,
      render: (user) => <StatusBadge status={user.status} />
    },
    {
      key: 'salary_percentage',
      label: 'Процент',
      sortable: true,
      align: 'right',
      render: (user) => (
        <span className="font-mono">
          {user.salary_percentage}%
        </span>
      )
    },
    {
      key: 'salary_bonus',
      label: 'Бонус',
      sortable: true,
      align: 'right',
      render: (user) => (
        <span className="font-mono text-success-600">
          ${user.salary_bonus}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Создан',
      sortable: true,
      render: (user) => (
        <span className="text-sm text-gray-500">
          {new Date(user.created_at).toLocaleDateString('ru-RU')}
        </span>
      )
    }
  ]

  const actions: ActionButton<User>[] = [
    {
      label: 'Редактировать',
      action: (user) => {
        setSelectedUser(user)
        setShowEditModal(true)
      },
      variant: 'primary'
    },
    {
      label: 'Удалить',
      action: handleDeleteUser,
      variant: 'danger',
      condition: (user) => user.role !== 'admin' // Нельзя удалить админа
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Управление пользователями</h1>
          <p className="text-gray-600">Создание, редактирование и управление сотрудниками</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <UserPlusIcon className="h-5 w-5 mr-2" />
          Создать пользователя
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Всего пользователей"
          value={stats.totalUsers}
          icon={<UsersIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Активные"
          value={stats.activeUsers}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="success"
        />
        <KPICard
          title="Неактивные"
          value={stats.inactiveUsers}
          icon={<XCircleIcon className="h-6 w-6" />}
          color="warning"
        />
        <KPICard
          title="Уволенные"
          value={stats.terminatedUsers}
          icon={<XCircleIcon className="h-6 w-6" />}
          color="danger"
        />
      </div>

      {/* Таблица пользователей */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">
            Пользователи системы ({users.length})
          </h3>
        </div>
        
        <DataTable
          data={users}
          columns={columns}
          actions={actions}
          loading={loading}
          pagination={{ pageSize: 20 }}
          filtering={true}
          exportable={true}
          emptyMessage="Пользователи не найдены"
        />
      </div>

      {/* Modal создания пользователя */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Создать нового пользователя"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Email *</label>
              <input
                type="email"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                className="form-input"
                placeholder="user@example.com"
                required
              />
            </div>
            <div>
              <label className="form-label">Пароль *</label>
              <input
                type="password"
                value={newUserForm.password}
                onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                className="form-input"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Имя</label>
              <input
                type="text"
                value={newUserForm.first_name}
                onChange={(e) => setNewUserForm({ ...newUserForm, first_name: e.target.value })}
                className="form-input"
                placeholder="Иван"
              />
            </div>
            <div>
              <label className="form-label">Фамилия</label>
              <input
                type="text"
                value={newUserForm.last_name}
                onChange={(e) => setNewUserForm({ ...newUserForm, last_name: e.target.value })}
                className="form-input"
                placeholder="Иванов"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Роль *</label>
              <select
                value={newUserForm.role}
                onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as User['role'] })}
                className="form-input"
                required
              >
                <option value="junior">Junior</option>
                <option value="manager">Manager</option>
                <option value="teamlead">Team Lead</option>
                <option value="tester">Tester</option>
                <option value="hr">HR</option>
                <option value="cfo">CFO</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="form-label">Telegram</label>
              <input
                type="text"
                value={newUserForm.telegram_username}
                onChange={(e) => setNewUserForm({ ...newUserForm, telegram_username: e.target.value })}
                className="form-input"
                placeholder="@username"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Процент от профита (%)</label>
              <input
                type="number"
                value={newUserForm.salary_percentage}
                onChange={(e) => setNewUserForm({ ...newUserForm, salary_percentage: parseFloat(e.target.value) || 0 })}
                className="form-input"
                placeholder="15.5"
                min="0"
                max="100"
                step="0.1"
              />
            </div>
            <div>
              <label className="form-label">Фиксированный бонус ($)</label>
              <input
                type="number"
                value={newUserForm.salary_bonus}
                onChange={(e) => setNewUserForm({ ...newUserForm, salary_bonus: parseFloat(e.target.value) || 0 })}
                className="form-input"
                placeholder="100"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div>
            <label className="form-label">USDT кошелек</label>
            <input
              type="text"
              value={newUserForm.usdt_wallet}
              onChange={(e) => setNewUserForm({ ...newUserForm, usdt_wallet: e.target.value })}
              className="form-input"
              placeholder="TXXXxxxXXXxxxXXX..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowCreateModal(false)}
              className="btn-secondary"
              disabled={creating}
            >
              Отмена
            </button>
            <button
              onClick={handleCreateUser}
              className="btn-primary"
              disabled={creating}
            >
              {creating ? 'Создание...' : 'Создать пользователя'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal редактирования пользователя */}
      {selectedUser && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setSelectedUser(null)
          }}
          title={`Редактировать: ${selectedUser.email}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Имя</label>
                <input
                  type="text"
                  value={selectedUser.first_name || ''}
                  onChange={(e) => setSelectedUser({ ...selectedUser, first_name: e.target.value })}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Фамилия</label>
                <input
                  type="text"
                  value={selectedUser.last_name || ''}
                  onChange={(e) => setSelectedUser({ ...selectedUser, last_name: e.target.value })}
                  className="form-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Роль</label>
                <select
                  value={selectedUser.role}
                  onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value as User['role'] })}
                  className="form-input"
                >
                  <option value="junior">Junior</option>
                  <option value="manager">Manager</option>
                  <option value="teamlead">Team Lead</option>
                  <option value="tester">Tester</option>
                  <option value="hr">HR</option>
                  <option value="cfo">CFO</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="form-label">Статус</label>
                <select
                  value={selectedUser.status}
                  onChange={(e) => setSelectedUser({ ...selectedUser, status: e.target.value as User['status'] })}
                  className="form-input"
                >
                  <option value="active">Активен</option>
                  <option value="inactive">Неактивен</option>
                  <option value="terminated">Уволен</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Процент от профита (%)</label>
                <input
                  type="number"
                  value={selectedUser.salary_percentage}
                  onChange={(e) => setSelectedUser({ ...selectedUser, salary_percentage: parseFloat(e.target.value) || 0 })}
                  className="form-input"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
              <div>
                <label className="form-label">Фиксированный бонус ($)</label>
                <input
                  type="number"
                  value={selectedUser.salary_bonus}
                  onChange={(e) => setSelectedUser({ ...selectedUser, salary_bonus: parseFloat(e.target.value) || 0 })}
                  className="form-input"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Telegram</label>
              <input
                type="text"
                value={selectedUser.telegram_username || ''}
                onChange={(e) => setSelectedUser({ ...selectedUser, telegram_username: e.target.value })}
                className="form-input"
                placeholder="@username"
              />
            </div>

            <div>
              <label className="form-label">USDT кошелек</label>
              <input
                type="text"
                value={selectedUser.usdt_wallet || ''}
                onChange={(e) => setSelectedUser({ ...selectedUser, usdt_wallet: e.target.value })}
                className="form-input"
                placeholder="TXXXxxxXXXxxxXXX..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedUser(null)
                }}
                className="btn-secondary"
                disabled={updating}
              >
                Отмена
              </button>
              <button
                onClick={handleUpdateUser}
                className="btn-primary"
                disabled={updating}
              >
                {updating ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
