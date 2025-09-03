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

    console.log('Starting to fetch withdrawals...')
    
    // Сначала проверим базовые таблицы
    console.log('Checking basic tables...')
    
    // Проверяем test_withdrawals (простой запрос)
    const { data: testWithdrawalsBasic, error: testBasicError } = await supabase
      .from('test_withdrawals')
      .select('*')
      .limit(5)

    console.log('Basic test_withdrawals:', { 
      count: testWithdrawalsBasic?.length || 0, 
      error: testBasicError 
    })

    // Проверяем work_withdrawals (простой запрос)
    const { data: workWithdrawalsBasic, error: workBasicError } = await supabase
      .from('work_withdrawals')
      .select('*')
      .limit(5)

    console.log('Basic work_withdrawals:', { 
      count: workWithdrawalsBasic?.length || 0, 
      error: workBasicError 
    })

    // Если базовые запросы не работают, возвращаем ошибку
    if (testBasicError || workBasicError) {
      console.error('Basic table access failed:', { testBasicError, workBasicError })
      return NextResponse.json({ 
        error: 'Database table access error',
        details: {
          test_withdrawals_error: testBasicError,
          work_withdrawals_error: workBasicError
        }
      }, { status: 500 })
    }

    // Если базовые запросы работают, пробуем более сложные
    console.log('Basic queries successful, trying complex queries...')

    // Получаем выводы тестеров (упрощенный запрос)
    const { data: testWithdrawals, error: testError } = await supabase
      .from('test_withdrawals')
      .select('*')
      .order('created_at', { ascending: true })

    console.log('Test withdrawals result:', { 
      data: testWithdrawals?.length || 0, 
      error: testError 
    })

    // Получаем выводы Junior (упрощенный запрос)
    const { data: juniorWithdrawals, error: juniorError } = await supabase
      .from('work_withdrawals')
      .select('*')
      .order('created_at', { ascending: true })

    console.log('Junior withdrawals result:', { 
      data: juniorWithdrawals?.length || 0, 
      error: juniorError 
    })

    // Пустые массивы для пользователей (временно)
    let juniorUsers: any[] = []

    if (testError || juniorError) {
      console.error('Database error:', testError || juniorError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Упрощенное форматирование выводов (без связанных данных пока)
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
      card_mask: '****1234',
      card_type: 'Test Card'
    }))

    const formattedJuniorWithdrawals = (juniorWithdrawals || []).map(w => ({
      ...w,
      source_type: 'junior',
      user_role: 'junior',
      user_name: 'Junior User',
      user_email: 'junior@example.com',
      user_telegram: '',
      deposit_amount: 50,
      deposit_date: w.created_at,
      casino_name: 'Junior Casino',
      casino_company: 'Junior Company',
      casino_url: '',
      card_mask: '****5678',
      card_type: 'Junior Card'
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
