'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    checkAuthAndRedirect()
  }, [])

  async function checkAuthAndRedirect() {
    try {
      // Проверяем авторизацию
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        // Пользователь не авторизован - редирект на логин
        router.push('/login')
        return
      }

      // Получаем роль пользователя
      const { data: userData, error } = await supabase
        .from('users')
        .select('role, status')
        .eq('auth_id', user.id)
        .single()

      if (error || !userData || userData.status !== 'active') {
        // Проблема с данными пользователя - редирект на логин
        await supabase.auth.signOut()
        router.push('/login')
        return
      }

      // Редирект по роли
      const roleRedirects = {
        junior: '/junior/dashboard',
        manager: '/manager/dashboard',
        hr: '/hr/dashboard',
        cfo: '/cfo/dashboard',
        admin: '/admin/dashboard',
        tester: '/tester/dashboard'
      }

      const redirectUrl = roleRedirects[userData.role as keyof typeof roleRedirects]
      if (redirectUrl) {
        router.push(redirectUrl)
      } else {
        // Неизвестная роль - редирект на логин
        await supabase.auth.signOut()
        router.push('/login')
      }
    } catch (error) {
      console.error('Auth check error:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-semibold text-gray-700">Загрузка...</h1>
          <p className="text-gray-500 mt-2">Проверяем авторизацию</p>
        </div>
      </div>
    )
  }

  // Этот компонент не должен отображаться, так как происходит редирект
  return null
}
