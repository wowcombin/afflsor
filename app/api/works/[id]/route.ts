import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// DELETE - Удалить работу
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const workId = params.id
    
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
      return NextResponse.json({ error: 'Forbidden - только Junior могут удалять свои работы' }, { status: 403 })
    }

    // Проверяем что работа существует и принадлежит пользователю
    const { data: work, error: workError } = await supabase
      .from('works')
      .select('id, status, junior_id, casino_id, deposit_amount')
      .eq('id', workId)
      .eq('junior_id', userData.id)
      .single()

    if (workError || !work) {
      return NextResponse.json({ error: 'Работа не найдена или не принадлежит вам' }, { status: 404 })
    }

    // Проверяем что работу можно удалить (только активные работы без выводов)
    const { data: withdrawals, error: withdrawalsError } = await supabase
      .from('work_withdrawals')
      .select('id, status')
      .eq('work_id', workId)

    if (withdrawalsError) {
      return NextResponse.json({ error: 'Ошибка проверки выводов' }, { status: 500 })
    }

    // Нельзя удалить работу с выводами в статусе received или waiting
    const hasActiveWithdrawals = withdrawals?.some(w => ['received', 'waiting'].includes(w.status))
    if (hasActiveWithdrawals) {
      return NextResponse.json({ 
        error: 'Нельзя удалить работу с активными или завершенными выводами' 
      }, { status: 400 })
    }

    // Удаляем все связанные выводы (каскадное удаление должно работать, но на всякий случай)
    if (withdrawals && withdrawals.length > 0) {
      await supabase
        .from('work_withdrawals')
        .delete()
        .eq('work_id', workId)
    }

    // Удаляем работу
    const { error: deleteError } = await supabase
      .from('works')
      .delete()
      .eq('id', workId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Работа успешно удалена'
    })

  } catch (error) {
    console.error('Delete work error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Изменить статус работы
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const workId = params.id
    
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
      return NextResponse.json({ error: 'Forbidden - только Junior могут изменять свои работы' }, { status: 403 })
    }

    const body = await request.json()
    const { status: newStatus } = body

    // Валидация статуса
    const allowedStatuses = ['active', 'completed', 'cancelled', 'blocked']
    if (!allowedStatuses.includes(newStatus)) {
      return NextResponse.json({ 
        error: `Недопустимый статус. Разрешены: ${allowedStatuses.join(', ')}` 
      }, { status: 400 })
    }

    // Проверяем что работа существует и принадлежит пользователю
    const { data: work, error: workError } = await supabase
      .from('works')
      .select('id, status, junior_id')
      .eq('id', workId)
      .eq('junior_id', userData.id)
      .single()

    if (workError || !work) {
      return NextResponse.json({ error: 'Работа не найдена или не принадлежит вам' }, { status: 404 })
    }

    // Проверяем бизнес-логику изменения статуса
    if (work.status === 'completed' && newStatus !== 'completed') {
      return NextResponse.json({ 
        error: 'Нельзя изменить статус завершенной работы' 
      }, { status: 400 })
    }

    // Если меняем на completed, проверяем что есть хотя бы один полученный вывод
    if (newStatus === 'completed') {
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from('work_withdrawals')
        .select('id, status')
        .eq('work_id', workId)
        .eq('status', 'received')

      if (withdrawalsError) {
        return NextResponse.json({ error: 'Ошибка проверки выводов' }, { status: 500 })
      }

      if (!withdrawals || withdrawals.length === 0) {
        return NextResponse.json({ 
          error: 'Нельзя завершить работу без полученных выводов' 
        }, { status: 400 })
      }
    }

    // Обновляем статус
    const { data: updatedWork, error: updateError } = await supabase
      .from('works')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', workId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Логируем изменение статуса
    await supabase
      .from('work_status_history')
      .insert({
        work_id: workId,
        old_status: work.status,
        new_status: newStatus,
        changed_by: userData.id,
        change_reason: `Junior изменил статус работы с "${work.status}" на "${newStatus}"`
      })

    return NextResponse.json({
      success: true,
      work: updatedWork,
      message: `Статус работы изменен на "${newStatus}"`
    })

  } catch (error) {
    console.error('Update work status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
