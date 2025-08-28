import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    console.log('Login attempt for:', email)
    
    const supabase = await createClient()
    
    // Авторизация
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (authError) {
      console.log('Auth error:', authError.message)
      return NextResponse.json({ error: authError.message }, { status: 401 })
    }
    
    console.log('Auth successful for user:', authData.user.id)
  
    // Получение роли пользователя
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role, status')
      .eq('auth_id', authData.user.id)
      .single()
    
    console.log('User lookup result:', user, userError)
    
    if (!user || user.status !== 'active') {
      console.log('User not found or inactive')
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 403 })
    }
    
    // Редирект по роли (admin идет на cfo dashboard)
    let redirectUrl = `/${user.role}/dashboard`
    if (user.role === 'admin') {
      redirectUrl = '/cfo/dashboard' // Админ получает доступ к CFO dashboard
    }
    
    return NextResponse.json({ 
      success: true, 
      role: user.role,
      redirectUrl 
    })
  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
