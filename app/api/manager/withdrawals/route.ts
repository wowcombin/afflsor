import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить все выводы для проверки менеджером
export async function GET() {
  try {
    console.log('=== Manager Withdrawals API Called ===')
    const supabase = await createClient()
    
    // Проверка аутентификации и роли
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('No authenticated user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Authenticated user ID:', user.id)

    const { data: userData } = await supabase
      .from('users')
      .select('role, status')
      .eq('auth_id', user.id)
      .single()

    console.log('User data:', userData)

    if (!userData || userData.status !== 'active' || userData.role !== 'manager') {
      console.log('Access denied for user:', userData)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    console.log('Starting to fetch withdrawals with full data...')

    // Получаем выводы Junior с полными данными
    const { data: juniorWithdrawals, error: juniorError } = await supabase
      .from('work_withdrawals')
      .select(`
        *,
        works!inner (
          id,
          junior_id,
          casino_id,
          card_id,
          deposit_amount,
          casino_login,
          casino_password,
          notes,
          work_date,
          users!works_junior_id_fkey (
            id,
            first_name,
            last_name,
            email,
            telegram_username
          ),
          casinos (
            id,
            name,
            company,
            currency,
            promo,
            url
          ),
          cards (
            id,
            card_number_mask,
            card_type,
            bank_account (
              id,
              holder_name,
              bank (
                id,
                name
              )
            )
          )
        )
      `)
      .order('created_at', { ascending: false })

    console.log('Junior withdrawals result:', { 
      count: juniorWithdrawals?.length || 0, 
      error: juniorError 
    })

    // Получаем выводы тестеров (пока оставляем упрощенными)
    const { data: testWithdrawals, error: testError } = await supabase
      .from('test_withdrawals')
      .select('*')
      .order('created_at', { ascending: false })

    console.log('Test withdrawals result:', { 
      count: testWithdrawals?.length || 0, 
      error: testError 
    })

    if (juniorError || testError) {
      console.error('Database error:', { juniorError, testError })
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Форматируем выводы Junior с реальными данными
    const formattedJuniorWithdrawals = (juniorWithdrawals || []).map(w => ({
      ...w,
      source_type: 'junior',
      user_role: 'junior',
      user_name: w.works?.users ? `${w.works.users.first_name || ''} ${w.works.users.last_name || ''}`.trim() : 'Junior User',
      user_email: w.works?.users?.email || 'junior@example.com',
      user_telegram: w.works?.users?.telegram_username || '',
      deposit_amount: w.works?.deposit_amount || 0,
      deposit_date: w.works?.work_date || w.created_at,
      casino_name: w.works?.casinos?.name || 'Unknown Casino',
      casino_company: w.works?.casinos?.company || 'Unknown Company',
      casino_url: w.works?.casinos?.promo || w.works?.casinos?.url || '',
      casino_currency: w.works?.casinos?.currency || 'USD',
      card_mask: w.works?.cards?.card_number_mask || '****0000',
      card_type: w.works?.cards?.card_type || 'Unknown Card',
      bank_name: w.works?.cards?.bank_account?.bank?.name || 'Unknown Bank',
      account_holder: w.works?.cards?.bank_account?.holder_name || 'Unknown Holder'
    }))

    // Форматируем выводы тестеров (упрощенно)
    const formattedTestWithdrawals = (testWithdrawals || []).map(w => ({
      ...w,
      source_type: 'tester',
      user_role: 'tester',
      user_name: 'Tester User',
      user_email: 'tester@example.com',
      user_telegram: '',
      deposit_amount: 100,
      deposit_date: w.created_at,
      casino_name: 'Test Casino',
      casino_company: 'Test Company',
      casino_url: '',
      casino_currency: 'USD',
      card_mask: '****1234',
      card_type: 'Test Card',
      bank_name: 'Test Bank',
      account_holder: 'Test Holder'
    }))

    // Объединяем все выводы и сортируем по дате
    const allWithdrawals = [...formattedTestWithdrawals, ...formattedJuniorWithdrawals]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    return NextResponse.json({ 
      success: true, 
      data: allWithdrawals,
      count: allWithdrawals.length,
      tester_count: formattedTestWithdrawals.length,
      junior_count: formattedJuniorWithdrawals.length
    })

  } catch (error) {
    console.error('Manager withdrawals error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Массовые операции с выводами
export async function POST(request: Request) {
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
    const { action, withdrawal_ids, comment, source_types } = body

    if (!action || !withdrawal_ids || !Array.isArray(withdrawal_ids)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    let newStatus: string
    switch (action) {
      case 'bulk_approve':
        newStatus = 'received'  // Для Junior используем 'received'
        break
      case 'bulk_reject':
        newStatus = 'block'     // Для Junior используем 'block'
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    let updatedCount = 0

    // Обновляем выводы тестеров (если есть)
    const testWithdrawalIds = withdrawal_ids.filter((_, index) => 
      source_types && source_types[index] === 'tester'
    )
    
    if (testWithdrawalIds.length > 0) {
      const testUpdateData = { 
        withdrawal_status: action === 'bulk_approve' ? 'approved' : 'rejected',
        updated_at: new Date().toISOString() 
      }
      
      const { error: testUpdateError } = await supabase
        .from('test_withdrawals')
        .update(testUpdateData)
        .in('id', testWithdrawalIds)

      if (testUpdateError) {
        console.error('Test withdrawals update error:', testUpdateError)
        return NextResponse.json({ error: 'Failed to update test withdrawals' }, { status: 500 })
      }
      updatedCount += testWithdrawalIds.length
    }

    // Обновляем выводы Junior (если есть)
    const juniorWithdrawalIds = withdrawal_ids.filter((_, index) => 
      !source_types || source_types[index] === 'junior'
    )
    
    if (juniorWithdrawalIds.length > 0) {
      const juniorUpdateData = { 
        status: newStatus,
        updated_at: new Date().toISOString() 
      }
      
      const { error: juniorUpdateError } = await supabase
        .from('work_withdrawals')
        .update(juniorUpdateData)
        .in('id', juniorWithdrawalIds)

      if (juniorUpdateError) {
        console.error('Junior withdrawals update error:', juniorUpdateError)
        return NextResponse.json({ error: 'Failed to update junior withdrawals' }, { status: 500 })
      }
      updatedCount += juniorWithdrawalIds.length
    }

    // Логируем действия
    for (let i = 0; i < withdrawal_ids.length; i++) {
      const withdrawalId = withdrawal_ids[i]
      const sourceType = source_types ? source_types[i] : 'junior'
      
      await supabase
        .from('action_history')
        .insert({
          action_type: action === 'bulk_approve' ? 'approve' : 'reject',
          entity_type: sourceType === 'tester' ? 'test_withdrawal' : 'work_withdrawal',
          entity_id: withdrawalId,
          change_description: `Manager ${action} ${sourceType} withdrawal${comment ? `: ${comment}` : ''}`,
          performed_by: userData.id
        })
    }

    return NextResponse.json({ 
      success: true, 
      message: `${updatedCount} withdrawals ${action === 'bulk_approve' ? 'approved' : 'rejected'}`,
      updated_count: updatedCount,
      test_updated: testWithdrawalIds.length,
      junior_updated: juniorWithdrawalIds.length
    })

  } catch (error) {
    console.error('Bulk withdrawals error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
