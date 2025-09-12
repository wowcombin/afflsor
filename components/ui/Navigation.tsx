'use client'

import { useRouter, usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { UserRole } from '@/types/database.types'
import {
  HomeIcon,
  UsersIcon,
  CreditCardIcon,
  BuildingLibraryIcon,
  ClockIcon,
  ChartBarIcon,
  BriefcaseIcon,
  BeakerIcon,
  ComputerDesktopIcon,
  BanknotesIcon,
  DocumentTextIcon,
  CogIcon,
  ClipboardDocumentListIcon,
  CommandLineIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  TrophyIcon,
  FolderIcon,
  DocumentDuplicateIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline'

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string | number
}

interface NavigationProps {
  userRole: UserRole
}

export default function Navigation({ userRole }: NavigationProps) {
  const router = useRouter()
  const pathname = usePathname()

  function getNavigationItems(): NavigationItem[] {
    const baseHref = `/dashboard/${userRole}`

    switch (userRole) {
      case 'junior':
        return [
          { name: 'Dashboard', href: baseHref, icon: HomeIcon },
          { name: 'Мои задачи', href: `${baseHref}/tasks`, icon: ClipboardDocumentListIcon },
          { name: 'Создать работу', href: `${baseHref}/work/new`, icon: BriefcaseIcon },
          { name: 'Мои работы', href: `${baseHref}/withdrawals`, icon: ClockIcon },
          { name: 'Платежные средства', href: `${baseHref}/payment-methods`, icon: CreditCardIcon },
          { name: 'Рейтинг', href: `${baseHref}/leaderboard`, icon: TrophyIcon },
          { name: 'Инструменты', href: `${baseHref}/tools`, icon: WrenchScrewdriverIcon },
          { name: 'Статистика', href: `${baseHref}/stats`, icon: ChartBarIcon },
          { name: 'Настройки', href: `${baseHref}/settings`, icon: CogIcon }
        ]

      case 'manager':
        return [
          { name: 'Dashboard', href: baseHref, icon: HomeIcon },
          { name: 'Очередь выводов', href: `${baseHref}/withdrawals`, icon: ClockIcon },
          { name: 'Команда', href: `${baseHref}/team`, icon: UsersIcon },
          { name: 'Карты', href: `${baseHref}/cards`, icon: CreditCardIcon },
          { name: 'Банки', href: `${baseHref}/banks`, icon: BuildingLibraryIcon },
          { name: 'PayPal аккаунты', href: `${baseHref}/paypal`, icon: CreditCardIcon },
          { name: 'PayPal отчеты', href: `${baseHref}/paypal-reports`, icon: ChartBarIcon },
          { name: 'Назначения', href: `${baseHref}/assignments`, icon: UsersIcon },
          { name: 'Задачи', href: `${baseHref}/tasks`, icon: ClipboardDocumentListIcon },
          { name: 'Аналитика', href: `${baseHref}/analytics`, icon: ChartBarIcon },
          { name: 'Статистика', href: `${baseHref}/statistics`, icon: TrophyIcon },
          { name: 'Настройки', href: '/dashboard/settings', icon: CogIcon }
        ]

      case 'tester':
        return [
          { name: 'Dashboard', href: baseHref, icon: HomeIcon },
          { name: 'Казино', href: `${baseHref}/casinos`, icon: ComputerDesktopIcon },
          { name: 'Тестовые работы', href: `${baseHref}/work`, icon: BeakerIcon },
          { name: 'Выводы', href: `${baseHref}/withdrawals`, icon: ClockIcon },
          { name: 'Карты', href: `${baseHref}/cards`, icon: CreditCardIcon },
          { name: 'PayPal тесты', href: `${baseHref}/paypal`, icon: CreditCardIcon },
          { name: 'QA задачи', href: `${baseHref}/tasks`, icon: ClipboardDocumentListIcon },
          { name: 'Мануалы', href: `${baseHref}/manuals`, icon: DocumentTextIcon },
          { name: 'Банки', href: `${baseHref}/banks`, icon: BuildingLibraryIcon },
          { name: 'История тестов', href: `${baseHref}/testing`, icon: ClockIcon },
          { name: 'Отчеты', href: `${baseHref}/reports`, icon: ChartBarIcon },
          { name: 'Настройки', href: '/dashboard/settings', icon: CogIcon }
        ]

      case 'hr':
        return [
          { name: 'Dashboard', href: baseHref, icon: HomeIcon },
          { name: 'Сотрудники', href: `${baseHref}/users`, icon: UsersIcon },
          { name: 'Чаты и созвоны', href: `${baseHref}/teams`, icon: ChatBubbleLeftRightIcon },
          { name: 'Структура', href: `${baseHref}/structure`, icon: UsersIcon },
          { name: 'NDA', href: `${baseHref}/nda`, icon: DocumentTextIcon },
          { name: 'HR задачи', href: `${baseHref}/tasks`, icon: ClipboardDocumentListIcon },
          { name: 'Шаблоны задач', href: `${baseHref}/task-templates`, icon: DocumentDuplicateIcon },
          { name: 'Контроль выводов', href: `${baseHref}/withdrawals-new`, icon: ExclamationTriangleIcon },
          { name: 'PayPal отчеты', href: `${baseHref}/paypal`, icon: CreditCardIcon },
          { name: 'Отчеты', href: `${baseHref}/reports`, icon: ChartBarIcon },
          { name: 'Банки', href: `${baseHref}/banks`, icon: BuildingLibraryIcon },
          { name: 'Настройки', href: '/dashboard/settings', icon: CogIcon }
        ]

      case 'cfo':
        return [
          { name: 'Dashboard', href: baseHref, icon: HomeIcon },
          { name: 'Зарплаты', href: `${baseHref}/salaries`, icon: BanknotesIcon },
          { name: 'Переводы', href: `${baseHref}/transfers`, icon: ClockIcon },
          { name: 'Контроль выводов', href: `${baseHref}/withdrawals-new`, icon: ExclamationTriangleIcon },
          { name: 'Расходы', href: `${baseHref}/expenses`, icon: ChartBarIcon },
          { name: 'Банки', href: `${baseHref}/banks`, icon: BuildingLibraryIcon },
          { name: 'Отчеты', href: `${baseHref}/reports`, icon: DocumentTextIcon },
          { name: 'Настройки', href: '/dashboard/settings', icon: CogIcon }
        ]

      case 'teamlead':
        return [
          { name: 'Dashboard', href: baseHref, icon: HomeIcon },
          { name: 'Управление задачами', href: `${baseHref}/tasks`, icon: ClipboardDocumentListIcon },
          { name: 'Kanban доска', href: `${baseHref}/kanban`, icon: ClipboardDocumentListIcon },
          { name: 'Моя команда', href: `${baseHref}/team`, icon: UsersIcon },
          { name: 'Выводы команды', href: `${baseHref}/withdrawals`, icon: BanknotesIcon },
          { name: 'Карты команды', href: `${baseHref}/cards`, icon: CreditCardIcon },
          { name: 'PayPal команды', href: `${baseHref}/paypal`, icon: CreditCardIcon },
          { name: 'Генератор данных', href: `${baseHref}/generator`, icon: CommandLineIcon },
          { name: 'Мои назначения', href: `${baseHref}/assignments`, icon: BuildingLibraryIcon },
          { name: 'Назначения казино', href: `${baseHref}/casino-assignments`, icon: ComputerDesktopIcon },
          { name: 'Настройки', href: '/dashboard/settings', icon: CogIcon }
        ]

      case 'admin':
        return [
          { name: 'Dashboard', href: baseHref, icon: HomeIcon },
          { name: 'Проекты', href: `${baseHref}/projects`, icon: FolderIcon },
          { name: 'OKR цели', href: `${baseHref}/okr`, icon: TrophyIcon },
          { name: 'Аналитика', href: `${baseHref}/analytics`, icon: ChartBarIcon },
          { name: 'Контроль выводов', href: `${baseHref}/withdrawals`, icon: ExclamationTriangleIcon },
          { name: 'Шаблоны задач', href: `${baseHref}/task-templates`, icon: DocumentDuplicateIcon },
          { name: 'Пользователи', href: '/dashboard/hr/users', icon: UsersIcon },
          { name: 'Финансы', href: '/dashboard/cfo', icon: BanknotesIcon },
          { name: 'Тестирование', href: '/dashboard/tester', icon: BeakerIcon },
          { name: 'Настройки', href: '/dashboard/settings', icon: CogIcon },
          { name: 'Аудит', href: `${baseHref}/audit`, icon: ClipboardDocumentListIcon }
        ]

      default:
        return [
          { name: 'Dashboard', href: baseHref, icon: HomeIcon }
        ]
    }
  }

  const navigationItems = getNavigationItems()

  return (
    <nav className="bg-white shadow-sm border-r border-gray-200 w-64 min-h-screen">
      <div className="p-6">
        <div className="flex items-center mb-8">
          <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center mr-3">
            <span className="text-sm font-bold text-white">A</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Afflsor ERP</h2>
            <p className="text-xs text-gray-500 capitalize">{userRole}</p>
          </div>
        </div>

        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

            return (
              <li key={item.href}>
                <button
                  onClick={() => router.push(item.href)}
                  className={clsx(
                    'w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary-100 text-primary-700 border border-primary-200'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <item.icon className={clsx(
                    'mr-3 h-5 w-5',
                    isActive ? 'text-primary-600' : 'text-gray-400'
                  )} />
                  <span className="flex-1 text-left">{item.name}</span>
                  {item.badge && (
                    <span className="ml-2 bg-primary-600 text-white text-xs rounded-full px-2 py-0.5">
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
