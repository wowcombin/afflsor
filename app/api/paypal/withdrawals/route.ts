import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить PayPal выводы (для CFO, HR, Admin, Manager)
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Проверка аутентификации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверка роли
    const { data: userData } = await supabase
      .from('users')
      .select('id, role, status, email')
      .eq('auth_id', user.id)
      .single()

    if (!userData || !['cfo', 'hr', 'admin', 'manager', 'tester'].includes(userData.role)) {
      return NextResponse.json({ 
        error: 'Access denied',
        details: 'Недостаточно прав для просмотра PayPal выводов'
      }, { status: 403 })
    }

    // Получаем PayPal выводы
    const { data: withdrawals, error } = await supabase
      .from('paypal_withdrawals')
      .select(`
        id,
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
        checked_at,
        notes,
        user:user_id (
          id,
          email,
          first_name,
          last_name,
          role
        ),
        paypal_account:paypal_account_id (
          id,
          name,
          email
        ),
        casino:casino_id (
          id,
          name,
          url
        ),
        paypal_work:paypal_work_id (
          id,
          deposit_amount
        ),
        checked_by_manager:checked_by_manager (
          email,
          first_name,
          last_name
        ),
        checked_by_hr:checked_by_hr (
          email,
          first_name,
          last_name
        ),
        checked_by_cfo:checked_by_cfo (
          email,
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('PayPal withdrawals fetch error:', error)
      return NextResponse.json({ 
        error: 'Ошибка получения PayPal выводов',
        details: error.message
      }, { status: 500 })
    }

    // Форматируем данные для фронтенда
    const formattedWithdrawals = withdrawals?.map(w => ({
      ...w,
      amount: w.withdrawal_amount, // Унифицируем поле для совместимости с обычными выводами
      work: w.paypal_work ? {
        deposit_amount: (w.paypal_work as any)?.deposit_amount || 0,
        profit: w.withdrawal_amount - ((w.paypal_work as any)?.deposit_amount || 0)
      } : null
    })) || []

    console.log(`${userData.role} ${userData.email} fetched ${formattedWithdrawals.length} PayPal withdrawals`)

    return NextResponse.json({
      success: true,
      withdrawals: formattedWithdrawals
    })

  } catch (error: any) {
    console.error('PayPal withdrawals API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}
