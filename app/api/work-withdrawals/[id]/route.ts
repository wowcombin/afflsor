import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// DELETE - Удалить вывод
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
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

    if (!userData || userData.role !== 'junior') {
      return NextResponse.json({ error: 'Forbidden - только Junior могут удалять выводы' }, { status: 403 })
    }

    // Получаем информацию о выводе
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('work_withdrawals')
      .select(`
        id,
        status,
        works!inner(junior_id)
      `)
      .eq('id', withdrawalId)
      .single()

    if (withdrawalError || !withdrawal) {
      return NextResponse.json({ error: 'Вывод не найден' }, { status: 404 })
    }

    // Проверяем, что вывод принадлежит текущему пользователю
    const work = Array.isArray(withdrawal.works) ? withdrawal.works[0] : withdrawal.works
    if (work.junior_id !== userData.id) {
      return NextResponse.json({ error: 'Вы можете удалять только свои выводы' }, { status: 403 })
    }

    // Проверяем, что статус вывода "new"
    if (withdrawal.status !== 'new') {
      return NextResponse.json({ error: 'Можно удалять только выводы со статусом "Новый"' }, { status: 400 })
    }

    // Удаляем вывод
    const { error: deleteError } = await supabase
      .from('work_withdrawals')
      .delete()
      .eq('id', withdrawalId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Вывод успешно удален'
    })

  } catch (error) {
    console.error('Delete withdrawal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Изменить статус вывода (только Junior может менять свои выводы)
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

    const { data: userData } = await supabase
      .from('users')
      .select('id, role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData || userData.role !== 'junior') {
      return NextResponse.json({ error: 'Forbidden - только Junior могут изменять свои выводы' }, { status: 403 })
    }

    const body = await request.json()
    const { status: newStatus } = body

    // Валидация статуса
    const allowedStatuses = ['new', 'waiting', 'block']
    if (!allowedStatuses.includes(newStatus)) {
      return NextResponse.json({ 
        error: `Недопустимый статус. Разрешены: ${allowedStatuses.join(', ')}` 
      }, { status: 400 })
    }

    // Проверяем что вывод существует и принадлежит пользователю
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('work_withdrawals')
      .select(`
        id, 
        status, 
        work_id,
        works!inner(junior_id)
      `)
      .eq('id', withdrawalId)
      .eq('works.junior_id', userData.id)
      .single()

    if (withdrawalError || !withdrawal) {
      return NextResponse.json({ error: 'Вывод не найден или не принадлежит вам' }, { status: 404 })
    }

    // Проверяем что статус можно изменить
    if (withdrawal.status === 'received' || withdrawal.status === 'problem') {
      return NextResponse.json({ 
        error: 'Нельзя изменить статус уже обработанного вывода' 
      }, { status: 400 })
    }

    // Обновляем статус
    const { data: updatedWithdrawal, error: updateError } = await supabase
      .from('work_withdrawals')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', withdrawalId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Логируем изменение статуса
    await supabase
      .from('work_status_history')
      .insert({
        withdrawal_id: withdrawalId,
        work_id: withdrawal.work_id,
        old_status: withdrawal.status,
        new_status: newStatus,
        changed_by: userData.id,
        change_reason: `Junior изменил статус с "${withdrawal.status}" на "${newStatus}"`
      })

    return NextResponse.json({
      success: true,
      withdrawal: updatedWithdrawal,
      message: `Статус вывода изменен на "${newStatus}"`
    })

  } catch (error) {
    console.error('Update withdrawal status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
