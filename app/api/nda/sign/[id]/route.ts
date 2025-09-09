import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Используем service role для обхода RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    
    const agreementId = params.id

    console.log('NDA Sign GET API called:', { agreementId, hasToken: !!token })

    if (!token) {
      return NextResponse.json({ 
        error: 'Токен доступа обязателен' 
      }, { status: 400 })
    }

    // Получаем соглашение с шаблоном
    const { data: agreement, error: agreementError } = await supabase
      .from('nda_agreements')
      .select(`
        id,
        user_id,
        template_id,
        status,
        access_token,
        expires_at,
        full_name,
        email,
        nda_templates (
          id,
          name,
          content
        )
      `)
      .eq('id', agreementId)
      .single()

    if (agreementError || !agreement) {
      console.error('Agreement not found:', agreementError)
      return NextResponse.json({ 
        error: 'Соглашение не найдено' 
      }, { status: 404 })
    }

    // Проверяем токен
    if (agreement.access_token !== token) {
      return NextResponse.json({ 
        error: 'Неверный токен доступа' 
      }, { status: 403 })
    }

    // Проверяем срок действия
    if (agreement.expires_at && new Date(agreement.expires_at) < new Date()) {
      return NextResponse.json({ 
        error: 'Ссылка истекла' 
      }, { status: 410 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: agreement.id,
        full_name: agreement.full_name,
        email: agreement.email,
        status: agreement.status,
        template: agreement.nda_templates
      }
    })

  } catch (error) {
    console.error('NDA Sign GET API Error:', error)
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
