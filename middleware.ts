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
  
  // Защита dashboard роутов
  if (request.nextUrl.pathname.startsWith('/(dashboard)')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }
  
  return response
}

export const config = {
  matcher: ['/(dashboard)/:path*']
}
