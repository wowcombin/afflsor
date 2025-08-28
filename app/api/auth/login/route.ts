import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email, password } = await request.json()
  const supabase = await createClient()
  
  // Авторизация
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 401 })
  }
  
  // Получение роли пользователя
  const { data: user } = await supabase
    .from('users')
    .select('role, status')
    .eq('auth_id', authData.user.id)
    .single()
  
  if (!user || user.status !== 'active') {
    return NextResponse.json({ error: 'User not active' }, { status: 403 })
  }
  
  // Редирект по роли
  const redirectUrl = `/${user.role}/dashboard`
  
  return NextResponse.json({ 
    success: true, 
    role: user.role,
    redirectUrl 
  })
}
