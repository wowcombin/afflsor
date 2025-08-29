'use client'

import { TrophyIcon, StarIcon } from '@heroicons/react/24/outline'

interface TopPerformer {
  position: number
  name: string
  telegram?: string
  profit: number
  successRate: number
  isCurrentUser: boolean
}

interface TopPerformersBlockProps {
  performers: TopPerformer[]
  loading?: boolean
  onViewFullRanking?: () => void
}

export default function TopPerformersBlock({ 
  performers, 
  loading, 
  onViewFullRanking 
}: TopPerformersBlockProps) {
  function getPositionIcon(position: number): string {
    switch (position) {
      case 1: return '🥇'
      case 2: return '🥈' 
      case 3: return '🥉'
      default: return `${position}`
    }
  }

  function getPositionColor(position: number): string {
    switch (position) {
      case 1: return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 2: return 'text-gray-600 bg-gray-50 border-gray-200'
      case 3: return 'text-orange-600 bg-orange-50 border-orange-200'
      default: return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Топ-5 лидеров</h3>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center p-3 border rounded-lg">
              <div className="w-8 h-8 bg-gray-200 rounded-full mr-3"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <TrophyIcon className="h-5 w-5 text-yellow-500 mr-2" />
          Топ-5 лидеров
        </h3>
        {onViewFullRanking && (
          <button
            onClick={onViewFullRanking}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Полный рейтинг →
          </button>
        )}
      </div>

      {performers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <StarIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <div className="text-lg font-medium">Нет данных о лидерах</div>
          <div className="text-sm">Данные появятся после первых выводов</div>
        </div>
      ) : (
        <div className="space-y-3">
          {performers.map(performer => (
            <div 
              key={performer.position}
              className={`flex items-center p-3 border rounded-lg transition-all ${
                performer.isCurrentUser 
                  ? 'border-blue-300 bg-blue-50 shadow-md' 
                  : 'border-gray-200 hover:shadow-sm'
              }`}
            >
              {/* Позиция */}
              <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-sm ${getPositionColor(performer.position)}`}>
                {performer.position <= 3 ? getPositionIcon(performer.position) : performer.position}
              </div>

              {/* Информация о пользователе */}
              <div className="flex-1 ml-3">
                <div className="flex items-center">
                  <div className="font-medium text-gray-900">
                    {performer.name || 'Неизвестно'}
                    {performer.isCurrentUser && (
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                        Это вы
                      </span>
                    )}
                  </div>
                  {performer.telegram && (
                    <div className="ml-2 text-sm text-blue-600">
                      @{performer.telegram}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center mt-1">
                  <div className="text-sm text-gray-600">
                    Успешность: {performer.successRate.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Профит */}
              <div className="text-right">
                <div className="text-lg font-bold text-green-600">
                  ${performer.profit.toFixed(2)}
                </div>
                
                {/* Визуальная полоса прогресса */}
                <div className="w-20 h-2 bg-gray-200 rounded-full mt-1">
                  <div 
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${Math.min((performer.profit / (performers[0]?.profit || 1)) * 100, 100)}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Дополнительная информация */}
      {performers.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-600 text-center">
            💡 Рейтинг обновляется в реальном времени на основе профита за месяц
          </div>
        </div>
      )}
    </div>
  )
}
