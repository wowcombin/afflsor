'use client'

import { useState, useEffect } from 'react'
import { Team, TeamMember } from '@/types/database.types'
import { 
  UserGroupIcon, 
  ChatBubbleLeftRightIcon, 
  PencilIcon,
  LinkIcon,
  PlusIcon,
  ArrowRightIcon,
  UsersIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function TeamsPage() {
    const [teams, setTeams] = useState<Team[]>([])
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)
    const [editingTeam, setEditingTeam] = useState<string | null>(null)
    const [editingChatLink, setEditingChatLink] = useState('')

    useEffect(() => {
        loadTeams()
    }, [])

    const loadTeams = async () => {
        try {
            const response = await fetch('/api/teams')
            if (response.ok) {
                const data = await response.json()
                setTeams(data.teams || [])
            }
        } catch (error) {
            console.error('Error loading teams:', error)
        } finally {
            setLoading(false)
        }
    }

    const updateTeamChatLink = async (teamId: string, chatLink: string) => {
        try {
            const response = await fetch(`/api/teams/${teamId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chat_link: chatLink
                })
            })

            if (response.ok) {
                await loadTeams()
                setEditingTeam(null)
                setEditingChatLink('')
            }
        } catch (error) {
            console.error('Error updating team chat link:', error)
        }
    }

    const startEditingChatLink = (teamId: string, currentLink: string) => {
        setEditingTeam(teamId)
        setEditingChatLink(currentLink || '')
    }

    const cancelEditing = () => {
        setEditingTeam(null)
        setEditingChatLink('')
    }

    const saveEditingChatLink = (teamId: string) => {
        updateTeamChatLink(teamId, editingChatLink)
    }

    const syncTeams = async () => {
        setSyncing(true)
        try {
            const response = await fetch('/api/teams/sync', {
                method: 'POST'
            })
            
            if (response.ok) {
                await loadTeams()
                alert('Команды успешно синхронизированы!')
            } else {
                const error = await response.json()
                alert(`Ошибка синхронизации: ${error.error}`)
            }
        } catch (error) {
            console.error('Error syncing teams:', error)
            alert('Ошибка при синхронизации команд')
        } finally {
            setSyncing(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <UserGroupIcon className="w-8 h-8 text-blue-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Чаты и созвоны</h1>
                        <p className="text-gray-600">Автоматическое управление участниками чатов по ролям и структуре</p>
                    </div>
                </div>
                <button
                    onClick={syncTeams}
                    disabled={syncing}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        syncing 
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                    {syncing ? 'Синхронизация...' : 'Синхронизировать команды'}
                </button>
            </div>

            {/* Информационная панель */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-medium text-blue-900 mb-3">🤖 Автоматическая логика команд</h3>
                <div className="text-sm text-blue-800 space-y-2">
                    <div><strong>Xbsidian All Team:</strong> Все роли (CEO, Team Lead, QA Assistant, CFO, HR, Coordinator, Manual QA, Junior)</div>
                    <div><strong>Xbsidian Manager Team:</strong> Управленческие роли (CEO, CFO, HR, Coordinator, Manual QA)</div>
                    <div><strong>Xbsidian Lead Team:</strong> Team Lead + управленческие роли</div>
                    <div><strong>Xbsidian Manual QA Team:</strong> QA роли + управленческие (Coordinator, Manual QA, CFO, CEO, QA Assistant)</div>
                    <div><strong>Xbsidian Interview Team:</strong> HR + Team Lead + неназначенные Junior</div>
                    <div><strong>Xbsidian Lead [ID] Team:</strong> Автоматически создается для каждого Team Lead с его Junior</div>
                </div>
                <div className="mt-3 text-xs text-blue-600">
                    Участники автоматически добавляются/удаляются при изменении ролей или структуры
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {teams.map((team) => (
                    <div key={team.id} className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
                                {team.description && (
                                    <p className="text-sm text-gray-600 mt-1">{team.description}</p>
                                )}
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${team.is_active
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                {team.is_active ? 'Активна' : 'Неактивна'}
                            </span>
                        </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <Link
                  href={`/dashboard/hr/teams/${team.id}`}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  <UsersIcon className="w-4 h-4" />
                  <span>Управление командой</span>
                  <ArrowRightIcon className="w-3 h-3" />
                </Link>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ChatBubbleLeftRightIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Чат команды:</span>
                </div>
                                {editingTeam === team.id ? (
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="url"
                                            value={editingChatLink}
                                            onChange={(e) => setEditingChatLink(e.target.value)}
                                            placeholder="https://t.me/..."
                                            className="text-xs px-2 py-1 border border-gray-300 rounded w-40"
                                        />
                                        <button
                                            onClick={() => saveEditingChatLink(team.id)}
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
                                        {team.chat_link ? (
                                            <a
                                                href={team.chat_link}
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
                                            onClick={() => startEditingChatLink(team.id, team.chat_link || '')}
                                            className="text-xs text-gray-500 hover:text-gray-700"
                                        >
                                            <PencilIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {teams.length === 0 && (
                <div className="text-center py-12">
                    <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Команды не найдены</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Команды будут созданы автоматически после применения миграции.
                    </p>
                </div>
            )}
        </div>
    )
}
