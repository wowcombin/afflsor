'use client'
import { useState, useMemo } from 'react'

export interface Column {
  key: string
  label: string
  width?: number
  sortable?: boolean
  filterable?: boolean
  align?: 'left' | 'center' | 'right'
  render?: (value: any, row: any) => React.ReactNode
  format?: 'currency' | 'date' | 'datetime' | 'number' | 'percentage'
}

export interface FilterConfig {
  type: 'select' | 'dateRange' | 'search' | 'number'
  key: string
  placeholder?: string
  options?: { value: string; label: string }[]
}

export interface PaginationConfig {
  pageSize: number
  pageSizes?: number[]
  showTotal?: boolean
}

export interface SelectionConfig {
  mode: 'single' | 'multiple'
  actions?: { label: string; action: (selected: any[]) => void }[]
}

export interface ActionConfig {
  label: string
  action: (row: any) => void
  variant?: 'primary' | 'secondary' | 'danger'
  condition?: (row: any) => boolean
}

export interface DataTableProps {
  columns: Column[]
  data: any[]
  filters?: FilterConfig[]
  sorting?: { key: string; direction: 'asc' | 'desc' }
  pagination?: PaginationConfig
  selection?: SelectionConfig
  actions?: ActionConfig[]
  export?: boolean
  loading?: boolean
  onRowClick?: (row: any) => void
}

export default function DataTable({
  columns,
  data,
  filters = [],
  sorting,
  pagination,
  selection,
  actions = [],
  export: enableExport = false,
  loading = false,
  onRowClick
}: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [sortConfig, setSortConfig] = useState(sorting || { key: '', direction: 'asc' })
  const [filterValues, setFilterValues] = useState<Record<string, any>>({})
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')

  // Фильтрация данных
  const filteredData = useMemo(() => {
    let filtered = [...data]

    // Поиск
    if (searchTerm) {
      filtered = filtered.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    // Фильтры
    Object.entries(filterValues).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        if (Array.isArray(value)) {
          filtered = filtered.filter(row => value.includes(row[key]))
        } else {
          filtered = filtered.filter(row => row[key] === value)
        }
      }
    })

    return filtered
  }, [data, searchTerm, filterValues])

  // Сортировка
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]

      if (aValue === bValue) return 0

      const result = aValue < bValue ? -1 : 1
      return sortConfig.direction === 'asc' ? result : -result
    })
  }, [filteredData, sortConfig])

  // Пагинация
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData

    const startIndex = (currentPage - 1) * pagination.pageSize
    return sortedData.slice(startIndex, startIndex + pagination.pageSize)
  }, [sortedData, currentPage, pagination])

  const totalPages = pagination ? Math.ceil(sortedData.length / pagination.pageSize) : 1

  // Обработчики
  const handleSort = (key: string) => {
    const column = columns.find(col => col.key === key)
    if (!column?.sortable) return

    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const handleSelectRow = (rowId: string) => {
    if (!selection) return

    const newSelected = new Set(selectedRows)
    if (selection.mode === 'single') {
      newSelected.clear()
      newSelected.add(rowId)
    } else {
      if (newSelected.has(rowId)) {
        newSelected.delete(rowId)
      } else {
        newSelected.add(rowId)
      }
    }
    setSelectedRows(newSelected)
  }

  const handleSelectAll = () => {
    if (!selection || selection.mode === 'single') return

    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(paginatedData.map((_, index) => String(index))))
    }
  }

  const formatValue = (value: any, format?: string) => {
    if (value === null || value === undefined) return '-'

    switch (format) {
      case 'currency':
        return `$${Number(value).toFixed(2)}`
      case 'percentage':
        return `${Number(value).toFixed(1)}%`
      case 'number':
        return Number(value).toLocaleString()
      case 'date':
        return new Date(value).toLocaleDateString('ru-RU')
      case 'datetime':
        return new Date(value).toLocaleString('ru-RU')
      default:
        return String(value)
    }
  }

  const exportData = () => {
    const csvContent = [
      columns.map(col => col.label).join(','),
      ...sortedData.map(row =>
        columns.map(col => {
          const value = row[col.key]
          return `"${formatValue(value, col.format)}"`
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `data-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Заголовок и действия */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            {/* Поиск */}
            {filters.some(f => f.type === 'search') && (
              <input
                type="text"
                placeholder="Поиск..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}

            {/* Фильтры */}
            {filters.filter(f => f.type !== 'search').map(filter => (
              <div key={filter.key}>
                {filter.type === 'select' && (
                  <select
                    value={filterValues[filter.key] || ''}
                    onChange={(e) => setFilterValues(prev => ({ ...prev, [filter.key]: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{filter.placeholder || 'Все'}</option>
                    {filter.options?.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            {/* Действия с выбранными */}
            {selection && selectedRows.size > 0 && selection.actions && (
              <div className="flex space-x-2">
                {selection.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      const selectedData = Array.from(selectedRows).map(id => paginatedData[parseInt(id)])
                      action.action(selectedData)
                    }}
                    className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
                  >
                    {action.label} ({selectedRows.size})
                  </button>
                ))}
              </div>
            )}

            {/* Экспорт */}
            {enableExport && (
              <button
                onClick={exportData}
                className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700"
              >
                Экспорт CSV
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Таблица */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {selection && (
                <th className="px-6 py-3 text-left">
                  {selection.mode === 'multiple' && (
                    <input
                      type="checkbox"
                      checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                  )}
                </th>
              )}
              {columns.map(column => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.align === 'center' ? 'text-center' :
                    column.align === 'right' ? 'text-right' : 'text-left'
                  } ${column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                  style={{ width: column.width }}
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <span className="text-gray-400">
                        {sortConfig.key === column.key ? (
                          sortConfig.direction === 'asc' ? '↑' : '↓'
                        ) : '↕'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {actions.length > 0 && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.map((row, index) => (
              <tr
                key={index}
                className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(row)}
              >
                {selection && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type={selection.mode === 'single' ? 'radio' : 'checkbox'}
                      checked={selectedRows.has(String(index))}
                      onChange={() => handleSelectRow(String(index))}
                      className="rounded border-gray-300"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                )}
                {columns.map(column => (
                  <td
                    key={column.key}
                    className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${
                      column.align === 'center' ? 'text-center' :
                      column.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {column.render
                      ? column.render(row[column.key], row)
                      : formatValue(row[column.key], column.format)
                    }
                  </td>
                ))}
                {actions.length > 0 && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {actions.map((action, actionIndex) => {
                        if (action.condition && !action.condition(row)) return null
                        
                        return (
                          <button
                            key={actionIndex}
                            onClick={(e) => {
                              e.stopPropagation()
                              action.action(row)
                            }}
                            className={`px-3 py-1 rounded text-sm ${
                              action.variant === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' :
                              action.variant === 'secondary' ? 'bg-gray-600 text-white hover:bg-gray-700' :
                              'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            {action.label}
                          </button>
                        )
                      })}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Пагинация */}
      {pagination && totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              {pagination.showTotal && (
                <span>
                  Показано {((currentPage - 1) * pagination.pageSize) + 1} - {Math.min(currentPage * pagination.pageSize, sortedData.length)} из {sortedData.length} записей
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Назад
              </button>
              
              {[...Array(totalPages)].map((_, i) => {
                const page = i + 1
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 2 && page <= currentPage + 2)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 border rounded-md ${
                        currentPage === page
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  )
                } else if (
                  page === currentPage - 3 ||
                  page === currentPage + 3
                ) {
                  return <span key={page} className="px-2">...</span>
                }
                return null
              })}

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Вперед
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
