'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Отключаем статическую генерацию для этой страницы
export const dynamic = 'force-dynamic'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkingAuth, setCheckingAuth] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    checkExistingAuth()
  }, [])

  async function checkExistingAuth() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Пользователь уже авторизован, получаем его роль
        const { data: userData } = await supabase
          .from('users')
          .select('role, status')
          .eq('auth_id', user.id)
          .single()

        if (userData && userData.status === 'active') {
          // Редирект на соответствующий дашборд
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
            return
          }
        }
      }
    } catch (error) {
      console.error('Auth check error:', error)
    } finally {
      setCheckingAuth(false)
    }
  }
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error)
      }
      
      router.push(data.redirectUrl)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-semibold text-gray-700">Проверяем авторизацию...</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 p-8">
        <h1 className="text-2xl font-bold">Вход в систему</h1>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded">
            {error}
          </div>
        )}
        
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 border rounded"
          required
        />
        
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 border rounded"
          required
        />
        
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>
    </div>
  )
}
