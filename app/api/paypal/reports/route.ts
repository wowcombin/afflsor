import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить отчеты по PayPal как по отдельному банку
export async function GET(request: Request) {
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

    if (!userData || !['manager', 'cfo', 'hr', 'tester', 'admin'].includes(userData.role)) {
      return NextResponse.json({ 
        error: 'Access denied',
        details: 'Недостаточно прав для просмотра PayPal отчетов'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'current_month' // current_month, last_month, custom
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let dateFilter = ''
    if (period === 'current_month') {
      dateFilter = `DATE_TRUNC('month', pw.created_at) = DATE_TRUNC('month', CURRENT_DATE)`
    } else if (period === 'last_month') {
      dateFilter = `DATE_TRUNC('month', pw.created_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')`
    } else if (period === 'custom' && startDate && endDate) {
      dateFilter = `pw.created_at >= '${startDate}'::date AND pw.created_at <= '${endDate}'::date + INTERVAL '1 day'`
    } else {
      // По умолчанию текущий месяц
      dateFilter = `DATE_TRUNC('month', pw.created_at) = DATE_TRUNC('month', CURRENT_DATE)`
    }

    // Получаем статистику по PayPal аккаунтам
    const { data: accountStats, error: accountsError } = await supabase
      .from('paypal_accounts')
      .select(`
        id,
        name,
        email,
        status,
        balance,
        balance_send,
        user:user_id (
          id,
          email,
          first_name,
          last_name,
          role
        )
      `)

    if (accountsError) {
      console.error('PayPal accounts stats error:', accountsError)
      return NextResponse.json({ 
        error: 'Ошибка получения статистики аккаунтов',
        details: accountsError.message
      }, { status: 500 })
    }

    // Получаем работы и выводы за период
    const { data: worksData, error: worksError } = await supabase
      .rpc('get_paypal_works_report', { 
        date_filter: dateFilter 
      })

    // Если функция не существует, делаем запрос вручную
    let works = []
    if (worksError) {
      const { data: manualWorks, error: manualError } = await supabase
        .from('paypal_works')
        .select(`
          id,
          deposit_amount,
          currency,
          status,
          created_at,
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
          user:user_id (
            id,
            email,
            first_name,
            last_name,
            role
          ),
          paypal_withdrawals (
            id,
            withdrawal_amount,
            currency,
            status,
            created_at
          )
        `)
        .order('created_at', { ascending: false })

      if (manualError) {
        console.error('Manual PayPal works fetch error:', manualError)
        return NextResponse.json({ 
          error: 'Ошибка получения данных о работах',
          details: manualError.message
        }, { status: 500 })
      }

      works = manualWorks || []
    } else {
      works = worksData || []
    }

    // Вычисляем статистику
    const totalAccounts = accountStats?.length || 0
    const activeAccounts = accountStats?.filter(acc => acc.status === 'active').length || 0
    const totalBalance = accountStats?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0
    const totalSendBalance = accountStats?.reduce((sum, acc) => sum + (acc.balance_send || 0), 0) || 0

    // Статистика по работам
    const totalWorks = works.length
    const completedWorks = works.filter((w: any) => w.status === 'completed').length
    const totalDeposits = works.reduce((sum: number, w: any) => sum + (w.deposit_amount || 0), 0)
    
    // Статистика по выводам
    const allWithdrawals = works.flatMap((w: any) => w.paypal_withdrawals || [])
    const completedWithdrawals = allWithdrawals.filter((wd: any) => wd.status === 'completed')
    const totalWithdrawals = completedWithdrawals.reduce((sum: number, wd: any) => sum + (wd.withdrawal_amount || 0), 0)
    const totalProfit = totalWithdrawals - totalDeposits

    // Группировка по пользователям
    const userStats = works.reduce((acc: any, work: any) => {
      const userId = work.user?.id
      if (!userId) return acc

      if (!acc[userId]) {
        acc[userId] = {
          user: work.user,
          works_count: 0,
          total_deposits: 0,
          total_withdrawals: 0,
          profit: 0,
          accounts: new Set()
        }
      }

      acc[userId].works_count++
      acc[userId].total_deposits += work.deposit_amount || 0
      acc[userId].accounts.add(work.paypal_account?.id)

      const userWithdrawals = work.paypal_withdrawals?.filter((wd: any) => wd.status === 'completed') || []
      const userWithdrawalSum = userWithdrawals.reduce((sum: number, wd: any) => sum + (wd.withdrawal_amount || 0), 0)
      acc[userId].total_withdrawals += userWithdrawalSum
      acc[userId].profit = acc[userId].total_withdrawals - acc[userId].total_deposits

      return acc
    }, {})

    // Преобразуем в массив для фронтенда
    const userStatsArray = Object.values(userStats).map((stat: any) => ({
      ...stat,
      accounts_count: stat.accounts.size,
      accounts: undefined // Убираем Set из ответа
    }))

    // Группировка по аккаунтам
    const accountReports = accountStats?.map(account => {
      const accountWorks = works.filter((w: any) => w.paypal_account?.id === account.id)
      const accountDeposits = accountWorks.reduce((sum: number, w: any) => sum + (w.deposit_amount || 0), 0)
      
      const accountWithdrawals = accountWorks.flatMap((w: any) => w.paypal_withdrawals?.filter((wd: any) => wd.status === 'completed') || [])
      const accountWithdrawalSum = accountWithdrawals.reduce((sum: number, wd: any) => sum + (wd.withdrawal_amount || 0), 0)
      
      return {
        ...account,
        works_count: accountWorks.length,
        total_deposits: accountDeposits,
        total_withdrawals: accountWithdrawalSum,
        profit: accountWithdrawalSum - accountDeposits,
        efficiency: accountDeposits > 0 ? ((accountWithdrawalSum / accountDeposits) * 100) : 0
      }
    }) || []

    console.log(`PayPal report generated for ${userData.email}: ${totalWorks} works, ${totalAccounts} accounts`)

    return NextResponse.json({
      success: true,
      period: period,
      summary: {
        // Аккаунты
        total_accounts: totalAccounts,
        active_accounts: activeAccounts,
        total_balance: totalBalance,
        total_send_balance: totalSendBalance,
        
        // Работы
        total_works: totalWorks,
        completed_works: completedWorks,
        total_deposits: totalDeposits,
        
        // Выводы и прибыль
        total_withdrawals: totalWithdrawals,
        total_profit: totalProfit,
        profit_margin: totalDeposits > 0 ? ((totalProfit / totalDeposits) * 100) : 0
      },
      user_stats: userStatsArray,
      account_reports: accountReports,
      recent_works: works.slice(0, 10) // Последние 10 работ
    })

  } catch (error: any) {
    console.error('PayPal reports API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}
