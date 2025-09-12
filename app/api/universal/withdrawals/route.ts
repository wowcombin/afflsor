import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Проверка аутентификации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Получение данных пользователя
    const { data: userData } = await supabase
      .from('users')
      .select('id, role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData || userData.status !== 'active') {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 403 })
    }

    console.log('Universal withdrawals request:', {
      user_id: userData.id,
      role: userData.role,
      email: user.email
    })

    let juniorIds: string[] = []

    // Определяем доступные Junior'ы в зависимости от роли
    if (userData.role === 'teamlead') {
      // Team Lead видит только своих Junior'ов
      const { data: teamJuniors } = await supabase
        .from('users')
        .select('id')
        .eq('team_lead_id', userData.id)
        .eq('role', 'junior')
        .eq('status', 'active')
      
      juniorIds = teamJuniors?.map(j => j.id) || []
    } else if (['manager', 'hr', 'admin', 'cfo'].includes(userData.role)) {
      // Manager, HR, Admin, CFO видят всех Junior'ов
      const { data: allJuniors } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'junior')
        .eq('status', 'active')
      
      juniorIds = allJuniors?.map(j => j.id) || []
    } else {
      return NextResponse.json({ 
        error: 'Access denied',
        details: 'Роль не имеет доступа к выводам'
      }, { status: 403 })
    }

    if (juniorIds.length === 0) {
      return NextResponse.json({
        success: true,
        withdrawals: [],
        paypal_withdrawals: [],
        message: userData.role === 'teamlead' ? 'У вас нет Junior\'ов в команде' : 'Нет активных Junior\'ов'
      })
    }

    // Получаем работы Junior'ов
    const { data: works, error: worksError } = await supabase
      .from('works')
      .select('id')
      .in('junior_id', juniorIds)

    if (worksError) {
      console.error('Works query error:', worksError)
      return NextResponse.json({
        error: 'Ошибка получения работ',
        details: worksError.message
      }, { status: 500 })
    }

    const workIds = works?.map(w => w.id) || []

    // Получаем обычные выводы (work_withdrawals)
    let regularWithdrawals: any[] = []
    if (workIds.length > 0) {
      const { data: withdrawalsData, error: withdrawalsError } = await supabase
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
          works:work_id (
            id,
            junior_id,
            deposit_amount,
            casino_login,
            status,
            work_date,
            users:junior_id (
              id,
              email,
              first_name,
              last_name,
              role,
              telegram_username
            ),
            casinos:casino_id (
              id,
              name,
              company,
              currency,
              url
            ),
            cards:card_id (
              id,
              card_number_mask,
              card_type,
              bank_accounts (
                id,
                holder_name,
                currency,
                banks (
                  name,
                  country
                )
              )
            )
          )
        `)
        .in('work_id', workIds)
        .order('created_at', { ascending: false })

      if (withdrawalsError) {
        console.error('Regular withdrawals query error:', withdrawalsError)
      } else {
        regularWithdrawals = withdrawalsData || []
      }
    }

    // Получаем PayPal выводы
    const { data: paypalWithdrawals, error: paypalError } = await supabase
      .from('paypal_withdrawals')
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
        checked_by_manager,
        checked_by_teamlead,
        checked_by_hr,
        checked_by_cfo,
        created_at,
        updated_at,
        users:user_id (
          id,
          email,
          first_name,
          last_name,
          role,
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
          company
        )
      `)
      .in('user_id', juniorIds)
      .order('created_at', { ascending: false })

    if (paypalError) {
      console.error('PayPal withdrawals query error:', paypalError)
    }

    // Форматируем обычные выводы
    const formattedRegularWithdrawals = regularWithdrawals.map(w => {
      const work = w.works
      const user = work?.users
      const casino = work?.casinos
      const card = work?.cards
      const bankAccount = card?.bank_accounts
      const bank = bankAccount?.banks

      return {
        ...w,
        source_type: 'regular',
        user_id: user?.id,
        user_name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : 'Unknown',
        user_email: user?.email || '',
        user_telegram: user?.telegram_username || '',
        user_role: user?.role || 'junior',
        amount: w.withdrawal_amount,
        deposit_amount: work?.deposit_amount || 0,
        deposit_date: work?.work_date || work?.created_at,
        casino_name: casino?.name || 'Unknown Casino',
        casino_company: casino?.company || '',
        casino_url: casino?.url || '',
        casino_currency: casino?.currency || 'USD',
        casino_login: work?.casino_login || '',
        card_mask: card?.card_number_mask || '',
        card_type: card?.card_type || '',
        bank_name: bank?.name || 'Unknown Bank',
        bank_country: bank?.country || '',
        account_holder: bankAccount?.holder_name || 'Unknown Holder',
        account_currency: bankAccount?.currency || 'USD'
      }
    })

    // Форматируем PayPal выводы
    const formattedPaypalWithdrawals = (paypalWithdrawals || []).map(w => {
      const user = (w as any).users
      const paypalWork = (w as any).paypal_works
      const paypalAccount = (w as any).paypal_accounts
      const casino = (w as any).casinos

      return {
        ...w,
        source_type: 'paypal',
        user_id: user?.id,
        user_name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : 'Unknown',
        user_email: user?.email || '',
        user_telegram: user?.telegram_username || '',
        user_role: user?.role || 'junior',
        amount: w.withdrawal_amount,
        deposit_amount: paypalWork?.deposit_amount || 0,
        casino_name: casino?.name || 'Unknown Casino',
        casino_company: casino?.company || '',
        casino_login: paypalWork?.casino_email || '',
        paypal_name: paypalAccount?.name || 'Unknown PayPal',
        paypal_email: paypalAccount?.email || '',
        paypal_balance: paypalAccount?.balance || 0
      }
    })

    // Объединяем все выводы
    const allWithdrawals = [
      ...formattedRegularWithdrawals,
      ...formattedPaypalWithdrawals
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    console.log('Universal withdrawals loaded:', {
      role: userData.role,
      regular_count: formattedRegularWithdrawals.length,
      paypal_count: formattedPaypalWithdrawals.length,
      total_count: allWithdrawals.length,
      junior_ids_count: juniorIds.length
    })

    return NextResponse.json({
      success: true,
      withdrawals: allWithdrawals,
      stats: {
        total_withdrawals: allWithdrawals.length,
        regular_withdrawals: formattedRegularWithdrawals.length,
        paypal_withdrawals: formattedPaypalWithdrawals.length,
        pending_withdrawals: allWithdrawals.filter(w => 
          (w.source_type === 'regular' && ['new', 'waiting'].includes(w.status)) ||
          (w.source_type === 'paypal' && w.status === 'pending')
        ).length,
        approved_withdrawals: allWithdrawals.filter(w => 
          (w.source_type === 'regular' && w.status === 'received') ||
          (w.source_type === 'paypal' && w.status === 'approved')
        ).length
      }
    })

  } catch (error: any) {
    console.error('Universal withdrawals API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}
