'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Team, TeamMember, TeamCall, CallAgendaItem, User } from '@/types/database.types'
import { 
  UserGroupIcon, 
  ChatBubbleLeftRightIcon, 
  PencilIcon,
  LinkIcon,
  PlusIcon,
  ClockIcon,
  CalendarIcon,
  MicrophoneIcon,
  UserPlusIcon,
  TrashIcon,
  PhoneIcon
} from '@heroicons/react/24/outline'

export default function TeamDetailPage() {
  const params = useParams()
  const teamId = params.id as string

  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [calls, setCalls] = useState<TeamCall[]>([])
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddMember, setShowAddMember] = useState(false)
  const [showAddCall, setShowAddCall] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState('member')

  // Форма нового созвона
  const [newCall, setNewCall] = useState({
    name: '',
    description: '',
    duration_minutes: 20,
    schedule_time: '09:00',
    schedule_days: [] as string[],
    agenda_items: [] as Partial<CallAgendaItem>[]
  })

  useEffect(() => {
    if (teamId) {
      loadTeamData()
      loadAvailableUsers()
    }
  }, [teamId])

  const loadTeamData = async () => {
    try {
      // Загружаем информацию о команде
      const teamResponse = await fetch(`/api/teams`)
      if (teamResponse.ok) {
        const teamData = await teamResponse.json()
        const currentTeam = teamData.teams?.find((t: Team) => t.id === teamId)
        if (currentTeam) {
          setTeam(currentTeam)
          setMembers(currentTeam.team_members || [])
        }
      }

      // Загружаем созвоны
      const callsResponse = await fetch(`/api/teams/${teamId}/calls`)
      if (callsResponse.ok) {
        const callsData = await callsResponse.json()
        setCalls(callsData.calls || [])
      }
    } catch (error) {
      console.error('Error loading team data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setAvailableUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const addMember = async () => {
    if (!selectedUserId) return

    try {
      const response = await fetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: selectedUserId,
          role: selectedRole
        })
      })

      if (response.ok) {
        await loadTeamData()
        setShowAddMember(false)
        setSelectedUserId('')
        setSelectedRole('member')
      }
    } catch (error) {
      console.error('Error adding member:', error)
    }
  }

  const removeMember = async (userId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members?user_id=${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadTeamData()
      }
    } catch (error) {
      console.error('Error removing member:', error)
    }
  }

  const addAgendaItem = () => {
    setNewCall(prev => ({
      ...prev,
      agenda_items: [
        ...prev.agenda_items,
        {
          order_number: prev.agenda_items.length + 1,
          title: '',
          description: '',
          duration_minutes: 1,
          speaker_role: 'manager'
        }
      ]
    }))
  }

  const updateAgendaItem = (index: number, field: string, value: any) => {
    setNewCall(prev => ({
      ...prev,
      agenda_items: prev.agenda_items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const removeAgendaItem = (index: number) => {
    setNewCall(prev => ({
      ...prev,
      agenda_items: prev.agenda_items.filter((_, i) => i !== index)
    }))
  }

  const createCall = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/calls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newCall)
      })

      if (response.ok) {
        await loadTeamData()
        setShowAddCall(false)
        setNewCall({
          name: '',
          description: '',
          duration_minutes: 20,
          schedule_time: '09:00',
          schedule_days: [],
          agenda_items: []
        })
      }
    } catch (error) {
      console.error('Error creating call:', error)
    }
  }

  const formatSchedule = (call: TeamCall) => {
    const days = call.schedule_days?.map(day => {
      const dayNames: { [key: string]: string } = {
        monday: 'Пн',
        tuesday: 'Вт',
        wednesday: 'Ср',
        thursday: 'Чт',
        friday: 'Пт',
        saturday: 'Сб',
        sunday: 'Вс'
      }
      return dayNames[day] || day
    }).join(', ')

    return `${days} в ${call.schedule_time}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Команда не найдена</h3>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <UserGroupIcon className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
            <p className="text-gray-600">{team.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddMember(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <UserPlusIcon className="w-4 h-4" />
            <span>Добавить участника</span>
          </button>
          <button
            onClick={() => setShowAddCall(true)}
            className="btn-success flex items-center space-x-2"
          >
            <PhoneIcon className="w-4 h-4" />
            <span>Добавить созвон</span>
          </button>
        </div>
      </div>

      {/* Участники команды */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Участники команды ({members.filter(m => m.is_active).length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.filter(m => m.is_active).map((member) => (
            <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">
                  {member.user?.first_name && member.user?.last_name 
                    ? `${member.user.first_name} ${member.user.last_name}` 
                    : member.user?.email}
                </div>
                <div className="text-sm text-gray-500">{member.role}</div>
              </div>
              <button
                onClick={() => removeMember(member.user_id)}
                className="text-red-500 hover:text-red-700"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Созвоны */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Созвоны команды ({calls.length})
        </h2>
        <div className="space-y-6">
          {calls.map((call) => (
            <div key={call.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{call.name}</h3>
                  {call.description && (
                    <p className="text-sm text-gray-600 mt-1">{call.description}</p>
                  )}
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <ClockIcon className="w-4 h-4" />
                      <span>{call.duration_minutes} мин</span>
                    </div>
                    {call.schedule_time && call.schedule_days && (
                      <div className="flex items-center space-x-1">
                        <CalendarIcon className="w-4 h-4" />
                        <span>{formatSchedule(call)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Программа созвона */}
              {call.agenda_items && call.agenda_items.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Программа созвона:</h4>
                  <div className="space-y-2">
                    {call.agenda_items.map((item, index) => (
                      <div key={item.id} className="flex items-center space-x-3 text-sm">
                        <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium">
                          {item.order_number}
                        </span>
                        <div className="flex-1">
                          <span className="font-medium">{item.title}</span>
                          {item.description && (
                            <span className="text-gray-600"> - {item.description}</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-gray-500">
                          <ClockIcon className="w-3 h-3" />
                          <span>{item.duration_minutes} мин</span>
                          {item.speaker_role && (
                            <>
                              <MicrophoneIcon className="w-3 h-3" />
                              <span>{item.speaker_role}</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Модальное окно добавления участника */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Добавить участника</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Пользователь
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Выберите пользователя</option>
                  {availableUsers
                    .filter(user => !members.some(m => m.user_id === user.id && m.is_active))
                    .map(user => (
                      <option key={user.id} value={user.id}>
                        {user.first_name && user.last_name 
                          ? `${user.first_name} ${user.last_name}` 
                          : user.email}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Роль в команде
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="member">Участник</option>
                  <option value="leader">Лидер</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddMember(false)}
                className="btn-secondary"
              >
                Отмена
              </button>
              <button
                onClick={addMember}
                disabled={!selectedUserId}
                className="btn-primary disabled:opacity-50"
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно создания созвона */}
      {showAddCall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl m-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Создать созвон</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Название созвона
                </label>
                <input
                  type="text"
                  value={newCall.name}
                  onChange={(e) => setNewCall(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Утренний созвон"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Описание
                </label>
                <textarea
                  value={newCall.description}
                  onChange={(e) => setNewCall(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={2}
                  placeholder="Описание созвона"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Длительность (мин)
                  </label>
                  <input
                    type="number"
                    value={newCall.duration_minutes}
                    onChange={(e) => setNewCall(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 20 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Время
                  </label>
                  <input
                    type="time"
                    value={newCall.schedule_time}
                    onChange={(e) => setNewCall(prev => ({ ...prev, schedule_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              {/* Программа созвона */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Программа созвона
                  </label>
                  <button
                    onClick={addAgendaItem}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Добавить пункт
                  </button>
                </div>
                <div className="space-y-3">
                  {newCall.agenda_items.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-md p-3">
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-4">
                          <input
                            type="text"
                            value={item.title || ''}
                            onChange={(e) => updateAgendaItem(index, 'title', e.target.value)}
                            placeholder="Название пункта"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="text"
                            value={item.description || ''}
                            onChange={(e) => updateAgendaItem(index, 'description', e.target.value)}
                            placeholder="Описание"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={item.duration_minutes || 1}
                            onChange={(e) => updateAgendaItem(index, 'duration_minutes', parseInt(e.target.value) || 1)}
                            placeholder="мин"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          />
                        </div>
                        <div className="col-span-2">
                          <select
                            value={item.speaker_role || ''}
                            onChange={(e) => updateAgendaItem(index, 'speaker_role', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          >
                            <option value="">Спикер</option>
                            <option value="manager">Manager</option>
                            <option value="teamlead">Team Lead</option>
                            <option value="hr">HR</option>
                            <option value="ceo">CEO</option>
                          </select>
                        </div>
                        <div className="col-span-1">
                          <button
                            onClick={() => removeAgendaItem(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddCall(false)}
                className="btn-secondary"
              >
                Отмена
              </button>
              <button
                onClick={createCall}
                disabled={!newCall.name}
                className="btn-primary disabled:opacity-50"
              >
                Создать созвон
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
