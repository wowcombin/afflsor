import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Публичные маршруты (не требуют аутентификации)
  const publicRoutes = [
    '/auth/login',
    '/auth/register',
    '/auth/reset-password',
    '/nda/sign',  // Страницы подписания NDA
    '/nda/success', // Страница успешного подписания
    '/api/nda/sign', // API для подписания NDA
    '/api/nda/files', // API для файлов NDA
    '/debug/auth-check', // Диагностическая страница
    '/debug/settings-test', // Тест настроек
    '/api/debug/auth-status', // Диагностический API
    '/api/debug/manager-test', // Тест Manager API
    '/api/debug/settings-test' // Тест Settings API
  ]
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Если пользователь не аутентифицирован и пытается попасть на защищенную страницу
  if (!user && !isPublicRoute) {
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Если пользователь аутентифицирован и пытается попасть на страницу входа
  if (user && pathname.startsWith('/auth/login')) {
    // Получаем роль пользователя
    const { data: userData } = await supabase
      .from('users')
      .select('role, status')
      .eq('auth_id', user.id)
      .single()

    if (userData && userData.status === 'active') {
      const roleRoutes = {
        junior: '/dashboard/junior',
        teamlead: '/dashboard/teamlead',
        manager: '/dashboard/manager',
        tester: '/dashboard/tester',
        hr: '/dashboard/hr',
        cfo: '/dashboard/cfo',
        admin: '/dashboard/admin',
        ceo: '/dashboard/admin',
        qa_assistant: '/dashboard/junior'
      }

      console.log('Redirecting user:', {
        email: user.email,
        role: userData.role,
        status: userData.status
      })

      const redirectPath = roleRoutes[userData.role as keyof typeof roleRoutes]

      if (!redirectPath) {
        console.error('Unknown role for redirect:', userData.role)
        return NextResponse.redirect(new URL('/dashboard/junior', request.url))
      }

      console.log('Redirect path:', redirectPath)
      return NextResponse.redirect(new URL(redirectPath, request.url))
    }
  }

  // Проверка доступа к ролевым маршрутам
  if (user && pathname.startsWith('/dashboard')) {
    // Если пользователь заходит на /dashboard напрямую, редиректим на его роль
    if (pathname === '/dashboard') {
      const { data: userData } = await supabase
        .from('users')
        .select('role, status')
        .eq('auth_id', user.id)
        .single()

      if (!userData || userData.status !== 'active') {
        const errorMessage = userData?.status === 'terminated' ? 'account_terminated' : 'account_disabled'
        return NextResponse.redirect(new URL(`/auth/login?error=${errorMessage}`, request.url))
      }

      const roleRoutes = {
        junior: '/dashboard/junior',
        teamlead: '/dashboard/teamlead',
        manager: '/dashboard/manager',
        tester: '/dashboard/tester',
        hr: '/dashboard/hr',
        cfo: '/dashboard/cfo',
        admin: '/dashboard/admin',
        ceo: '/dashboard/admin',
        qa_assistant: '/dashboard/junior'
      }

      const correctPath = roleRoutes[userData.role as keyof typeof roleRoutes] || '/dashboard/junior'
      console.log('Direct /dashboard access, redirecting:', { role: userData.role, path: correctPath })
      return NextResponse.redirect(new URL(correctPath, request.url))
    }

    // Универсальные страницы доступны всем аутентифицированным пользователям
    const universalPages = ['/dashboard/settings']
    const isUniversalPage = universalPages.some(page => pathname === page)

    if (isUniversalPage) {
      // Проверяем только что пользователь активен
      const { data: userData } = await supabase
        .from('users')
        .select('status')
        .eq('auth_id', user.id)
        .single()

      if (!userData || userData.status !== 'active') {
        const errorMessage = userData?.status === 'terminated' ? 'account_terminated' : 'account_disabled'
        return NextResponse.redirect(new URL(`/auth/login?error=${errorMessage}`, request.url))
      }

      return response
    }

    const roleFromPath = pathname.split('/')[2] // /dashboard/[role]/...

    if (roleFromPath) {
      const { data: userData } = await supabase
        .from('users')
        .select('role, status')
        .eq('auth_id', user.id)
        .single()

      if (!userData || userData.status !== 'active') {
        // Если пользователь уволен, показываем специальное сообщение
        const errorMessage = userData?.status === 'terminated' ? 'account_terminated' : 'account_disabled'
        return NextResponse.redirect(new URL(`/auth/login?error=${errorMessage}`, request.url))
      }

      // Admin имеет доступ ко всем разделам
      if (userData.role === 'admin') {
        return response
      }

      // Проверяем соответствие роли и маршрута
      if (userData.role !== roleFromPath) {
        const correctPath = `/dashboard/${userData.role}`
        return NextResponse.redirect(new URL(correctPath, request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
