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

    console.log('Fetching withdrawals with full data...')

    // Получаем выводы тестеров с полными данными
    const { data: testWithdrawals, error: testError } = await supabase
      .from('test_withdrawals')
      .select(`
        *,
        casino_tests!inner (
          id,
          deposit_amount,
          deposit_date,
          casinos!inner (
            id,
            name,
            company,
            url,
            currency,
            promo_link
          ),
          users!inner (
            id,
            first_name,
            last_name,
            email,
            telegram_username
          ),
          cards!inner (
            id,
            card_number_mask,
            card_bin,
            card_type,
            bank_accounts!inner (
              account_holder,
              banks!inner (
                name
              )
            )
          )
        )
      `)
      .order('created_at', { ascending: false })

    console.log('Test withdrawals result:', { 
      count: testWithdrawals?.length || 0, 
      error: testError 
    })

    // Получаем выводы Junior с полными данными
    const { data: juniorWithdrawals, error: juniorError } = await supabase
      .from('work_withdrawals')
      .select(`
        *,
        works!inner (
          id,
          deposit_amount,
          created_at,
          casino_login,
          casino_password,
          notes,
          work_date,
          status,
          casinos!inner (
            id,
            name,
            company,
            url,
            currency,
            promo_link
          ),
          users!inner (
            id,
            first_name,
            last_name,
            email,
            telegram_username
          ),
          cards!inner (
            id,
            card_number_mask,
            card_bin,
            card_type,
            bank_accounts!inner (
              account_holder,
              banks!inner (
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

    if (testError || juniorError) {
      console.error('Database error:', testError || juniorError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Форматируем выводы тестеров
    const formattedTestWithdrawals = (testWithdrawals || []).map(w => {
      const test = w.casino_tests
      const casino = test?.casinos
      const user = test?.users
      const card = test?.cards
      const bankAccount = card?.bank_accounts
      const bank = bankAccount?.banks

      return {
        ...w,
        source_type: 'tester',
        user_role: 'tester',
        user_name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Unknown',
        user_email: user?.email || '',
        user_telegram: user?.telegram_username || '',
        user_rating: 8.5, // Рейтинг эффективности по 10-бальной шкале
        deposit_amount: test?.deposit_amount || 0,
        deposit_date: test?.deposit_date || test?.created_at,
        casino_name: casino?.name || 'Unknown',
        casino_company: casino?.company || '',
        casino_url: casino?.url || '',
        casino_currency: casino?.currency || 'USD',
        casino_promo: casino?.promo_link || '',
        card_mask: card?.card_number_mask || '',
        card_type: card?.card_type || '',
        bank_name: bank?.name || '',
        bank_account_holder: bankAccount?.account_holder || '',
        profit: (w.withdrawal_amount || 0) - (test?.deposit_amount || 0),
        waiting_time: w.created_at // Время ожидания
      }
    })

    // Форматируем выводы Junior
    const formattedJuniorWithdrawals = (juniorWithdrawals || []).map(w => {
      const work = w.works
      const casino = work?.casinos
      const user = work?.users
      const card = work?.cards
      const bankAccount = card?.bank_accounts
      const bank = bankAccount?.banks

      return {
        ...w,
        source_type: 'junior',
        user_role: 'junior',
        user_name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Unknown',
        user_email: user?.email || '',
        user_telegram: user?.telegram_username || '',
        user_rating: 7.2, // Рейтинг эффективности по 10-бальной шкале
        deposit_amount: work?.deposit_amount || 0,
        deposit_date: work?.created_at,
        casino_name: casino?.name || 'Unknown',
        casino_company: casino?.company || '',
        casino_url: casino?.url || '',
        casino_currency: casino?.currency || 'USD',
        casino_promo: casino?.promo_link || '',
        casino_login: work?.casino_login || '',
        casino_password: work?.casino_password || '',
        card_mask: card?.card_number_mask || '',
        card_type: card?.card_type || '',
        bank_name: bank?.name || '',
        bank_account_holder: bankAccount?.account_holder || '',
        profit: (w.withdrawal_amount || 0) - (work?.deposit_amount || 0),
        waiting_time: w.created_at, // Время ожидания
        work_status: work?.status || 'active'
      }
    })

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
