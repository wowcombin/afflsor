import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST - CFO добавляет комментарий к PayPal выводу
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    
    // Проверка аутентификации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверка роли CFO
    const { data: userData } = await supabase
      .from('users')
      .select('id, role, status, email')
      .eq('auth_id', user.id)
      .single()

    if (!userData || userData.role !== 'cfo' || userData.status !== 'active') {
      return NextResponse.json({ 
        error: 'Access denied',
        details: 'Только активные CFO могут комментировать PayPal выводы'
      }, { status: 403 })
    }

    const body = await request.json()
    const { comment, action = 'comment' } = body
    const withdrawalId = params.id

    if (!comment?.trim()) {
      return NextResponse.json({ 
        error: 'Комментарий обязателен',
        details: 'Введите комментарий'
      }, { status: 400 })
    }

    // Проверяем, что PayPal вывод существует
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('paypal_withdrawals')
      .select('id, withdrawal_amount, currency, status, user_id')
      .eq('id', withdrawalId)
      .single()

    if (withdrawalError || !withdrawal) {
      return NextResponse.json({ 
        error: 'PayPal вывод не найден',
        details: 'Указанный PayPal вывод не существует'
      }, { status: 404 })
    }

    // Определяем новый статус в зависимости от действия
    const newStatus = action === 'block' ? 'blocked' : withdrawal.status

    // Обновляем комментарий и статус
    const { data: updatedWithdrawal, error: updateError } = await supabase
      .from('paypal_withdrawals')
      .update({
        cfo_comment: comment.trim(),
        status: newStatus,
        checked_by_cfo: userData.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', withdrawalId)
      .select()
      .single()

    if (updateError) {
      console.error('CFO PayPal withdrawal comment error:', updateError)
      return NextResponse.json({ 
        error: 'Ошибка сохранения комментария',
        details: updateError.message
      }, { status: 500 })
    }

    // Логируем действие
    await supabase
      .from('action_history')
      .insert({
        user_id: userData.id,
        action_type: action === 'block' ? 'block' : 'comment',
        target_type: 'paypal_withdrawal',
        target_id: withdrawalId,
        description: `CFO ${action === 'block' ? 'заблокировал' : 'прокомментировал'} PayPal вывод на сумму ${withdrawal.withdrawal_amount} ${withdrawal.currency}. Комментарий: ${comment.trim()}`
      })

    console.log('✅ CFO commented on PayPal withdrawal:', {
      cfoEmail: userData.email,
      withdrawalId,
      action,
      amount: withdrawal.withdrawal_amount
    })

    return NextResponse.json({
      success: true,
      withdrawal: updatedWithdrawal,
      message: action === 'block' 
        ? 'PayPal вывод заблокирован' 
        : 'Комментарий к PayPal выводу добавлен'
    })

  } catch (error: any) {
    console.error('CFO PayPal withdrawal comment error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}
