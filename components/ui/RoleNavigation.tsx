'use client'

import { useRouter, usePathname } from 'next/navigation'
import { 
  HomeIcon,
  BriefcaseIcon,
  ClipboardDocumentListIcon,
  UserIcon,
  UsersIcon,
  CreditCardIcon,
  ClockIcon,
  ChartBarIcon,
  DocumentTextIcon,
  BeakerIcon,
  ComputerDesktopIcon,
  BanknotesIcon,
  ArrowsRightLeftIcon,
  DocumentChartBarIcon,
  CogIcon,
  ShieldCheckIcon,
  EyeIcon,
  BuildingOfficeIcon,
  BuildingLibraryIcon
} from '@heroicons/react/24/outline'

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  current?: boolean
  badge?: number
}

interface RoleNavigationProps {
  userRole: 'junior' | 'manager' | 'tester' | 'hr' | 'cfo' | 'admin'
  className?: string
}

export default function RoleNavigation({ userRole, className = '' }: RoleNavigationProps) {
  const router = useRouter()
  const pathname = usePathname()

  function getNavigationItems(): NavigationItem[] {
    const baseHref = `/${userRole}`

    switch (userRole) {
      case 'junior':
        return [
          { name: 'Dashboard', href: `${baseHref}/dashboard`, icon: HomeIcon },
          { name: 'Work', href: `${baseHref}/work/new`, icon: BriefcaseIcon },
          { name: 'Tasks', href: `${baseHref}/tasks`, icon: ClipboardDocumentListIcon },
          { name: 'Profile', href: '/profile', icon: UserIcon }
        ]

      case 'manager':
        return [
          { name: 'Dashboard', href: `${baseHref}/dashboard`, icon: HomeIcon },
          { name: 'Workers', href: `${baseHref}/workers`, icon: UsersIcon },
          { name: 'Cards', href: `${baseHref}/cards`, icon: CreditCardIcon },
          { name: 'Banks', href: `${baseHref}/banks`, icon: BuildingLibraryIcon },
          { name: 'Withdrawals', href: `${baseHref}/withdrawals`, icon: ClockIcon },
          { name: 'Analytics', href: `${baseHref}/analytics`, icon: ChartBarIcon },
          { name: 'Tasks', href: `${baseHref}/tasks`, icon: ClipboardDocumentListIcon },
          { name: 'Manuals', href: `${baseHref}/manuals`, icon: DocumentTextIcon }
        ]

      case 'tester':
        return [
          { name: 'Dashboard', href: `${baseHref}/dashboard`, icon: HomeIcon },
          { name: 'Sites', href: `${baseHref}/casinos`, icon: ComputerDesktopIcon },
          { name: 'Testing', href: `${baseHref}/tests`, icon: BeakerIcon },
          { name: 'Cards', href: `${baseHref}/cards`, icon: CreditCardIcon },
          { name: 'Analytics', href: `${baseHref}/analytics`, icon: ChartBarIcon }
        ]

      case 'hr':
        return [
          { name: 'Dashboard', href: `${baseHref}/dashboard`, icon: HomeIcon },
          { name: 'Employees', href: `${baseHref}/users`, icon: UsersIcon },
          { name: 'Banks', href: `${baseHref}/banks`, icon: BuildingLibraryIcon },
          { name: 'Withdrawals', href: `${baseHref}/withdrawals`, icon: ClockIcon },
          { name: 'Comments', href: `${baseHref}/comments`, icon: DocumentChartBarIcon },
          { name: 'Analytics', href: `${baseHref}/analytics`, icon: ChartBarIcon }
        ]

      case 'cfo':
        return [
          { name: 'Dashboard', href: `${baseHref}/dashboard`, icon: HomeIcon },
          { name: 'Banks', href: `${baseHref}/banks`, icon: BuildingLibraryIcon },
          { name: 'Cards', href: `${baseHref}/cards`, icon: CreditCardIcon },
          { name: 'Expenses', href: `${baseHref}/expenses`, icon: BanknotesIcon },
          { name: 'Transfers', href: `${baseHref}/transfers`, icon: ArrowsRightLeftIcon },
          { name: 'Reports', href: `${baseHref}/reports`, icon: DocumentChartBarIcon }
        ]

      case 'admin':
        return [
          { name: 'Dashboard', href: `${baseHref}/dashboard`, icon: HomeIcon },
          { name: 'Users', href: '/hr/users', icon: UsersIcon },
          { name: 'Finance', href: '/cfo/dashboard', icon: BanknotesIcon },
          { name: 'Tester', href: '/tester/dashboard', icon: BeakerIcon },
          { name: 'Manager', href: '/manager/dashboard', icon: ClipboardDocumentListIcon },
          { name: 'Settings', href: `${baseHref}/settings`, icon: CogIcon }
        ]

      default:
        return []
    }
  }

  const navigationItems = getNavigationItems().map(item => ({
    ...item,
    current: pathname.startsWith(item.href)
  }))

  return (
    <nav className={`bg-white shadow-sm border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8 overflow-x-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.name}
                onClick={() => router.push(item.href)}
                className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  item.current
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {item.name}
                {item.badge && (
                  <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
