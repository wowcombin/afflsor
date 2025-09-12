'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CreditCardIcon,
  BuildingLibraryIcon,
  BanknotesIcon,
  ChartBarIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline'

interface ToolSection {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  color: string
}

export default function ManagerToolsPage() {
  const router = useRouter()

  const toolSections: ToolSection[] = [
    {
      title: 'Управление картами',
      description: 'Назначение карт Junior\'ам, контроль балансов и статусов',
      icon: CreditCardIcon,
      href: '/dashboard/manager/cards',
      color: 'bg-blue-50 border-blue-200 text-blue-700'
    },
    {
      title: 'Банковские аккаунты',
      description: 'Управление банками, счетами и балансами',
      icon: BuildingLibraryIcon,
      href: '/dashboard/manager/banks',
      color: 'bg-green-50 border-green-200 text-green-700'
    },
    {
      title: 'PayPal аккаунты',
      description: 'Контроль PayPal аккаунтов и операций',
      icon: BanknotesIcon,
      href: '/dashboard/manager/paypal',
      color: 'bg-purple-50 border-purple-200 text-purple-700'
    },
    {
      title: 'PayPal отчеты',
      description: 'Детальные отчеты по PayPal операциям',
      icon: ChartBarIcon,
      href: '/dashboard/manager/paypal-reports',
      color: 'bg-orange-50 border-orange-200 text-orange-700'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <WrenchScrewdriverIcon className="h-8 w-8 text-gray-700" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Инструменты Manager</h1>
          <p className="text-gray-600">Управление картами, банками и PayPal аккаунтами</p>
        </div>
      </div>

      {/* Быстрая статистика */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center gap-4">
          <WrenchScrewdriverIcon className="h-12 w-12 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Центр управления ресурсами</h3>
            <p className="text-gray-600">
              Все инструменты для управления финансовыми ресурсами команды в одном месте
            </p>
          </div>
        </div>
      </div>

      {/* Разделы инструментов */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {toolSections.map((section) => (
          <div
            key={section.href}
            onClick={() => router.push(section.href)}
            className={`${section.color} border rounded-lg p-6 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105`}
          >
            <div className="flex items-start gap-4">
              <section.icon className="h-8 w-8 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold mb-2">{section.title}</h3>
                <p className="text-sm opacity-80">{section.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Дополнительная информация */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Возможности Manager</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <h4 className="font-medium mb-2">🎯 Управление ресурсами:</h4>
            <ul className="space-y-1 text-xs">
              <li>• Назначение карт TeamLead'ам и Junior'ам</li>
              <li>• Контроль банковских балансов</li>
              <li>• Управление PayPal аккаунтами</li>
              <li>• Мониторинг операций</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">📊 Контроль и отчетность:</h4>
            <ul className="space-y-1 text-xs">
              <li>• Детальные PayPal отчеты</li>
              <li>• Статистика использования карт</li>
              <li>• Анализ эффективности ресурсов</li>
              <li>• Финансовые сводки</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
