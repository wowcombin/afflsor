'use client'
import { ReactNode } from 'react'

export interface FormCardProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export default function FormCard({ title, description, children, className = '' }: FormCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        )}
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  )
}
