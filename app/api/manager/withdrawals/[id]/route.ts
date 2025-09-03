import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// PATCH - Обновить статус вывода (одобрить/отклонить)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Проверка аутентификации и роли
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData || userData.status !== 'active' || userData.role !== 'manager') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { action, comment } = body
    const withdrawalId = params.id

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Сначала пробуем найти в work_withdrawals (Junior)
    let { data: withdrawal, error: fetchError } = await supabase
      .from('work_withdrawals')
      .select('id, status, work_id')
      .eq('id', withdrawalId)
      .single()

    let isJuniorWithdrawal = true
    let currentStatus = withdrawal?.status

    // Если не найден в work_withdrawals, ищем в test_withdrawals
    if (fetchError || !withdrawal) {
      const { data: testWithdrawal, error: testFetchError } = await supabase
        .from('test_withdrawals')
        .select('id, withdrawal_status, work_id')
        .eq('id', withdrawalId)
        .single()

      if (testFetchError || !testWithdrawal) {
        return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 })
      }

      // Приводим к общему формату
      withdrawal = {
        id: testWithdrawal.id,
        status: testWithdrawal.withdrawal_status, // Приводим к общему полю
        work_id: testWithdrawal.work_id
      }
      isJuniorWithdrawal = false
      currentStatus = testWithdrawal.withdrawal_status
    }

    // Проверяем статус (разные поля для разных таблиц)
    const pendingStatuses = isJuniorWithdrawal ? ['waiting', 'new'] : ['pending']
    if (!pendingStatuses.includes(currentStatus)) {
      return NextResponse.json({ 
        error: 'Withdrawal already processed',
        current_status: currentStatus 
      }, { status: 400 })
    }

    // Обновляем статус вывода (разные статусы для разных таблиц)
    let newStatus: string
    let updateData: any

    if (isJuniorWithdrawal) {
      // Для Junior withdrawals
      newStatus = action === 'approve' ? 'received' : 'block'
      updateData = {
        status: newStatus,
        updated_at: new Date().toISOString(),
        manager_notes: comment || null
      }

      const { error: updateError } = await supabase
        .from('work_withdrawals')
        .update(updateData)
        .eq('id', withdrawalId)

      if (updateError) {
        console.error('Update error:', updateError)
        return NextResponse.json({ error: 'Failed to update withdrawal' }, { status: 500 })
      }
    } else {
      // Для Tester withdrawals
      newStatus = action === 'approve' ? 'approved' : 'rejected'
      updateData = {
        withdrawal_status: newStatus,
        updated_at: new Date().toISOString(),
        notes: comment || null
      }

      const { error: updateError } = await supabase
        .from('test_withdrawals')
        .update(updateData)
        .eq('id', withdrawalId)

      if (updateError) {
        console.error('Update error:', updateError)
        return NextResponse.json({ error: 'Failed to update withdrawal' }, { status: 500 })
      }

      // Если одобрено, обновляем статус теста казино
      if (action === 'approve') {
        await supabase
          .from('casino_tests')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', withdrawal.work_id)
      }
    }

    // Логируем действие в историю
    await supabase
      .from('action_history')
      .insert({
        action_type: action,
        entity_type: isJuniorWithdrawal ? 'work_withdrawal' : 'test_withdrawal',
        entity_id: withdrawalId,
        change_description: `Manager ${action}d ${isJuniorWithdrawal ? 'junior' : 'tester'} withdrawal${comment ? `: ${comment}` : ''}`,
        performed_by: userData.id,
        new_values: { status: newStatus, comment }
      })

    // Здесь можно добавить уведомление junior'у
    // await sendNotificationToJunior(withdrawal.work_id, action, comment)

    return NextResponse.json({ 
      success: true, 
      message: `Withdrawal ${action}d successfully`,
      withdrawal_id: withdrawalId,
      new_status: newStatus
    })

  } catch (error) {
    console.error('Withdrawal update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Получить детали конкретного вывода
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Проверка аутентификации и роли
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData || userData.status !== 'active' || userData.role !== 'manager') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const withdrawalId = params.id

    // Получаем детальную информацию о выводе
    const { data: withdrawal, error } = await supabase
      .from('test_withdrawals')
      .select(`
        *,
        work:casino_tests (
          id,
          deposit_amount,
          deposit_date,
          test_result,
          status,
          notes,
          casino:casinos (
            id,
            name,
            company,
            url,
            currency,
            status
          ),
          tester:users (
            id,
            first_name,
            last_name,
            email,
            telegram_username,
            salary_percentage
          ),
          card:cards (
            id,
            card_number_mask,
            card_bin,
            status,
            card_type,
            daily_limit,
            bank_account:bank_accounts (
              id,
              holder_name,
              balance,
              currency,
              bank:banks (
                name,
                country
              )
            )
          )
        )
      `)
      .eq('id', withdrawalId)
      .single()

    if (error || !withdrawal) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 })
    }

    // Получаем историю действий с этим выводом
    const { data: history } = await supabase
      .from('action_history')
      .select(`
        *,
        performed_by_user:users (
          first_name,
          last_name,
          role
        )
      `)
      .eq('entity_id', withdrawalId)
      .eq('entity_type', 'test_withdrawal')
      .order('created_at', { ascending: false })

    // Получаем статистику junior'а с этим казино
    const { data: juniorStats } = await supabase
      .from('casino_tests')
      .select('test_result')
      .eq('tester_id', withdrawal.work?.tester?.id)
      .eq('casino_id', withdrawal.work?.casino?.id)

    const successRate = juniorStats ? 
      Math.round((juniorStats.filter(t => t.test_result === 'passed').length / juniorStats.length) * 100) : 0

    return NextResponse.json({ 
      success: true, 
      data: {
        ...withdrawal,
        history: history || [],
        junior_stats: {
          total_tests: juniorStats?.length || 0,
          success_rate: successRate,
          with_this_casino: juniorStats?.length || 0
        }
      }
    })

  } catch (error) {
    console.error('Withdrawal details error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
