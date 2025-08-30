import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// POST - Создать внешний NDA запрос
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

    // Проверяем, что пользователь с таким email не зарегистрирован
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json({ 
        error: 'Пользователь с таким email уже зарегистрирован. Используйте обычное создание NDA.' 
      }, { status: 400 })
    }

    // Проверяем активные внешние запросы
    const { data: existingExternal } = await supabase
      .from('external_nda_requests')
      .select('id')
      .eq('email', email)
      .eq('is_signed', false)
      .eq('is_revoked', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existingExternal) {
      return NextResponse.json({ 
        error: 'Для этого email уже есть активный внешний NDA запрос' 
      }, { status: 400 })
    }

    // Получаем активный шаблон
    const { data: template } = await supabase
      .from('nda_templates')
      .select('id')
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .single()

    if (!template) {
      return NextResponse.json({ error: 'Активный шаблон NDA не найден' }, { status: 500 })
    }

    // Создаем внешний запрос
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { data: newRequest, error: createError } = await supabase
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

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    const link = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/nda/${token}`

    return NextResponse.json({
      success: true,
      request: newRequest,
      link,
      email,
      full_name: full_name || null
    })

  } catch (error) {
    console.error('Create external NDA request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
