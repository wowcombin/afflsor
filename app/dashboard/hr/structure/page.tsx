'use client'

import { useState, useEffect } from 'react'
import { User, Team, TeamMember } from '@/types/database.types'
import { 
  UsersIcon, 
  ChatBubbleLeftRightIcon, 
  PencilIcon,
  LinkIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  PlusIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline'

interface TeamStructure {
  ceo: User | null
  coordinators: User[]
  hr: User[]
  cfo: User[]
  teamLeads: Array<{
    teamLead: User
    juniors: User[]
  }>
  manualQA: User[]
  qaAssistants: User[]
  unassignedJuniors: User[]
}

export default function OrganizationStructurePage() {
  const [structure, setStructure] = useState<TeamStructure>({
    ceo: null,
    coordinators: [],
    hr: [],
    cfo: [],
    teamLeads: [],
    manualQA: [],
    qaAssistants: [],
    unassignedJuniors: []
  })
  const [loading, setLoading] = useState(true)
  const [editingChatLink, setEditingChatLink] = useState<string | null>(null)
  const [chatLinkValue, setChatLinkValue] = useState('')

  useEffect(() => {
    loadStructure()
  }, [])

  const loadStructure = async () => {
    try {
      const response = await fetch('/api/hr/structure')
      if (response.ok) {
        const data = await response.json()
        setStructure(data)
      }
    } catch (error) {
      console.error('Error loading structure:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateChatLink = async (userId: string, chatLink: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          team_chat_link: chatLink
        })
      })

      if (response.ok) {
        await loadStructure()
        setEditingChatLink(null)
        setChatLinkValue('')
      }
    } catch (error) {
      console.error('Error updating chat link:', error)
    }
  }

  const startEditingChatLink = (userId: string, currentLink: string) => {
    setEditingChatLink(userId)
    setChatLinkValue(currentLink || '')
  }

  const cancelEditing = () => {
    setEditingChatLink(null)
    setChatLinkValue('')
  }

  const saveEditingChatLink = (userId: string) => {
    updateChatLink(userId, chatLinkValue)
  }

  const UserCard = ({ user, showChatLink = false, isTeamLead = false }: { 
    user: User, 
    showChatLink?: boolean, 
    isTeamLead?: boolean 
  }) => (
    <div className={`bg-white rounded-lg border p-4 ${isTeamLead ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <UsersIcon className="w-5 h-5 text-gray-500" />
          <div>
            <div className="font-medium text-gray-900">
              {user.first_name && user.last_name 
                ? `${user.first_name} ${user.last_name}` 
                : user.email}
            </div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          user.role === 'ceo' ? 'bg-purple-100 text-purple-800' :
          user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
          user.role === 'teamlead' ? 'bg-green-100 text-green-800' :
          user.role === 'hr' ? 'bg-pink-100 text-pink-800' :
          user.role === 'cfo' ? 'bg-yellow-100 text-yellow-800' :
          user.role === 'tester' ? 'bg-orange-100 text-orange-800' :
          user.role === 'qa_assistant' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {user.role === 'manager' ? 'Coordinator' :
           user.role === 'teamlead' ? 'Team Lead' :
           user.role === 'tester' ? 'Manual QA' :
           user.role === 'qa_assistant' ? 'QA Assistant' :
           user.role.toUpperCase()}
        </span>
      </div>

      {showChatLink && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ChatBubbleLeftRightIcon className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Чат команды:</span>
            </div>
            {editingChatLink === user.id ? (
              <div className="flex items-center space-x-2">
                <input
                  type="url"
                  value={chatLinkValue}
                  onChange={(e) => setChatLinkValue(e.target.value)}
                  placeholder="https://t.me/..."
                  className="text-xs px-2 py-1 border border-gray-300 rounded w-32"
                />
                <button
                  onClick={() => saveEditingChatLink(user.id)}
                  className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                >
                  ✓
                </button>
                <button
                  onClick={cancelEditing}
                  className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                {user.team_chat_link ? (
                  <a
                    href={user.team_chat_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                  >
                    <LinkIcon className="w-3 h-3" />
                    <span>Открыть чат</span>
                  </a>
                ) : (
                  <span className="text-xs text-gray-400">Не указан</span>
                )}
                <button
                  onClick={() => startEditingChatLink(user.id, user.team_chat_link || '')}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  <PencilIcon className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BuildingOfficeIcon className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Организационная структура</h1>
            <p className="text-gray-600">Иерархия команд и ссылки на чаты</p>
          </div>
        </div>
      </div>

      {/* CEO */}
      {structure.ceo && (
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Руководство</h2>
          <div className="inline-block">
            <UserCard user={structure.ceo} />
          </div>
        </div>
      )}

      {/* Management Level */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coordinators */}
        {structure.coordinators.length > 0 && (
          <div>
            <h3 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
              <UserGroupIcon className="w-5 h-5 mr-2 text-blue-600" />
              Coordinators ({structure.coordinators.length})
            </h3>
            <div className="space-y-3">
              {structure.coordinators.map((user) => (
                <UserCard key={user.id} user={user} showChatLink={true} />
              ))}
            </div>
          </div>
        )}

        {/* HR */}
        {structure.hr.length > 0 && (
          <div>
            <h3 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
              <UserGroupIcon className="w-5 h-5 mr-2 text-pink-600" />
              HR ({structure.hr.length})
            </h3>
            <div className="space-y-3">
              {structure.hr.map((user) => (
                <UserCard key={user.id} user={user} showChatLink={true} />
              ))}
            </div>
          </div>
        )}

        {/* CFO */}
        {structure.cfo.length > 0 && (
          <div>
            <h3 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
              <UserGroupIcon className="w-5 h-5 mr-2 text-yellow-600" />
              CFO ({structure.cfo.length})
            </h3>
            <div className="space-y-3">
              {structure.cfo.map((user) => (
                <UserCard key={user.id} user={user} showChatLink={true} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Team Leads and their Juniors */}
      {structure.teamLeads.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Команды Team Lead</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {structure.teamLeads.map(({ teamLead, juniors }) => (
              <div key={teamLead.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="mb-4">
                  <UserCard user={teamLead} showChatLink={true} isTeamLead={true} />
                </div>
                
                {juniors.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      Juniors ({juniors.length})
                    </h4>
                    <div className="space-y-2">
                      {juniors.map((junior) => (
                        <UserCard key={junior.id} user={junior} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other Roles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Manual QA */}
        {structure.manualQA.length > 0 && (
          <div>
            <h3 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
              <UserGroupIcon className="w-5 h-5 mr-2 text-orange-600" />
              Manual QA ({structure.manualQA.length})
            </h3>
            <div className="space-y-3">
              {structure.manualQA.map((user) => (
                <UserCard key={user.id} user={user} showChatLink={true} />
              ))}
            </div>
          </div>
        )}

        {/* QA Assistants */}
        {structure.qaAssistants.length > 0 && (
          <div>
            <h3 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
              <UserGroupIcon className="w-5 h-5 mr-2 text-red-600" />
              QA Assistant ({structure.qaAssistants.length})
            </h3>
            <div className="space-y-3">
              {structure.qaAssistants.map((user) => (
                <UserCard key={user.id} user={user} showChatLink={true} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Unassigned Juniors */}
      {structure.unassignedJuniors.length > 0 && (
        <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
          <h3 className="text-md font-semibold text-yellow-800 mb-3 flex items-center">
            <UserGroupIcon className="w-5 h-5 mr-2" />
            Неназначенные Juniors ({structure.unassignedJuniors.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {structure.unassignedJuniors.map((user) => (
              <UserCard key={user.id} user={user} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
