import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    // Проверка роли HR
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

    // Валидация данных
    const { user_id, template_id } = body

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Проверяем, что пользователь существует
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('id', user_id)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Получаем активный шаблон NDA
    let templateData
    if (template_id) {
      const { data: template, error: templateError } = await supabase
        .from('nda_templates')
        .select('*')
        .eq('id', template_id)
        .eq('is_active', true)
        .single()

      if (templateError || !template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }
      templateData = template
    } else {
      // Используем стандартный шаблон
      const { data: template, error: templateError } = await supabase
        .from('nda_templates')
        .select('*')
        .eq('name', 'Стандартный NDA')
        .eq('is_active', true)
        .single()

      if (templateError || !template) {
        return NextResponse.json({ error: 'Default template not found' }, { status: 404 })
      }
      templateData = template
    }

    // Проверяем, нет ли уже активного токена для этого пользователя
    const { data: existingToken } = await supabase
      .from('nda_tokens')
      .select('id, token, expires_at')
      .eq('user_id', user_id)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existingToken) {
      return NextResponse.json({
        success: true,
        message: 'Активная ссылка уже существует',
        token: existingToken.token,
        link: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://afflsor.vercel.app'}/nda/${existingToken.token}`,
        expires_at: existingToken.expires_at,
        existing: true
      })
    }

    // Генерируем новый токен
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Срок действия 7 дней

    // Создаем токен
    const { data: ndaToken, error: tokenError } = await supabase
      .from('nda_tokens')
      .insert({
        token,
        user_id,
        template_id: templateData.id,
        expires_at: expiresAt.toISOString(),
        created_by: userData.id
      })
      .select()
      .single()

    if (tokenError) {
      return NextResponse.json({ error: tokenError.message }, { status: 500 })
    }

    const ndaLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://afflsor.vercel.app'}/nda/${token}`

    return NextResponse.json({
      success: true,
      message: 'NDA ссылка создана успешно',
      token,
      link: ndaLink,
      expires_at: expiresAt.toISOString(),
      user: {
        email: targetUser.email,
        name: `${targetUser.first_name || ''} ${targetUser.last_name || ''}`.trim()
      },
      template: {
        name: templateData.name,
        version: templateData.version
      }
    })

  } catch (error) {
    console.error('NDA generation API error:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 })
  }
}
