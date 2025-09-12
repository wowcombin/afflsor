import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { notifyWithdrawalApproved, notifyWithdrawalBlocked } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

// POST - Проверить вывод (Manager)
export async function POST(
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

    const { data: userData } = await supabase
      .from('users')
      .select('id, role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData || !['teamlead', 'manager', 'hr', 'cfo', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden - недостаточно прав для проверки выводов' }, { status: 403 })
    }

    const body = await request.json()
    const { action, comment } = body

    // Валидация действия
    if (!['received', 'problem', 'block'].includes(action)) {
      return NextResponse.json({ error: 'Некорректное действие' }, { status: 400 })
    }

    // Используем обновленную функцию проверки
    const { data: result, error } = await supabase
      .rpc('check_withdrawal_safe_v3', {
        p_withdrawal_id: withdrawalId,
        p_checker_id: userData.id,
        p_new_status: action,
        p_comment: comment || null
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Получаем информацию о выводе для уведомлений
    const { data: withdrawalInfo } = await supabase
      .from('work_withdrawals')
      .select(`
        id,
        withdrawal_amount,
        works!inner(
          id,
          junior_id
        )
      `)
      .eq('id', withdrawalId)
      .single()

    // Отправляем уведомления
    if (withdrawalInfo && withdrawalInfo.works) {
      const juniorId = withdrawalInfo.works.junior_id
      const amount = withdrawalInfo.withdrawal_amount

      try {
        if (action === 'received') {
          await notifyWithdrawalApproved(
            juniorId,
            amount,
            'USD', // TODO: получить валюту из данных
            userData.id
          )
        } else if (action === 'block') {
          await notifyWithdrawalBlocked(
            juniorId,
            amount,
            'USD', // TODO: получить валюту из данных
            comment || 'Вывод заблокирован без указания причины',
            userData.id
          )
        }
      } catch (notificationError) {
        console.error('Failed to send withdrawal notification:', notificationError)
        // Не критично, продолжаем
      }
    }

    const actionLabels = {
      received: 'одобрен',
      problem: 'отмечен как проблемный',
      block: 'заблокирован'
    }

    return NextResponse.json({
      success: true,
      message: `Вывод ${actionLabels[action as keyof typeof actionLabels]}`
    })

  } catch (error) {
    console.error('Check withdrawal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
