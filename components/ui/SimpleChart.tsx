'use client'
import { ReactNode } from 'react'

export interface ChartDataPoint {
  label: string
  value: number
  color?: string
}

export interface SimpleChartProps {
  title: string
  data: ChartDataPoint[]
  type?: 'bar' | 'line' | 'pie'
  height?: number
  showValues?: boolean
  className?: string
}

export default function SimpleChart({ 
  title, 
  data, 
  type = 'bar', 
  height = 200, 
  showValues = true,
  className = '' 
}: SimpleChartProps) {
  const maxValue = Math.max(...data.map(d => d.value))
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-gray-500'
  ]

  const renderBarChart = () => (
    <div className="flex items-end justify-between gap-2" style={{ height: `${height}px` }}>
      {data.map((point, index) => {
        const barHeight = maxValue > 0 ? (point.value / maxValue) * (height - 40) : 0
        const color = point.color || colors[index % colors.length]
        
        return (
          <div key={point.label} className="flex flex-col items-center flex-1">
            <div className="flex flex-col items-center justify-end flex-1">
              {showValues && point.value > 0 && (
                <div className="text-xs font-medium text-gray-600 mb-1">
                  {point.value.toLocaleString()}
                </div>
              )}
              <div
                className={`w-full ${color} rounded-t transition-all duration-500 ease-out`}
                style={{ height: `${barHeight}px`, minHeight: point.value > 0 ? '4px' : '0px' }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-2 text-center truncate w-full">
              {point.label}
            </div>
          </div>
        )
      })}
    </div>
  )

  const renderLineChart = () => {
    const points = data.map((point, index) => {
      const x = (index / (data.length - 1)) * 100
      const y = maxValue > 0 ? 100 - (point.value / maxValue) * 80 : 90
      return { x, y, ...point }
    })

    return (
      <div className="relative" style={{ height: `${height}px` }}>
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Линия */}
          <polyline
            fill="none"
            stroke="rgb(59, 130, 246)"
            strokeWidth="0.5"
            points={points.map(p => `${p.x},${p.y}`).join(' ')}
          />
          
          {/* Точки */}
          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="1"
              fill="rgb(59, 130, 246)"
            />
          ))}
        </svg>
        
        {/* Подписи */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between">
          {data.map((point, index) => (
            <div key={index} className="text-xs text-gray-500 text-center">
              {point.label}
            </div>
          ))}
        </div>
        
        {/* Значения */}
        {showValues && (
          <div className="absolute top-0 left-0 right-0 flex justify-between">
            {points.map((point, index) => (
              <div 
                key={index} 
                className="text-xs font-medium text-gray-600"
                style={{ 
                  position: 'absolute',
                  left: `${point.x}%`,
                  top: `${point.y - 10}%`,
                  transform: 'translateX(-50%)'
                }}
              >
                {point.value}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderPieChart = () => {
    const total = data.reduce((sum, point) => sum + point.value, 0)
    let currentAngle = 0
    
    const segments = data.map((point, index) => {
      const percentage = total > 0 ? (point.value / total) * 100 : 0
      const angle = (point.value / total) * 360
      const startAngle = currentAngle
      currentAngle += angle
      
      return {
        ...point,
        percentage,
        angle,
        startAngle,
        color: point.color || colors[index % colors.length]
      }
    })

    return (
      <div className="flex items-center gap-4">
        <div className="relative" style={{ width: height, height }}>
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {segments.map((segment, index) => {
              if (segment.value === 0) return null
              
              const radius = 40
              const centerX = 50
              const centerY = 50
              
              const startAngleRad = (segment.startAngle * Math.PI) / 180
              const endAngleRad = ((segment.startAngle + segment.angle) * Math.PI) / 180
              
              const x1 = centerX + radius * Math.cos(startAngleRad)
              const y1 = centerY + radius * Math.sin(startAngleRad)
              const x2 = centerX + radius * Math.cos(endAngleRad)
              const y2 = centerY + radius * Math.sin(endAngleRad)
              
              const largeArcFlag = segment.angle > 180 ? 1 : 0
              
              const pathData = [
                `M ${centerX} ${centerY}`,
                `L ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z'
              ].join(' ')
              
              return (
                <path
                  key={index}
                  d={pathData}
                  fill={segment.color.replace('bg-', '').replace('-500', '')}
                  className={segment.color}
                />
              )
            })}
          </svg>
        </div>
        
        <div className="flex-1">
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center gap-2 mb-2">
              <div className={`w-3 h-3 rounded-full ${segment.color}`} />
              <span className="text-sm text-gray-700">{segment.label}</span>
              <span className="text-sm font-medium text-gray-900 ml-auto">
                {segment.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white p-6 rounded-lg shadow-md border ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      
      {data.length === 0 ? (
        <div className="flex items-center justify-center text-gray-500" style={{ height: `${height}px` }}>
          <div className="text-center">
            <div className="text-2xl mb-2">📊</div>
            <div>Нет данных для отображения</div>
          </div>
        </div>
      ) : (
        <>
          {type === 'bar' && renderBarChart()}
          {type === 'line' && renderLineChart()}
          {type === 'pie' && renderPieChart()}
        </>
      )}
    </div>
  )
}
