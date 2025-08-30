import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить NDA по токену для отображения
export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = await createClient()
    const token = params.token

    // Сначала ищем во внутренних токенах
    const { data: internalToken } = await supabase
      .from('nda_tokens')
      .select(`
        id,
        expires_at,
        is_used,
        is_revoked,
        nda_templates!inner(id, name, content, version),
        users!inner(email, first_name, last_name)
      `)
      .eq('token', token)
      .single()

    if (internalToken) {
      // Проверки
      if (internalToken.is_used) {
        return NextResponse.json({ error: 'NDA уже подписан' }, { status: 400 })
      }
      if (internalToken.is_revoked) {
        return NextResponse.json({ error: 'NDA запрос отозван' }, { status: 400 })
      }
      if (new Date(internalToken.expires_at) <= new Date()) {
        return NextResponse.json({ error: 'Ссылка истекла' }, { status: 400 })
      }

      const template = Array.isArray(internalToken.nda_templates) 
        ? internalToken.nda_templates[0] 
        : internalToken.nda_templates
      const user = Array.isArray(internalToken.users) 
        ? internalToken.users[0] 
        : internalToken.users

      return NextResponse.json({
        type: 'internal',
        template: {
          name: template.name,
          content: template.content,
          version: template.version
        },
        user: {
          email: user.email,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email
        }
      })
    }

    // Ищем во внешних запросах
    const { data: externalToken } = await supabase
      .from('external_nda_requests')
      .select(`
        id,
        email,
        full_name,
        expires_at,
        is_signed,
        is_revoked,
        nda_templates!inner(id, name, content, version)
      `)
      .eq('token', token)
      .single()

    if (externalToken) {
      // Проверки
      if (externalToken.is_signed) {
        return NextResponse.json({ error: 'NDA уже подписан' }, { status: 400 })
      }
      if (externalToken.is_revoked) {
        return NextResponse.json({ error: 'NDA запрос отозван' }, { status: 400 })
      }
      if (new Date(externalToken.expires_at) <= new Date()) {
        return NextResponse.json({ error: 'Ссылка истекла' }, { status: 400 })
      }

      const template = Array.isArray(externalToken.nda_templates) 
        ? externalToken.nda_templates[0] 
        : externalToken.nda_templates

      return NextResponse.json({
        type: 'external',
        template: {
          name: template.name,
          content: template.content,
          version: template.version
        },
        user: {
          email: externalToken.email,
          name: externalToken.full_name || externalToken.email
        }
      })
    }

    return NextResponse.json({ error: 'NDA не найден' }, { status: 404 })

  } catch (error) {
    console.error('Get NDA by token error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Подписать NDA
export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = await createClient()
    const token = params.token
    const body = await request.json()
    const { full_name, passport_data, address, signature_data } = body

    if (!full_name) {
      return NextResponse.json({ error: 'Полное имя обязательно' }, { status: 400 })
    }

    // Получаем IP и User Agent
    const ip = request.headers.get('x-forwarded-for') || 
              request.headers.get('x-real-ip') || 
              '127.0.0.1'
    const userAgent = request.headers.get('user-agent') || ''

    // Ищем внутренний токен
    const { data: internalToken } = await supabase
      .from('nda_tokens')
      .select('id, user_id, template_id, is_used, is_revoked, expires_at')
      .eq('token', token)
      .single()

    if (internalToken) {
      // Проверки
      if (internalToken.is_used) {
        return NextResponse.json({ error: 'NDA уже подписан' }, { status: 400 })
      }
      if (internalToken.is_revoked) {
        return NextResponse.json({ error: 'NDA запрос отозван' }, { status: 400 })
      }
      if (new Date(internalToken.expires_at) <= new Date()) {
        return NextResponse.json({ error: 'Ссылка истекла' }, { status: 400 })
      }

      // Получаем email пользователя
      const { data: user } = await supabase
        .from('users')
        .select('email')
        .eq('id', internalToken.user_id)
        .single()

      // Подписываем
      const { error: signError } = await supabase
        .from('nda_signatures')
        .insert({
          token_id: internalToken.id,
          user_id: internalToken.user_id,
          template_id: internalToken.template_id,
          full_name,
          passport_data: passport_data || null,
          address: address || null,
          email: user?.email || '',
          ip_address: ip,
          user_agent: userAgent,
          signature_data: signature_data || null
        })

      if (signError) {
        return NextResponse.json({ error: signError.message }, { status: 500 })
      }

      // Помечаем токен как использованный
      await supabase
        .from('nda_tokens')
        .update({ is_used: true })
        .eq('id', internalToken.id)

      return NextResponse.json({
        success: true,
        message: 'NDA успешно подписан'
      })
    }

    // Ищем внешний токен
    const { data: externalToken } = await supabase
      .from('external_nda_requests')
      .select('id, email, template_id, is_signed, is_revoked, expires_at')
      .eq('token', token)
      .single()

    if (externalToken) {
      // Проверки
      if (externalToken.is_signed) {
        return NextResponse.json({ error: 'NDA уже подписан' }, { status: 400 })
      }
      if (externalToken.is_revoked) {
        return NextResponse.json({ error: 'NDA запрос отозван' }, { status: 400 })
      }
      if (new Date(externalToken.expires_at) <= new Date()) {
        return NextResponse.json({ error: 'Ссылка истекла' }, { status: 400 })
      }

      // Подписываем внешний NDA
      const { error: signError } = await supabase
        .from('external_nda_signatures')
        .insert({
          external_request_id: externalToken.id,
          template_id: externalToken.template_id,
          full_name,
          passport_data: passport_data || null,
          address: address || null,
          email: externalToken.email,
          ip_address: ip,
          user_agent: userAgent,
          signature_data: signature_data || null
        })

      if (signError) {
        return NextResponse.json({ error: signError.message }, { status: 500 })
      }

      // Помечаем как подписанный
      await supabase
        .from('external_nda_requests')
        .update({ is_signed: true })
        .eq('id', externalToken.id)

      return NextResponse.json({
        success: true,
        message: 'NDA успешно подписан'
      })
    }

    return NextResponse.json({ error: 'NDA не найден' }, { status: 404 })

  } catch (error) {
    console.error('Sign NDA error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
