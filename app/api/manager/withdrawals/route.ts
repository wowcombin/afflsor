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

    console.log('Starting step-by-step diagnosis...')

    // Шаг 1: Проверяем базовые таблицы
    console.log('Step 1: Checking basic tables...')
    
    const { data: testBasic, error: testBasicError } = await supabase
      .from('test_withdrawals')
      .select('*')
      .limit(3)

    console.log('test_withdrawals basic:', { 
      count: testBasic?.length || 0, 
      error: testBasicError?.message,
      sample: testBasic?.[0] 
    })

    const { data: workBasic, error: workBasicError } = await supabase
      .from('work_withdrawals')
      .select('*')
      .limit(3)

    console.log('work_withdrawals basic:', { 
      count: workBasic?.length || 0, 
      error: workBasicError?.message,
      sample: workBasic?.[0] 
    })

    // Если базовые запросы не работают, возвращаем ошибку
    if (testBasicError || workBasicError) {
      console.error('Basic queries failed:', { testBasicError, workBasicError })
      return NextResponse.json({ 
        error: 'Basic table access failed',
        details: {
          test_withdrawals: testBasicError?.message,
          work_withdrawals: workBasicError?.message
        }
      }, { status: 500 })
    }

    // Шаг 2: Проверяем связанные таблицы по отдельности
    console.log('Step 2: Checking related tables...')

    const { data: casinoTests, error: casinoTestsError } = await supabase
      .from('casino_tests')
      .select('*')
      .limit(3)

    console.log('casino_tests:', { 
      count: casinoTests?.length || 0, 
      error: casinoTestsError?.message 
    })

    const { data: works, error: worksError } = await supabase
      .from('works')
      .select('*')
      .limit(3)

    console.log('works:', { 
      count: works?.length || 0, 
      error: worksError?.message 
    })

    // Шаг 3: Простые join'ы
    console.log('Step 3: Simple joins...')

    let testWithdrawals = []
    let testError = null

    if (testBasic && testBasic.length > 0) {
      const { data: testJoin, error: testJoinError } = await supabase
        .from('test_withdrawals')
        .select(`
          *,
          casino_tests (
            id,
            deposit_amount,
            deposit_date
          )
        `)
        .limit(5)

      testWithdrawals = testJoin || []
      testError = testJoinError
      
      console.log('test_withdrawals with casino_tests:', { 
        count: testWithdrawals.length, 
        error: testError?.message 
      })
    }

    let juniorWithdrawals = []
    let juniorError = null

    if (workBasic && workBasic.length > 0) {
      const { data: juniorJoin, error: juniorJoinError } = await supabase
        .from('work_withdrawals')
        .select(`
          *,
          works (
            id,
            deposit_amount,
            created_at
          )
        `)
        .limit(5)

      juniorWithdrawals = juniorJoin || []
      juniorError = juniorJoinError
      
      console.log('work_withdrawals with works:', { 
        count: juniorWithdrawals.length, 
        error: juniorError?.message 
      })
    }

    if (testError || juniorError) {
      console.error('Database error:', testError || juniorError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    console.log('Step 4: Formatting data...')

    // Простое форматирование для диагностики
    const formattedTestWithdrawals = (testWithdrawals || []).map(w => {
      const test = w.casino_tests

      return {
        id: w.id,
        withdrawal_amount: w.withdrawal_amount || 0,
        status: w.status || 'new',
        created_at: w.created_at,
        source_type: 'tester',
        user_role: 'tester',
        user_name: 'Tester User',
        user_telegram: '@tester',
        user_rating: 8.5,
        deposit_amount: test?.deposit_amount || 0,
        deposit_date: test?.deposit_date || w.created_at,
        casino_name: 'Test Casino',
        casino_currency: 'USD',
        casino_promo: '',
        card_mask: '****1234',
        bank_account_holder: 'Test Account',
        profit: (w.withdrawal_amount || 0) - (test?.deposit_amount || 0),
        waiting_time: w.created_at
      }
    })

    const formattedJuniorWithdrawals = (juniorWithdrawals || []).map(w => {
      const work = w.works

      return {
        id: w.id,
        withdrawal_amount: w.withdrawal_amount || 0,
        status: w.status || 'new',
        created_at: w.created_at,
        source_type: 'junior',
        user_role: 'junior',
        user_name: 'Junior User',
        user_telegram: '@junior',
        user_rating: 7.2,
        deposit_amount: work?.deposit_amount || 0,
        deposit_date: work?.created_at || w.created_at,
        casino_name: 'Junior Casino',
        casino_currency: 'USD',
        casino_promo: '',
        casino_login: 'login123',
        casino_password: 'pass123',
        card_mask: '****5678',
        bank_account_holder: 'Junior Account',
        profit: (w.withdrawal_amount || 0) - (work?.deposit_amount || 0),
        waiting_time: w.created_at,
        work_status: work?.status || 'active'
      }
    })

    console.log('Formatted data:', {
      testCount: formattedTestWithdrawals.length,
      juniorCount: formattedJuniorWithdrawals.length
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
