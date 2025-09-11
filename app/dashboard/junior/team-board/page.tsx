'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import KPICard from '@/components/ui/KPICard'
import Modal from '@/components/ui/Modal'
import { 
  ClipboardDocumentListIcon,
  UserGroupIcon,
  UserIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftIcon,
  CalendarDaysIcon,
  PlayIcon,
  ArrowUpIcon
} from '@heroicons/react/24/outline'

interface TeamMember {
  id: string
  email: string
  first_name?: string
  last_name?: string
  role: string
  status: string
}

interface TeamTask {
  id: string
  title: string
  description?: string
  task_status: string
  priority: string
  due_date?: string
  estimated_hours?: number
  created_at: string
  is_overdue: boolean
  assignee?: TeamMember
  created_by_user: {
    email: string
    first_name?: string
    last_name?: string
    role: string
  }
}

const BOARD_COLUMNS = [
  { id: 'todo', title: 'К выполнению', color: 'bg-yellow-100 border-yellow-300', icon: '📝' },
  { id: 'in_progress', title: 'В работе', color: 'bg-blue-100 border-blue-300', icon: '⚡' },
  { id: 'review', title: 'На проверке', color: 'bg-purple-100 border-purple-300', icon: '👀' },
  { id: 'done', title: 'Выполнено', color: 'bg-green-100 border-green-300', icon: '✅' }
]

