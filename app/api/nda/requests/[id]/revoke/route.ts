import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST - Отозвать NDA запрос
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const requestId = params.id
    
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

    // Находим NDA запрос
    const { data: ndaRequest, error: findError } = await supabase
      .from('nda_tokens')
      .select('id, token, is_used, is_revoked')
      .eq('id', requestId)
      .single()

    if (findError || !ndaRequest) {
      return NextResponse.json({ error: 'NDA запрос не найден' }, { status: 404 })
    }

    // Проверки
    if (ndaRequest.is_used) {
      return NextResponse.json({ error: 'Нельзя отозвать уже подписанный NDA' }, { status: 400 })
    }

    if (ndaRequest.is_revoked) {
      return NextResponse.json({ error: 'NDA запрос уже отозван' }, { status: 400 })
    }

    // Отзываем запрос
    const { error: revokeError } = await supabase
      .from('nda_tokens')
      .update({ is_revoked: true })
      .eq('id', requestId)

    if (revokeError) {
      return NextResponse.json({ error: revokeError.message }, { status: 500 })
    }

    // Логируем отзыв (если таблица существует)
    try {
      await supabase
        .from('nda_revocation_log')
        .insert({
          token_id: requestId,
          revoked_by: userData.id,
          revocation_reason: 'Отозвано через интерфейс HR'
        })
    } catch (logError) {
      console.log('Revocation logging failed:', logError)
    }

    return NextResponse.json({
      success: true,
      message: 'NDA запрос успешно отозван'
    })

  } catch (error) {
    console.error('Revoke NDA request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
