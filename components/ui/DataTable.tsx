'use client'

import { useState, useMemo } from 'react'
import { clsx } from 'clsx'
import { 
  ChevronUpIcon, 
  ChevronDownIcon,
  FunnelIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'

export interface Column<T = any> {
  key: keyof T | string
  label: string
  sortable?: boolean
  filterable?: boolean
  render?: (item: T) => React.ReactNode
  width?: string
  align?: 'left' | 'center' | 'right'
}

export interface ActionButton<T = any> {
  label: string
  action: (item: T) => void | Promise<void>
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost'
  condition?: (item: T) => boolean
  loading?: boolean
  icon?: React.ComponentType<{ className?: string }>
  tooltip?: string
}

interface DataTableProps<T = any> {
  data: T[]
  columns: Column<T>[]
  actions?: ActionButton<T>[]
  loading?: boolean
  pagination?: {
    pageSize?: number
    showPagination?: boolean
  }
  sorting?: {
    key?: string
    direction?: 'asc' | 'desc'
  }
  filtering?: boolean
  exportable?: boolean
  emptyMessage?: string
  className?: string
}

export default function DataTable<T extends Record<string, any>>({
  data = [],
  columns,
  actions = [],
  loading = false,
  pagination = { pageSize: 20, showPagination: true },
  sorting,
  filtering = false,
  exportable = false,
  emptyMessage = 'Нет данных для отображения',
  className
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(
    sorting ? { key: sorting.key || '', direction: sorting.direction || 'asc' } : null
  )
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState<Record<string, string>>({})

  // Фильтрация данных
  const filteredData = useMemo(() => {
    if (!filtering || Object.keys(filters).length === 0) {
      return data
    }

    return data.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true
        const itemValue = String(item[key] || '').toLowerCase()
        return itemValue.includes(value.toLowerCase())
      })
    })
  }, [data, filters, filtering])

  // Сортировка данных
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
      return 0
    })
  }, [filteredData, sortConfig])

  // Пагинация
  const paginatedData = useMemo(() => {
    if (!pagination.showPagination) return sortedData
    
    const startIndex = (currentPage - 1) * (pagination.pageSize || 20)
    const endIndex = startIndex + (pagination.pageSize || 20)
    return sortedData.slice(startIndex, endIndex)
  }, [sortedData, currentPage, pagination])

  const totalPages = Math.ceil(sortedData.length / (pagination.pageSize || 20))

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc'
        }
      }
      return { key, direction: 'asc' }
    })
  }

  const handleExport = () => {
    // Простой CSV экспорт
    const headers = columns.map(col => col.label).join(',')
    const rows = sortedData.map(item => 
      columns.map(col => {
        const value = item[col.key as keyof T]
        return typeof value === 'string' ? `"${value}"` : value
      }).join(',')
    ).join('\n')
    
    const csv = `${headers}\n${rows}`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'export.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className={clsx('table-container', className)}>
        <div className="animate-pulse p-6">
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Фильтры и экспорт */}
      {(filtering || exportable) && (
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            {filtering && (
              <div className="flex items-center space-x-2">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                {columns.filter(col => col.filterable).map(col => (
                  <input
                    key={String(col.key)}
                    type="text"
                    placeholder={`Фильтр по ${col.label}`}
                    value={filters[String(col.key)] || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, [String(col.key)]: e.target.value }))}
                    className="form-input text-sm w-40"
                  />
                ))}
              </div>
            )}
          </div>
          
          {exportable && (
            <button
              onClick={handleExport}
              className="btn-secondary text-sm"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
              Экспорт CSV
            </button>
          )}
        </div>
      )}

      {/* Таблица */}
      <div className="table-container">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="table-header">
            <tr>
              {columns.map(column => (
                <th
                  key={String(column.key)}
                  className={clsx(
                    'table-cell font-medium text-gray-900 cursor-pointer select-none',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.sortable && 'hover:bg-gray-100'
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(String(column.key))}
                >
                  <div className="flex items-center justify-between">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <div className="ml-2">
                        {sortConfig?.key === column.key ? (
                          sortConfig.direction === 'asc' ? (
                            <ChevronUpIcon className="h-4 w-4" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4" />
                          )
                        ) : (
                          <div className="h-4 w-4"></div>
                        )}
                      </div>
                    )}
                  </div>
                </th>
              ))}
              {actions.length > 0 && (
                <th className="table-cell font-medium text-gray-900 text-right">
                  Действия
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions.length > 0 ? 1 : 0)}
                  className="table-cell text-center text-gray-500 py-12"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  {columns.map(column => (
                    <td
                      key={String(column.key)}
                      className={clsx(
                        'table-cell',
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right'
                      )}
                    >
                      {column.render ? column.render(item) : String(item[column.key] || '')}
                    </td>
                  ))}
                  {actions.length > 0 && (
                    <td className="table-cell text-right">
                      <div className="flex justify-end space-x-2">
                        {actions
                          .filter(action => !action.condition || action.condition(item))
                          .map((action, actionIndex) => {
                            const IconComponent = action.icon
                            const isIconOnly = !action.label && IconComponent
                            
                            return (
                              <button
                                key={actionIndex}
                                onClick={() => action.action(item)}
                                disabled={action.loading}
                                title={action.tooltip || action.label}
                                className={clsx(
                                  'btn',
                                  isIconOnly ? 'p-1.5' : 'text-xs px-2 py-1',
                                  action.variant === 'primary' && 'btn-primary',
                                  action.variant === 'secondary' && 'btn-secondary',
                                  action.variant === 'success' && 'btn-success',
                                  action.variant === 'warning' && 'btn-warning',
                                  action.variant === 'danger' && 'btn-danger',
                                  action.variant === 'ghost' && 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border-0 bg-transparent',
                                  !action.variant && 'btn-secondary'
                                )}
                              >
                                {action.loading ? (
                                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                                ) : (
                                  <>
                                    {IconComponent && <IconComponent className={clsx('w-4 h-4', action.label && 'mr-1')} />}
                                    {action.label}
                                  </>
                                )}
                              </button>
                            )
                          })}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Пагинация */}
      {pagination.showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Показано {((currentPage - 1) * (pagination.pageSize || 20)) + 1} - {Math.min(currentPage * (pagination.pageSize || 20), sortedData.length)} из {sortedData.length}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              Назад
            </button>
            
            <span className="flex items-center px-3 py-2 text-sm text-gray-700">
              {currentPage} из {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              Вперед
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
