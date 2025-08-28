import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set(name, value)
          response = NextResponse.next({
            request
          })
          response.cookies.set(name, value, options)
        },
        remove(name: string, options: any) {
          request.cookies.set(name, '')
          response = NextResponse.next({
            request
          })
          response.cookies.set(name, '', { ...options, maxAge: 0 })
        }
      }
    }
  )
  
  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname
  
  // Если пользователь авторизован и заходит на главную или логин - редирект на дашборд
  if (user && (pathname === '/' || pathname === '/login')) {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('role, status')
        .eq('auth_id', user.id)
        .single()

      if (userData && userData.status === 'active') {
        const roleRedirects: Record<string, string> = {
          junior: '/junior/dashboard',
          manager: '/manager/dashboard',
          hr: '/hr/dashboard',
          cfo: '/cfo/dashboard',
          admin: '/admin/dashboard',
          tester: '/tester/dashboard'
        }
        
        const redirectUrl = roleRedirects[userData.role]
        if (redirectUrl) {
          return NextResponse.redirect(new URL(redirectUrl, request.url))
        }
      }
    } catch (error) {
      console.error('User data fetch error:', error)
    }
  }
  
  // Защита dashboard роутов
  if (pathname.includes('/dashboard') || pathname.includes('/(dashboard)')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }
  
  return response
}

export const config = {
  matcher: ['/', '/login', '/(dashboard)/:path*', '/junior/:path*', '/manager/:path*', '/hr/:path*', '/cfo/:path*', '/admin/:path*', '/tester/:path*']
}
