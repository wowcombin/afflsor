import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = await createClient()
    const token = params.token
    
    // Получаем данные по токену
    const { data: tokenData, error: tokenError } = await supabase
      .from('nda_tokens')
      .select(`
        id,
        user_id,
        template_id,
        expires_at,
        is_used,
        users!inner(email, first_name, last_name),
        nda_templates!inner(name, content, version)
      `)
      .eq('token', token)
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: 'Недействительная ссылка NDA' }, { status: 404 })
    }

    // Определяем статус
    let status = 'valid'
    if (tokenData.is_used) {
      status = 'signed'
    } else if (new Date(tokenData.expires_at) < new Date()) {
      status = 'expired'
    }

    const user = Array.isArray(tokenData.users) ? tokenData.users[0] : tokenData.users
    const template = Array.isArray(tokenData.nda_templates) ? tokenData.nda_templates[0] : tokenData.nda_templates

    return NextResponse.json({
      token,
      status,
      expires_at: tokenData.expires_at,
      user: {
        email: user?.email || '',
        name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
      },
      template: {
        name: template?.name || '',
        content: template?.content || '',
        version: template?.version || 1
      }
    })

  } catch (error) {
    console.error('NDA token API error:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 })
  }
}
