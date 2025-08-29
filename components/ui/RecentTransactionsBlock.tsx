'use client'

import { ClockIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline'
import StatusBadge from './StatusBadge'

interface RecentTransaction {
  id: string
  time: string
  casino: string
  deposit: number
  withdrawal?: number
  status: string
  type: 'deposit' | 'withdrawal'
}

interface RecentTransactionsBlockProps {
  transactions: RecentTransaction[]
  loading?: boolean
  onViewAll?: () => void
}

export default function RecentTransactionsBlock({ 
  transactions, 
  loading, 
  onViewAll 
}: RecentTransactionsBlockProps) {
  function getTypeIcon(type: string) {
    switch (type) {
      case 'deposit':
        return <ArrowDownIcon className="h-4 w-4 text-blue-600" />
      case 'withdrawal':
        return <ArrowUpIcon className="h-4 w-4 text-green-600" />
      default:
        return <ClockIcon className="h-4 w-4 text-gray-400" />
    }
  }

  function getTypeColor(type: string): string {
    switch (type) {
      case 'deposit': return 'bg-blue-50 border-blue-200'
      case 'withdrawal': return 'bg-green-50 border-green-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Последние транзакции</h3>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center p-3 border rounded">
              <div className="w-8 h-8 bg-gray-200 rounded mr-3"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="w-16 h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Последние транзакции</h3>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Все транзакции →
          </button>
        )}
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <ClockIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <div className="text-lg font-medium">Нет транзакций</div>
          <div className="text-sm">Транзакции появятся после первых операций</div>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map(transaction => (
            <div 
              key={transaction.id}
              className={`flex items-center p-3 border rounded-lg ${getTypeColor(transaction.type)}`}
            >
              {/* Иконка типа */}
              <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center mr-3">
                {getTypeIcon(transaction.type)}
              </div>

              {/* Основная информация */}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-900">
                    {transaction.casino}
                  </div>
                  <div className="text-sm text-gray-500">
                    {transaction.time}
                  </div>
                </div>
                
                <div className="flex items-center mt-1">
                  <div className="text-sm text-gray-600">
                    Депозит: ${transaction.deposit.toFixed(2)}
                  </div>
                  {transaction.withdrawal && (
                    <div className="text-sm text-gray-600 ml-3">
                      Вывод: ${transaction.withdrawal.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>

              {/* Статус */}
              <div className="ml-3">
                <StatusBadge status={transaction.status} />
              </div>

              {/* Профит (если есть вывод) */}
              {transaction.withdrawal && (
                <div className="ml-3 text-right">
                  <div className={`font-semibold ${
                    transaction.withdrawal > transaction.deposit 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {transaction.withdrawal > transaction.deposit ? '+' : ''}
                    ${(transaction.withdrawal - transaction.deposit).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">профит</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
