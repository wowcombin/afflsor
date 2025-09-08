'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { 
  DocumentTextIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'

interface NDALayoutProps {
  children: React.ReactNode
}

export default function NDALayout({ children }: NDALayoutProps) {
  const router = useRouter()
  const pathname = usePathname()

  const menuItems = [
    {
      name: 'Обзор',
      href: '/dashboard/hr/nda',
      icon: ChartBarIcon,
      description: 'Статистика и общий обзор NDA'
    },
    {
      name: 'Соглашения',
      href: '/dashboard/hr/nda/agreements',
      icon: ClipboardDocumentListIcon,
      description: 'Все подписанные NDA соглашения'
    },
    {
      name: 'Создать NDA',
      href: '/dashboard/hr/nda/generate',
      icon: UserGroupIcon,
      description: 'Генерация ссылок для подписания'
    },
    {
      name: 'Шаблоны',
      href: '/dashboard/hr/nda/templates',
      icon: DocumentTextIcon,
      description: 'Управление шаблонами NDA'
    },
    {
      name: 'Настройки',
      href: '/dashboard/hr/nda/settings',
      icon: Cog6ToothIcon,
      description: 'Настройки системы NDA'
    }
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard/hr/nda') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и навигация назад */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Система NDA</h1>
          <p className="text-gray-600">Управление соглашениями о неразглашении</p>
        </div>
        <button 
          className="btn-secondary flex items-center"
          onClick={() => router.push('/dashboard/hr')}
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Назад в HR
        </button>
      </div>

      {/* Навигационное меню */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-gray-200">
          {menuItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <button
                key={item.name}
                onClick={() => router.push(item.href)}
                className={`p-6 text-left hover:bg-gray-50 transition-colors ${
                  active ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-center mb-3">
                  <Icon className={`w-6 h-6 mr-3 ${
                    active ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  <h3 className={`font-medium ${
                    active ? 'text-blue-900' : 'text-gray-900'
                  }`}>
                    {item.name}
                  </h3>
                </div>
                <p className={`text-sm ${
                  active ? 'text-blue-700' : 'text-gray-500'
                }`}>
                  {item.description}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Контент страницы */}
      <div>
        {children}
      </div>
    </div>
  )
}
