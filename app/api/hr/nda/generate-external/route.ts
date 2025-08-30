import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Проверка роли HR/Admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, role')
      .eq('auth_id', user.id)
      .single()

    if (!userData || !['hr', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { email, full_name } = body

    if (!email) {
      return NextResponse.json({ error: 'Email обязателен' }, { status: 400 })
    }

    // Проверяем, что пользователь с таким email не зарегистрирован в системе
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, status')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json({ 
        error: 'Пользователь с таким email уже зарегистрирован в системе. Используйте обычное создание NDA для зарегистрированных пользователей.' 
      }, { status: 400 })
    }

    // Проверяем, нет ли уже активного внешнего NDA запроса для этого email
    const { data: existingRequest } = await supabase
      .from('external_nda_requests')
      .select('id, token, expires_at')
      .eq('email', email)
      .eq('is_signed', false)
      .eq('is_revoked', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existingRequest) {
      return NextResponse.json({ 
        error: 'Для этого email уже есть активный NDA запрос',
        existing_token: existingRequest.token,
        existing_link: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/nda/${existingRequest.token}`
      }, { status: 400 })
    }

    // Получаем активный шаблон NDA
    const { data: template } = await supabase
      .from('nda_templates')
      .select('id, name, content, version')
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .single()

    if (!template) {
      return NextResponse.json({ error: 'Активный шаблон NDA не найден' }, { status: 500 })
    }

    // Генерируем уникальный токен
    const token = crypto.randomBytes(32).toString('hex')
    
    // Устанавливаем срок действия (7 дней)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Создаем внешний NDA запрос
    const { data: ndaRequest, error } = await supabase
      .from('external_nda_requests')
      .insert({
        token,
        email,
        full_name: full_name || null,
        template_id: template.id,
        expires_at: expiresAt.toISOString(),
        created_by: userData.id
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Формируем ссылку
    const link = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/nda/${token}`

    return NextResponse.json({
      success: true,
      link,
      token,
      expires_at: expiresAt.toISOString(),
      email,
      full_name: full_name || null,
      template: {
        name: template.name,
        version: template.version
      },
      request_id: ndaRequest.id
    })

  } catch (error) {
    console.error('External NDA generation API error:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 })
  }
}
