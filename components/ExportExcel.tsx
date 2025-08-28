'use client'

interface ExportExcelProps {
  data: any[]
  filename: string
  columns: {
    key: string
    label: string
    format?: 'currency' | 'percentage' | 'date' | 'number'
  }[]
  includeTotal?: boolean
}

export function ExportExcel({ 
  data, 
  filename, 
  columns, 
  includeTotal = false 
}: ExportExcelProps) {
  
  const exportToCSV = () => {
    if (!data || data.length === 0) {
      alert('Нет данных для экспорта')
      return
    }

    // Создать заголовки
    const headers = columns.map(col => col.label).join(',')
    
    // Создать строки данных
    const rows = data.map(item => {
      return columns.map(col => {
        const value = item[col.key]
        
        // Форматирование значений
        if (col.format === 'currency' && typeof value === 'number') {
          return value.toFixed(2)
        }
        if (col.format === 'percentage' && typeof value === 'number') {
          return value
        }
        if (col.format === 'date' && value) {
          return new Date(value).toISOString().split('T')[0]
        }
        
        // Экранирование запятых в строках
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`
        }
        
        return value ?? ''
      }).join(',')
    }).join('\n')
    
    // Добавить итоговую строку
    let totalRow = ''
    if (includeTotal) {
      totalRow = '\n' + columns.map((col, index) => {
        if (index === 0) return 'ИТОГО'
        
        // Суммировать числовые колонки
        if (col.format === 'currency' || col.format === 'number') {
          const sum = data.reduce((total, item) => {
            const val = item[col.key]
            return total + (typeof val === 'number' ? val : 0)
          }, 0)
          return col.format === 'currency' ? sum.toFixed(2) : sum
        }
        
        return ''
      }).join(',')
    }
    
    // Создать CSV content
    const csvContent = headers + '\n' + rows + totalRow
    
    // Создать blob и скачать
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Очистить URL
    URL.revokeObjectURL(url)
  }
  
  return (
    <button
      onClick={exportToCSV}
      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2"
      disabled={!data || data.length === 0}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Экспорт в Excel
    </button>
  )
}
