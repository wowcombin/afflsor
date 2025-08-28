import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  
  // Проверка роли
  const { data: { user } } = await supabase.auth.getUser()
  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', user?.id)
    .single()
    
  if (!currentUser || !['hr', 'admin'].includes(currentUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  const body = await request.json()
  
  // Генерация временного пароля
  const tempPassword = 'Temp' + Math.random().toString(36).slice(-8) + '!'
  
  // Создание auth пользователя
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: body.email,
    password: tempPassword,
    email_confirm: true
  })
  
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }
  
  // Создание записи в таблице users
  const { data: newUser, error: userError } = await supabase
    .from('users')
    .insert({
      auth_id: authData.user.id,
      email: body.email,
      role: body.role,
      first_name: body.first_name,
      last_name: body.last_name,
      telegram_username: body.telegram_username,
      usdt_wallet: body.usdt_wallet,
      salary_percentage: body.salary_percentage,
      salary_bonus: body.salary_bonus
    })
    .select()
    .single()
  
  if (userError) {
    // Откатить создание auth если ошибка
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: userError.message }, { status: 500 })
  }
  
  // Логирование в аудит
  await supabase.from('audit_log').insert({
    user_id: user?.id,
    action: 'CREATE_USER',
    table_name: 'users',
    record_id: newUser.id,
    new_values: { email: body.email, role: body.role }
  })
  
  // Генерация ссылки на NDA
  const ndaLink = `${process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000'}/nda/sign?token=${Buffer.from(newUser.id).toString('base64')}`
  
  return NextResponse.json({
    user: newUser,
    password: tempPassword,
    nda_link: ndaLink
  })
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role')
  const status = searchParams.get('status')
  
  // Проверка роли
  const { data: { user } } = await supabase.auth.getUser()
  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', user?.id)
    .single()
    
  if (!currentUser || !['hr', 'admin', 'manager'].includes(currentUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  let query = supabase.from('users').select('*')
  
  if (role) query = query.eq('role', role)
  if (status) query = query.eq('status', status)
  
  const { data, error } = await query.order('created_at', { ascending: false })
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(data)
}
