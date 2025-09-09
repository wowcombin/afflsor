import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить всех пользователей
export async function GET() {
  try {
    const supabase = await createClient()

    // Проверка аутентификации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверка роли (Manager, HR, Admin)
    const { data: userData } = await supabase
      .from('users')
      .select('role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData || !['manager', 'hr', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Получаем всех пользователей с информацией о Team Lead
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        *,
        team_lead:team_lead_id (
          first_name,
          last_name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Users query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('Raw users count:', users?.length || 0)
    console.log('Sample user with team_lead:', users?.find(u => u.team_lead_id)?.team_lead)

    // Обрабатываем данные, добавляя team_lead_name
    const processedUsers = users.map(user => {
      const team_lead_name = user.team_lead
        ? `${user.team_lead.first_name || ''} ${user.team_lead.last_name || ''}`.trim() || user.team_lead.email
        : null

      if (user.role === 'junior' && user.team_lead_id) {
        console.log(`Junior ${user.email}: team_lead_id=${user.team_lead_id}, team_lead_name=${team_lead_name}`)
      }

      return {
        ...user,
        team_lead_name
      }
    })

    return NextResponse.json({ users: processedUsers })

  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Создать нового пользователя
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Проверка аутентификации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверка роли (Manager, HR, Admin)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, status')
      .eq('auth_id', user.id)
      .single()

    console.log('🔥 POST /api/users - НОВАЯ ВЕРСИЯ API - User data check:', { 
      userData, 
      userError: userError?.message,
      auth_id: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
      version: 'v2.1-fixed'
    })

    if (userError) {
      console.error('Error fetching user data:', userError)
      return NextResponse.json({ 
        error: 'User data access error', 
        details: userError.message,
        version: 'v2.1-fixed',
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    if (!userData) {
      console.error('User not found in users table:', user.id)
      return NextResponse.json({
        error: 'User not found in system',
        details: 'User exists in auth but not in users table'
      }, { status: 404 })
    }

    if (!['manager', 'hr', 'admin'].includes(userData.role)) {
      console.error('Insufficient permissions:', {
        role: userData.role,
        required: ['manager', 'hr', 'admin']
      })
      return NextResponse.json({
        error: 'Forbidden',
        details: `Role '${userData.role}' is not allowed to create users`
      }, { status: 403 })
    }

    if (userData.status !== 'active') {
      console.error('User not active:', { status: userData.status })
      return NextResponse.json({
        error: 'Account not active',
        details: `User status is '${userData.status}', must be 'active'`
      }, { status: 403 })
    }

    const body = await request.json()
    const {
      email,
      password,
      first_name,
      last_name,
      role,
      telegram_username,
      usdt_wallet,
      salary_percentage,
      salary_bonus
    } = body

    // Валидация
    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Email, пароль и роль обязательны' }, { status: 400 })
    }

    // Используем уже полученные данные пользователя (userData) вместо повторного запроса
    // Только Admin может создавать CEO и других Admin
    if ((role === 'ceo' || role === 'admin') && userData.role !== 'admin') {
      console.error('Insufficient permissions to create admin/ceo:', {
        creatorRole: userData.role,
        targetRole: role
      })
      return NextResponse.json({
        error: 'Только Admin может создавать пользователей с ролью CEO или Admin',
        details: `Current role '${userData.role}' cannot create role '${role}'`
      }, { status: 403 })
    }

    if (!['junior', 'manager', 'teamlead', 'tester', 'hr', 'cfo', 'admin', 'ceo', 'qa_assistant'].includes(role)) {
      return NextResponse.json({ error: 'Некорректная роль' }, { status: 400 })
    }

    // Создаем пользователя в Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authUser.user) {
      return NextResponse.json({ error: 'Ошибка создания аккаунта' }, { status: 500 })
    }

    // Создаем пользователя в нашей системе
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        auth_id: authUser.user.id,
        email,
        first_name: first_name || null,
        last_name: last_name || null,
        role,
        status: 'active',
        telegram_username: telegram_username || null,
        usdt_wallet: usdt_wallet || null,
        salary_percentage: salary_percentage || 0,
        salary_bonus: salary_bonus || 0
      })
      .select()
      .single()

    if (insertError) {
      // Если ошибка создания в нашей системе, удаляем из Auth
      await supabase.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      user: newUser,
      message: `Пользователь ${email} успешно создан`
    })

  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
