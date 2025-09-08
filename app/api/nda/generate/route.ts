import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// POST - Генерировать NDA для пользователя
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверка роли (HR, Admin)
    const { data: userData } = await supabase
      .from('users')
      .select('id, role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData || !['hr', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      user_id, 
      template_id, 
      full_name, 
      email, 
      expires_in_days = 30 
    } = body

    if (!template_id || !full_name || !email) {
      return NextResponse.json({ 
        error: 'template_id, full_name, and email are required' 
      }, { status: 400 })
    }

    // Проверяем существование пользователя (опционально)
    let targetUser = null
    if (user_id) {
      const { data } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .eq('id', user_id)
        .single()
      
      targetUser = data
    }

    // Проверяем шаблон
    const { data: template } = await supabase
      .from('nda_templates')
      .select('*')
      .eq('id', template_id)
      .eq('is_active', true)
      .single()

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Создаем NDA соглашение
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expires_in_days)

    const { data: agreement, error } = await supabase
      .from('nda_agreements')
      .insert({
        user_id,
        template_id,
        full_name,
        email,
        status: 'pending',
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Генерируем уникальную ссылку для подписания
    const signToken = crypto.randomBytes(32).toString('hex')
    
    // Определяем базовый URL для продакшена или разработки
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://afflsor.com'
    
    const signUrl = `${baseUrl}/nda/sign/${agreement.id}?token=${signToken}`

    // Сохраняем токен доступа
    await supabase
      .from('nda_agreements')
      .update({ 
        access_token: signToken
      })
      .eq('id', agreement.id)

    return NextResponse.json({ 
      success: true, 
      data: {
        agreement_id: agreement.id,
        sign_url: signUrl,
        expires_at: expiresAt
      }
    })

  } catch (error) {
    console.error('Generate NDA error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
