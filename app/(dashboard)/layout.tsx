'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import SimpleHeader from '@/components/ui/SimpleHeader'
import RoleNavigation from '@/components/ui/RoleNavigation'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [userRole, setUserRole] = useState<'junior' | 'manager' | 'tester' | 'hr' | 'cfo' | 'admin' | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadUserRole()
    } else {
      setLoading(false)
    }
  }, [])

  async function loadUserRole() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('auth_id', user.id)
          .single()
        
        if (userData) {
          setUserRole(userData.role)
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки роли пользователя:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse">
          <div className="h-16 bg-white border-b border-gray-200"></div>
          <div className="h-12 bg-white border-b border-gray-200"></div>
        </div>
        <main className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SimpleHeader />
      {userRole && (
        <RoleNavigation userRole={userRole} />
      )}
      <main>
        {children}
      </main>
    </div>
  )
}
