import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const token = params.token
    
    // Валидация данных
    const { full_name, passport, address, email, agreed } = body

    if (!agreed) {
      return NextResponse.json({ error: 'Необходимо согласиться с условиями' }, { status: 400 })
    }

    if (!full_name || !email) {
      return NextResponse.json({ error: 'Имя и email обязательны' }, { status: 400 })
    }

    // Проверяем токен
    const { data: tokenData, error: tokenError } = await supabase
      .from('nda_tokens')
      .select(`
        id,
        user_id,
        template_id,
        expires_at,
        is_used,
        nda_templates!inner(name, content, version)
      `)
      .eq('token', token)
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: 'Недействительная ссылка' }, { status: 404 })
    }

    if (tokenData.is_used) {
      return NextResponse.json({ error: 'Договор уже подписан' }, { status: 400 })
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Ссылка истекла' }, { status: 400 })
    }

    // Получаем IP адрес и User Agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Создаем подпись
    const signatureData = {
      full_name,
      passport,
      address,
      email,
      ip_address: ipAddress,
      user_agent: userAgent,
      signed_at: new Date().toISOString(),
      template_version: tokenData.nda_templates[0].version
    }

    // Сохраняем подпись
    const { data: signature, error: signatureError } = await supabase
      .from('nda_signatures')
      .insert({
        token_id: tokenData.id,
        user_id: tokenData.user_id,
        template_id: tokenData.template_id,
        full_name,
        passport_data: passport,
        address,
        email,
        ip_address: ipAddress,
        user_agent: userAgent,
        signature_data: signatureData
      })
      .select()
      .single()

    if (signatureError) {
      return NextResponse.json({ error: signatureError.message }, { status: 500 })
    }

    // Помечаем токен как использованный
    await supabase
      .from('nda_tokens')
      .update({ is_used: true })
      .eq('id', tokenData.id)

    // Обновляем статус пользователя (если нужно)
    await supabase
      .from('users')
      .update({ 
        updated_at: new Date().toISOString()
        // TODO: Добавить поле nda_signed_at если нужно
      })
      .eq('id', tokenData.user_id)

    return NextResponse.json({
      success: true,
      message: 'Договор NDA успешно подписан',
      signature_id: signature.id,
      signed_at: signature.signed_at,
      template: {
        name: tokenData.nda_templates[0].name,
        version: tokenData.nda_templates[0].version
      }
    })

  } catch (error) {
    console.error('NDA signing API error:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 })
  }
}