export default function JuniorTeamBoardPage() {
  const { addToast } = useToast()
  const [teamTasks, setTeamTasks] = useState<TeamTask[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null)
  const [loading, setLoading] = useState(true)

  // Модал просмотра задачи
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TeamTask | null>(null)

  useEffect(() => {
    loadTeamData()
  }, [])

  async function loadTeamData() {
    try {
      setLoading(true)
      
      // Загружаем текущего пользователя
      const userResponse = await fetch('/api/users/me')
      if (userResponse.ok) {
        const userData = await userResponse.json()
        setCurrentUser(userData.user)
      }

      // Загружаем команду (других Junior'ов под тем же Team Lead'ом)
      const teamResponse = await fetch('/api/junior/team-board')
      
      if (!teamResponse.ok) {
        throw new Error('Ошибка загрузки командной доски')
      }

      const data = await teamResponse.json()
      setTeamTasks(data.tasks || [])
      setTeamMembers(data.team_members || [])

    } catch (error: any) {
      console.error('Ошибка загрузки командной доски:', error)
      addToast({
        type: 'error',
        title: 'Ошибка загрузки данных',
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  function getTasksByStatus(status: string): TeamTask[] {
    return teamTasks.filter(task => task.task_status === status)
  }

  function openTaskModal(task: TeamTask) {
    setSelectedTask(task)
    setShowTaskModal(true)
  }

  function getPriorityColor(priority: string): string {
    switch (priority) {
      case 'urgent': return 'border-l-red-500 bg-red-50'
      case 'high': return 'border-l-orange-500 bg-orange-50'
      case 'medium': return 'border-l-blue-500 bg-blue-50'
      case 'low': return 'border-l-gray-500 bg-gray-50'
      default: return 'border-l-gray-500 bg-gray-50'
    }
  }

  function getDisplayName(member: TeamMember): string {
    if (member.first_name || member.last_name) {
      return `${member.first_name || ''} ${member.last_name || ''}`.trim()
    }
    return member.email
  }

  function isMyTask(task: TeamTask): boolean {
    return task.assignee?.id === currentUser?.id
  }

  // Статистика команды
  const todoTasks = getTasksByStatus('todo')
  const inProgressTasks = getTasksByStatus('in_progress')
  const reviewTasks = getTasksByStatus('review')
  const doneTasks = getTasksByStatus('done')
  const myTasks = teamTasks.filter(task => isMyTask(task))
  const overdueTasks = teamTasks.filter(task => task.is_overdue)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Загрузка командной доски...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Командная доска</h1>
          <p className="text-gray-600">Junior: видите задачи всей команды и свой вклад</p>
        </div>
      </div>

      {/* Информация о командной работе */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <UserGroupIcon className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-indigo-800">
              Командная работа Junior'ов
            </h3>
            <div className="mt-2 text-sm text-indigo-700">
              <p>• Видите задачи всех Junior'ов в команде</p>
              <p>• Мотивация через соревнование и взаимопомощь</p>
              <p>• Ваши задачи выделены цветом для фокуса</p>
              <p>• Учитесь на примере коллег и их подходах</p>
            </div>
          </div>
        </div>
      </div>

      {/* Статистика команды */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <KPICard
          title="Всего задач"
          value={teamTasks.length}
          icon={<ClipboardDocumentListIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="К выполнению"
          value={todoTasks.length}
          icon={<ClockIcon className="h-6 w-6" />}
          color="warning"
        />
        <KPICard
          title="В работе"
          value={inProgressTasks.length}
          icon={<PlayIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="На проверке"
          value={reviewTasks.length}
          icon={<ChatBubbleLeftIcon className="h-6 w-6" />}
          color="primary"
        />
        <KPICard
          title="Выполнено"
          value={doneTasks.length}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="success"
        />
        <KPICard
          title="Мои задачи"
          value={myTasks.length}
          icon={<UserIcon className="h-6 w-6" />}
          color="success"
        />
      </div>

      {/* Информация о команде */}
      {teamMembers.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <UserGroupIcon className="h-5 w-5 mr-2" />
              Наша команда ({teamMembers.length + 1})
            </h3>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-3">
              {/* Текущий пользователь */}
              {currentUser && (
                <div className="flex items-center space-x-2 bg-blue-100 px-3 py-2 rounded-lg">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {getDisplayName(currentUser).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-blue-900">{getDisplayName(currentUser)} (Вы)</div>
                    <div className="text-xs text-blue-700">{myTasks.length} задач</div>
                  </div>
                </div>
              )}
              
              {/* Другие участники команды */}
              {teamMembers.map((member) => {
                const memberTasks = teamTasks.filter(task => task.assignee?.id === member.id)
                return (
                  <div key={member.id} className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-lg">
                    <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {getDisplayName(member).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{getDisplayName(member)}</div>
                      <div className="text-xs text-gray-600">{memberTasks.length} задач</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Командная Kanban доска */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Командная доска задач</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[500px]">
          {BOARD_COLUMNS.map((column) => {
            const columnTasks = getTasksByStatus(column.id)
            
            return (
              <div
                key={column.id}
                className={`rounded-lg border-2 border-dashed p-4 ${column.color}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900 flex items-center">
                    <span className="mr-2">{column.icon}</span>
                    {column.title}
                  </h4>
                  <span className="bg-white rounded-full px-2 py-1 text-sm font-medium text-gray-600">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {columnTasks.map((task) => {
                    const isMyTaskFlag = isMyTask(task)
                    
                    return (
                      <div
                        key={task.id}
                        onClick={() => openTaskModal(task)}
                        className={`p-3 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-shadow ${
                          isMyTaskFlag 
                            ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-200' 
                            : getPriorityColor(task.priority)
                        }`}
                      >
                        <div className="space-y-2">
                          {/* Заголовок и индикатор "моя задача" */}
                          <div className="flex items-start justify-between">
                            <h5 className="font-medium text-gray-900 text-sm leading-tight">
                              {task.title}
                            </h5>
                            {isMyTaskFlag && (
                              <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded ml-2 flex-shrink-0">
                                МОЯ
                              </span>
                            )}
                          </div>

                          {/* Исполнитель */}
                          <div className="flex items-center text-xs text-gray-600">
                            <UserIcon className="h-3 w-3 mr-1" />
                            <span>
                              {task.assignee ? getDisplayName(task.assignee) : 'Не назначена'}
                            </span>
                          </div>

                          {/* Дедлайн */}
                          {task.due_date && (
                            <div className={`flex items-center text-xs ${task.is_overdue ? 'text-red-600' : 'text-gray-600'}`}>
                              <CalendarDaysIcon className="h-3 w-3 mr-1" />
                              <span>
                                {new Date(task.due_date).toLocaleDateString('ru-RU')}
                                {task.is_overdue && ' ⚠️'}
                              </span>
                            </div>
                          )}

                          {/* Приоритет */}
                          <div className="flex justify-between items-center">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                              task.priority === 'urgent' 
                                ? 'bg-red-100 text-red-800'
                                : task.priority === 'high'
                                ? 'bg-orange-100 text-orange-800'
                                : task.priority === 'medium'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {task.priority === 'urgent' ? '🔥' :
                               task.priority === 'high' ? '⚡' :
                               task.priority === 'medium' ? '📝' : '📋'}
                            </span>
                            
                            {/* Создатель */}
                            <div className="text-xs text-gray-500 capitalize">
                              {task.created_by_user.role}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  
                  {columnTasks.length === 0 && (
                    <div className="text-center text-gray-500 text-sm py-8">
                      Пока нет задач
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal просмотра задачи */}
      <Modal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title={selectedTask?.title || 'Задача'}
        size="lg"
      >
        {selectedTask && (
          <div className="space-y-4">
            {/* Индикатор "моя задача" */}
            {isMyTask(selectedTask) && (
              <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center">
                  <UserIcon className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-900">
                    Это ваша задача! Вы можете управлять ею в разделе "Мои задачи"
                  </span>
                </div>
              </div>
            )}

            {/* Основная информация */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Статус</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${
                    selectedTask.task_status === 'done' 
                      ? 'bg-green-100 text-green-800'
                      : selectedTask.task_status === 'in_progress'
                      ? 'bg-blue-100 text-blue-800'
                      : selectedTask.task_status === 'review'
                      ? 'bg-purple-100 text-purple-800'
                      : selectedTask.task_status === 'todo'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedTask.task_status === 'done' ? 'Выполнена' :
                     selectedTask.task_status === 'in_progress' ? 'В работе' :
                     selectedTask.task_status === 'review' ? 'На проверке' :
                     selectedTask.task_status === 'todo' ? 'К выполнению' : 'Отложена'}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Приоритет</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${
                    selectedTask.priority === 'urgent' 
                      ? 'bg-red-100 text-red-800'
                      : selectedTask.priority === 'high'
                      ? 'bg-orange-100 text-orange-800'
                      : selectedTask.priority === 'medium'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedTask.priority === 'urgent' ? '🔥 Срочно' :
                     selectedTask.priority === 'high' ? '⚡ Высокий' :
                     selectedTask.priority === 'medium' ? '📝 Средний' : '📋 Низкий'}
                  </span>
                </div>
              </div>
            </div>

            {/* Описание */}
            {selectedTask.description && (
              <div>
                <label className="text-sm font-medium text-gray-700">Описание</label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedTask.description}</p>
                </div>
              </div>
            )}

            {/* Исполнитель и дедлайн */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Исполнитель</label>
                <div className="mt-1">
                  {selectedTask.assignee ? (
                    <div>
                      <div className="font-medium text-gray-900">
                        {getDisplayName(selectedTask.assignee)}
                        {isMyTask(selectedTask) && ' (Вы)'}
                      </div>
                      <div className="text-sm text-gray-500">{selectedTask.assignee.email}</div>
                    </div>
                  ) : (
                    <span className="text-gray-500">Не назначена</span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Дедлайн</label>
                <div className="mt-1">
                  {selectedTask.due_date ? (
                    <div className={`text-sm ${selectedTask.is_overdue ? 'text-red-600' : 'text-gray-600'}`}>
                      <div className="flex items-center">
                        <CalendarDaysIcon className="h-4 w-4 mr-1" />
                        {new Date(selectedTask.due_date).toLocaleDateString('ru-RU')}
                      </div>
                      {selectedTask.is_overdue && (
                        <div className="text-xs text-red-600">⚠️ Просрочена</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-500">Не указан</span>
                  )}
                </div>
              </div>
            </div>

            {/* Создатель */}
            <div>
              <label className="text-sm font-medium text-gray-700">Создал задачу</label>
              <div className="mt-1">
                <div className="text-sm text-gray-900">
                  {`${selectedTask.created_by_user.first_name || ''} ${selectedTask.created_by_user.last_name || ''}`.trim() || selectedTask.created_by_user.email}
                </div>
                <div className="text-xs text-gray-500 capitalize">{selectedTask.created_by_user.role}</div>
              </div>
            </div>

            {/* Кнопка закрытия */}
            <div className="flex justify-end pt-4">
              <button
                onClick={() => setShowTaskModal(false)}
                className="btn-secondary"
              >
                Закрыть
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
