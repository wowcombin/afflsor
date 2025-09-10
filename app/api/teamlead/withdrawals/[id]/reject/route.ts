import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// PATCH - Отклонить вывод (Team Lead)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const withdrawalId = params.id

    // Проверка аутентификации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверка роли Team Lead
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role, status, email')
      .eq('auth_id', user.id)
      .single()

    if (userError || !userData || userData.role !== 'teamlead' || userData.status !== 'active') {
      return NextResponse.json({ 
        error: 'Access denied',
        details: 'Только активные Team Lead могут отклонять выводы'
      }, { status: 403 })
    }

    const body = await request.json()
    const { comment } = body

    // Комментарий обязателен при отклонении
    if (!comment || !comment.trim()) {
      return NextResponse.json({ 
        error: 'Комментарий обязателен',
        details: 'При отклонении вывода необходимо указать причину'
      }, { status: 400 })
    }

    // Получаем информацию о выводе
    const { data: withdrawal, error: getError } = await supabase
      .from('withdrawals')
      .select(`
        id,
        user_id,
        amount,
        currency,
        status
      `)
      .eq('id', withdrawalId)
      .single()

    if (getError || !withdrawal) {
      return NextResponse.json({ 
        error: 'Вывод не найден',
        details: getError?.message 
      }, { status: 404 })
    }

    // Получаем информацию о пользователе отдельно
    const { data: withdrawalUser, error: userGetError } = await supabase
      .from('users')
      .select('team_lead_id, email, first_name, last_name, role')
      .eq('id', withdrawal.user_id)
      .single()

    if (userGetError || !withdrawalUser) {
      return NextResponse.json({ 
        error: 'Пользователь не найден',
        details: userGetError?.message 
      }, { status: 404 })
    }

    // Проверяем, что это вывод от Junior из команды этого Team Lead
    if (withdrawalUser.team_lead_id !== userData.id || withdrawalUser.role !== 'junior') {
      return NextResponse.json({ 
        error: 'Access denied',
        details: 'Вы можете отклонять только выводы своих Junior сотрудников'
      }, { status: 403 })
    }

    if (withdrawal.status !== 'pending') {
      return NextResponse.json({ 
        error: 'Вывод уже обработан',
        details: `Статус вывода: ${withdrawal.status}`
      }, { status: 400 })
    }

    // Отклоняем вывод
    const { error: updateError } = await supabase
      .from('withdrawals')
      .update({
        status: 'rejected',
        manager_comment: `Отклонено Team Lead ${userData.email}: ${comment.trim()}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', withdrawalId)

    if (updateError) {
      console.error('Withdrawal rejection error:', updateError)
      return NextResponse.json({ 
        error: 'Ошибка отклонения вывода',
        details: updateError.message 
      }, { status: 500 })
    }

    console.log('❌ Withdrawal rejected by Team Lead:', {
      withdrawalId,
      teamLeadEmail: userData.email,
      juniorEmail: withdrawalUser.email,
      amount: withdrawal.amount,
      currency: withdrawal.currency,
      reason: comment.trim()
    })

    return NextResponse.json({
      success: true,
      message: 'Вывод успешно отклонен'
    })

  } catch (error: any) {
    console.error('Team Lead reject withdrawal error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}
