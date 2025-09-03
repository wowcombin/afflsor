import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить все выводы для проверки менеджером
export async function GET() {
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

    // Получаем выводы тестеров
    const { data: testWithdrawals, error: testError } = await supabase
      .from('test_withdrawals')
      .select(`
        *,
        work:casino_tests (
          id,
          deposit_amount,
          deposit_date,
          casino:casinos (
            id,
            name,
            company,
            url
          ),
          tester:users (
            id,
            first_name,
            last_name,
            email,
            telegram_username
          ),
          card:cards (
            id,
            card_number_mask,
            card_bin,
            status,
            card_type
          )
        )
      `)
      .order('created_at', { ascending: true })

    // Получаем выводы Junior
    const { data: juniorWithdrawals, error: juniorError } = await supabase
      .from('work_withdrawals')
      .select(`
        *,
        works!inner (
          id,
          deposit_amount,
          created_at,
          casinos!inner (
            id,
            name,
            company,
            url
          ),
          users!works_junior_id_fkey (
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
            status,
            card_type
          )
        )
      `)
      .order('created_at', { ascending: true })

    if (testError || juniorError) {
      console.error('Database error:', testError || juniorError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Объединяем и форматируем выводы
    const formattedTestWithdrawals = (testWithdrawals || []).map(w => ({
      ...w,
      source_type: 'tester',
      user_role: 'tester',
      user_name: w.work?.tester ? `${w.work.tester.first_name || ''} ${w.work.tester.last_name || ''}`.trim() : 'Unknown',
      user_email: w.work?.tester?.email || '',
      user_telegram: w.work?.tester?.telegram_username || '',
      deposit_amount: w.work?.deposit_amount || 0,
      deposit_date: w.work?.deposit_date || w.work?.created_at,
      casino_name: w.work?.casino?.name || 'Unknown',
      casino_company: w.work?.casino?.company || '',
      casino_url: w.work?.casino?.url || '',
      card_mask: w.work?.card?.card_number_mask || '',
      card_type: w.work?.card?.card_type || ''
    }))

    const formattedJuniorWithdrawals = (juniorWithdrawals || []).map(w => ({
      ...w,
      source_type: 'junior',
      user_role: 'junior',
      user_name: w.works?.users ? `${w.works.users.first_name || ''} ${w.works.users.last_name || ''}`.trim() : 'Unknown',
      user_email: w.works?.users?.email || '',
      user_telegram: w.works?.users?.telegram_username || '',
      deposit_amount: w.works?.deposit_amount || 0,
      deposit_date: w.works?.created_at,
      casino_name: w.works?.casinos?.name || 'Unknown',
      casino_company: w.works?.casinos?.company || '',
      casino_url: w.works?.casinos?.url || '',
      card_mask: w.works?.cards?.card_number_mask || '',
      card_type: w.works?.cards?.card_type || ''
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
