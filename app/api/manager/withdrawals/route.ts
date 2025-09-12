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
      .select('id, role, status')
      .eq('auth_id', user.id)
      .single()

    console.log('User data:', userData)

    if (!userData || userData.status !== 'active') {
      console.log('User not found or inactive:', userData)
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 403 })
    }

    // Проверка роли (расширяем доступ)
    const allowedRoles = ['manager', 'teamlead', 'hr', 'admin', 'cfo', 'tester']
    if (!allowedRoles.includes(userData.role)) {
      console.log('Access denied for role:', userData.role)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    console.log('Starting to fetch withdrawals with full data...')

    // Определяем доступных Junior'ов в зависимости от роли
    let teamJuniorIds: string[] = []

    if (userData.role === 'teamlead') {
      // Team Lead видит только своих Junior'ов
      const { data: teamJuniors } = await supabase
        .from('users')
        .select('id')
        .eq('team_lead_id', userData.id)
        .eq('role', 'junior')
        .eq('status', 'active')

      teamJuniorIds = teamJuniors?.map(j => j.id) || []
      if (teamJuniorIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: [],
          message: 'У вас нет Junior\'ов в команде'
        })
      }
    }

    // Получаем работы Junior'ов с учетом фильтра по роли
    let worksQuery = supabase.from('works')
      .select('id, junior_id')

    if (userData.role === 'teamlead' && teamJuniorIds.length > 0) {
      worksQuery = worksQuery.in('junior_id', teamJuniorIds)
    }

    const { data: works, error: worksError } = await worksQuery

    if (worksError) {
      console.error('Works query error:', worksError)
      return NextResponse.json({
        error: 'Ошибка получения работ',
        details: worksError.message
      }, { status: 500 })
    }

    const workIds = works?.map(w => w.id) || []

    // Получаем выводы по работам
    const { data: juniorWithdrawals, error: juniorError } = await supabase
      .from('work_withdrawals')
      .select(`
        id,
        work_id,
        withdrawal_amount,
        status,
        checked_by,
        checked_at,
        alarm_message,
        manager_notes,
        created_at,
        updated_at,
        works!inner(
          id,
          junior_id,
          casino_id,
          card_id,
          deposit_amount,
          casino_login,
          casino_password,
          notes,
          work_date,
          created_at,
          casinos!inner(id, name, company, currency, promo, url),
          cards!inner(
            id, 
            card_number_mask, 
            card_type,
            bank_account:bank_accounts!inner(
              id,
              holder_name,
              currency,
              bank:banks!inner(name, country)
            )
          ),
          users!inner(id, first_name, last_name, email, telegram_username)
        )
      `)
      .in('work_id', workIds.length > 0 ? workIds : ['null'])
      .order('created_at', { ascending: false })

    console.log('Junior withdrawals result:', {
      count: juniorWithdrawals?.length || 0,
      error: juniorError
    })

    // Получаем PayPal выводы
    let paypalQuery = supabase.from('paypal_withdrawals')
      .select(`
        id,
        user_id,
        paypal_work_id,
        paypal_account_id,
        casino_id,
        withdrawal_amount,
        currency,
        status,
        manager_status,
        teamlead_status,
        manager_comment,
        teamlead_comment,
        hr_comment,
        cfo_comment,
        created_at,
        updated_at,
        users:user_id (
          id,
          first_name,
          last_name,
          email,
          telegram_username
        ),
        paypal_works:paypal_work_id (
          id,
          deposit_amount,
          casino_email,
          casino_password
        ),
        paypal_accounts:paypal_account_id (
          id,
          name,
          email,
          balance
        ),
        casinos:casino_id (
          id,
          name,
          company,
          currency,
          url
        )
      `)

    if (userData.role === 'teamlead' && teamJuniorIds.length > 0) {
      paypalQuery = paypalQuery.in('user_id', teamJuniorIds)
    }

    const { data: paypalWithdrawals, error: paypalError } = await paypalQuery
      .order('created_at', { ascending: false })

    // Получаем выводы тестеров (пока оставляем упрощенными)
    const { data: testWithdrawals, error: testError } = await supabase
      .from('test_withdrawals')
      .select('*')
      .order('created_at', { ascending: false })

    console.log('Test withdrawals result:', {
      count: testWithdrawals?.length || 0,
      error: testError
    })

    if (juniorError || testError || paypalError) {
      console.error('Database error:', { juniorError, testError, paypalError })
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Форматируем выводы Junior с реальными данными (упрощенно)
    const formattedJuniorWithdrawals = (juniorWithdrawals || []).map(w => {
      const work = Array.isArray(w.works) ? w.works[0] : w.works
      const casino = work ? (Array.isArray(work.casinos) ? work.casinos[0] : work.casinos) : null
      const card = work ? (Array.isArray(work.cards) ? work.cards[0] : work.cards) : null
      const user = work ? (Array.isArray(work.users) ? work.users[0] : work.users) : null

      // Извлекаем данные банковского аккаунта
      const bankAccount = card?.bank_account ? (Array.isArray(card.bank_account) ? card.bank_account[0] : card.bank_account) : null
      const bank = bankAccount?.bank ? (Array.isArray(bankAccount.bank) ? bankAccount.bank[0] : bankAccount.bank) : null

      return {
        ...w,
        source_type: 'junior',
        user_role: 'junior',
        user_name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Junior User',
        user_email: user?.email || 'junior@example.com',
        user_telegram: user?.telegram_username || '',
        deposit_amount: work?.deposit_amount || 0,
        deposit_date: work?.work_date || w.created_at,
        casino_name: casino?.name || 'Unknown Casino',
        casino_company: casino?.company || 'Unknown Company',
        casino_url: casino?.promo || casino?.url || '',
        casino_currency: casino?.currency || 'USD',
        card_mask: card?.card_number_mask || '****0000',
        card_type: card?.card_type || 'Unknown Card',
        bank_name: bank?.name || 'Unknown Bank',
        account_holder: bankAccount?.holder_name || 'Unknown Holder'
      }
    })

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

    // Форматируем PayPal выводы
    const formattedPaypalWithdrawals = (paypalWithdrawals || []).map(w => {
      const user = (w as any).users
      const paypalWork = (w as any).paypal_works
      const paypalAccount = (w as any).paypal_accounts
      const casino = (w as any).casinos

      return {
        ...w,
        source_type: 'paypal',
        user_role: 'junior', // PayPal выводы только у Junior'ов
        user_name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : 'Unknown',
        user_email: user?.email || '',
        user_telegram: user?.telegram_username || '',
        deposit_amount: paypalWork?.deposit_amount || 0,
        deposit_date: w.created_at,
        casino_name: casino?.name || 'Unknown Casino',
        casino_company: casino?.company || '',
        casino_url: casino?.url || '',
        casino_currency: casino?.currency || 'USD',
        casino_login: paypalWork?.casino_email || '',
        paypal_name: paypalAccount?.name || 'Unknown PayPal',
        paypal_email: paypalAccount?.email || '',
        paypal_balance: paypalAccount?.balance || 0,
        card_mask: `PayPal: ${paypalAccount?.email || 'Unknown'}`,
        card_type: 'PayPal',
        bank_name: 'PayPal',
        account_holder: paypalAccount?.name || 'Unknown'
      }
    })

    // Объединяем все выводы и сортируем по дате
    const allWithdrawals = [...formattedTestWithdrawals, ...formattedJuniorWithdrawals, ...formattedPaypalWithdrawals]
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
