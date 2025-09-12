'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandLineIcon,
  ClipboardDocumentListIcon,
  WrenchScrewdriverIcon,
  BuildingLibraryIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline'

interface ToolSection {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  action?: () => void
  color: string
}

export default function TeamLeadToolsPage() {
  const router = useRouter()
  const [generatedData, setGeneratedData] = useState('')
  const [generationType, setGenerationType] = useState<'username' | 'password' | 'email' | 'phone'>('username')
  const [count, setCount] = useState(5)
  const [textToFormat, setTextToFormat] = useState('')
  const [formattedText, setFormattedText] = useState('')

  // Генератор данных (как у Junior)
  const generateRandomData = () => {
    const results: string[] = []
    
    for (let i = 0; i < count; i++) {
      switch (generationType) {
        case 'username':
          const adjectives = ['Cool', 'Fast', 'Smart', 'Lucky', 'Brave', 'Quick', 'Strong', 'Wise']
          const nouns = ['Tiger', 'Eagle', 'Wolf', 'Lion', 'Bear', 'Fox', 'Hawk', 'Shark']
          const randomNum = Math.floor(Math.random() * 1000)
          results.push(`${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${randomNum}`)
          break
        case 'password':
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
          let password = ''
          for (let j = 0; j < 12; j++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length))
          }
          results.push(password)
          break
        case 'email':
          const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com']
          const names = ['john', 'jane', 'mike', 'sarah', 'alex', 'emma', 'david', 'lisa']
          const randomName = names[Math.floor(Math.random() * names.length)]
          const randomDomain = domains[Math.floor(Math.random() * domains.length)]
          const randomNum2 = Math.floor(Math.random() * 1000)
          results.push(`${randomName}${randomNum2}@${randomDomain}`)
          break
        case 'phone':
          const countryCode = '+1'
          const areaCode = Math.floor(Math.random() * 900) + 100
          const firstPart = Math.floor(Math.random() * 900) + 100
          const secondPart = Math.floor(Math.random() * 9000) + 1000
          results.push(`${countryCode}${areaCode}${firstPart}${secondPart}`)
          break
      }
    }
    
    setGeneratedData(results.join('\n'))
  }

  // Форматирование текста в нижний регистр
  const formatToLowercase = () => {
    setFormattedText(textToFormat.toLowerCase())
  }

  const toolSections: ToolSection[] = [
    {
      title: 'Управление задачами',
      description: 'Создание и делегирование задач Junior\'ам',
      icon: ClipboardDocumentListIcon,
      href: '/dashboard/teamlead/tasks',
      color: 'bg-blue-50 border-blue-200 text-blue-700'
    },
    {
      title: 'Kanban доска',
      description: 'Визуальное управление задачами команды',
      icon: ClipboardDocumentListIcon,
      href: '/dashboard/teamlead/kanban',
      color: 'bg-green-50 border-green-200 text-green-700'
    },
    {
      title: 'PayPal команды',
      description: 'Управление PayPal аккаунтами Junior\'ов',
      icon: CreditCardIcon,
      href: '/dashboard/teamlead/paypal',
      color: 'bg-purple-50 border-purple-200 text-purple-700'
    },
    {
      title: 'Мои назначения',
      description: 'Просмотр назначенных ресурсов и казино',
      icon: BuildingLibraryIcon,
      href: '/dashboard/teamlead/assignments',
      color: 'bg-orange-50 border-orange-200 text-orange-700'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <WrenchScrewdriverIcon className="h-8 w-8 text-gray-700" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Инструменты TeamLead</h1>
          <p className="text-gray-600">Генератор данных, управление задачами и ресурсами</p>
        </div>
      </div>

      {/* Генератор данных */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CommandLineIcon className="h-5 w-5" />
          Генератор данных
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Тип данных
                </label>
                <select
                  value={generationType}
                  onChange={(e) => setGenerationType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="username">Имена пользователей</option>
                  <option value="password">Пароли</option>
                  <option value="email">Email адреса</option>
                  <option value="phone">Номера телефонов</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Количество
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <button
                onClick={generateRandomData}
                className="btn-primary w-full"
              >
                Сгенерировать
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Результат
            </label>
            <textarea
              value={generatedData}
              readOnly
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-sm"
              placeholder="Сгенерированные данные появятся здесь..."
            />
          </div>
        </div>
      </div>

      {/* Форматирование текста */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Форматирование текста
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Исходный текст
            </label>
            <textarea
              value={textToFormat}
              onChange={(e) => setTextToFormat(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Введите текст для форматирования..."
            />
            <button
              onClick={formatToLowercase}
              className="btn-secondary mt-2"
            >
              Преобразовать в нижний регистр
            </button>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Отформатированный текст
            </label>
            <textarea
              value={formattedText}
              readOnly
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              placeholder="Результат форматирования..."
            />
          </div>
        </div>
      </div>

      {/* Дополнительные инструменты */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {toolSections.map((section) => (
          <div
            key={section.href || section.title}
            onClick={() => section.href && router.push(section.href)}
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

      {/* Информация */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🛠️ Возможности TeamLead</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <h4 className="font-medium mb-2">⚡ Генерация данных:</h4>
            <ul className="space-y-1 text-xs">
              <li>• Случайные имена пользователей</li>
              <li>• Безопасные пароли</li>
              <li>• Email адреса</li>
              <li>• Номера телефонов</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">📝 Управление командой:</h4>
            <ul className="space-y-1 text-xs">
              <li>• Создание и делегирование задач</li>
              <li>• Kanban доска для визуализации</li>
              <li>• Управление PayPal аккаунтами</li>
              <li>• Контроль назначений</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
