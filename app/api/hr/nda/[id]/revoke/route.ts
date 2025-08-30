import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const tokenId = params.id
    
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

    // Проверяем, что токен существует и не использован/отозван
    const { data: tokenData, error: tokenError } = await supabase
      .from('nda_tokens')
      .select(`
        id,
        token,
        user_id,
        is_used,
        is_revoked,
        expires_at,
        users!inner(first_name, last_name, email)
      `)
      .eq('id', tokenId)
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: 'NDA запрос не найден' }, { status: 404 })
    }

    if (tokenData.is_used) {
      return NextResponse.json({ error: 'Нельзя отозвать уже подписанный NDA' }, { status: 400 })
    }

    if (tokenData.is_revoked) {
      return NextResponse.json({ error: 'NDA запрос уже отозван' }, { status: 400 })
    }

    // Помечаем токен как отозванный
    const { error: revokeError } = await supabase
      .from('nda_tokens')
      .update({ 
        is_revoked: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', tokenId)

    if (revokeError) {
      return NextResponse.json({ error: revokeError.message }, { status: 500 })
    }

    // Получаем причину отзыва из тела запроса
    const body = await request.json()
    const revocationReason = body.revocation_reason || 'Отозван HR/Admin'

    // Логируем отзыв запроса
    try {
      await supabase
        .from('nda_revocation_log')
        .insert({
          token_id: tokenId,
          revoked_by: userData.id,
          revocation_reason: revocationReason,
          revoked_at: new Date().toISOString()
        })
    } catch (logError) {
      console.log('Revocation logging failed:', logError) // Не критично
    }

    const user_info = Array.isArray(tokenData.users) ? tokenData.users[0] : tokenData.users

    return NextResponse.json({
      success: true,
      message: `NDA запрос для ${user_info?.first_name} ${user_info?.last_name} отозван`,
      revoked_token: tokenData.token,
      user: {
        name: `${user_info?.first_name || ''} ${user_info?.last_name || ''}`.trim(),
        email: user_info?.email
      }
    })

  } catch (error) {
    console.error('NDA revocation API error:', error)
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 })
  }
}
