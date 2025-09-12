'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChartBarIcon,
  TrophyIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline'

interface ReportSection {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  color: string
}

export default function ManagerReportsPage() {
  const router = useRouter()

  const reportSections: ReportSection[] = [
    {
      title: 'Аналитика команды',
      description: 'Производительность TeamLead\'ов и Junior\'ов, тренды',
      icon: ChartBarIcon,
      href: '/dashboard/manager/analytics',
      color: 'bg-blue-50 border-blue-200 text-blue-700'
    },
    {
      title: 'Статистика',
      description: 'Детальная статистика работы, KPI и метрики',
      icon: TrophyIcon,
      href: '/dashboard/manager/statistics',
      color: 'bg-green-50 border-green-200 text-green-700'
    },
    {
      title: 'PayPal отчеты',
      description: 'Отчеты по PayPal операциям и балансам',
      icon: BanknotesIcon,
      href: '/dashboard/manager/paypal-reports',
      color: 'bg-purple-50 border-purple-200 text-purple-700'
    },
    {
      title: 'Задачи и проекты',
      description: 'Отчеты по выполнению задач и координации',
      icon: ClipboardDocumentListIcon,
      href: '/dashboard/manager/tasks',
      color: 'bg-orange-50 border-orange-200 text-orange-700'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ChartBarIcon className="h-8 w-8 text-gray-700" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Отчеты и аналитика</h1>
          <p className="text-gray-600">Комплексная аналитика работы команды и ресурсов</p>
        </div>
      </div>

      {/* Быстрая статистика */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center gap-4">
          <ChartBarIcon className="h-12 w-12 text-green-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Центр аналитики Manager</h3>
            <p className="text-gray-600">
              Все отчеты и аналитика для принятия управленческих решений
            </p>
          </div>
        </div>
      </div>

      {/* Разделы отчетов */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportSections.map((section) => (
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Возможности аналитики</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <h4 className="font-medium mb-2">🎯 Управленческая аналитика:</h4>
            <ul className="space-y-1 text-xs">
              <li>• Производительность TeamLead'ов</li>
              <li>• Эффективность Junior'ов</li>
              <li>• Тренды и прогнозы</li>
              <li>• KPI и метрики команды</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">💰 Финансовая отчетность:</h4>
            <ul className="space-y-1 text-xs">
              <li>• PayPal операции и балансы</li>
              <li>• Статистика выводов</li>
              <li>• Анализ прибыльности</li>
              <li>• Координация задач</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
