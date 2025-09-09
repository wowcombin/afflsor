import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить статистику для дашборда
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    // Проверка аутентификации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Получаем данные пользователя
    const { data: userData } = await supabase
      .from('users')
      .select('role, status, id')
      .eq('auth_id', user.id)
      .single()

    if (!userData || userData.status !== 'active') {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') || userData.role

    let stats = {}

    switch (role) {
      case 'junior':
        // Статистика для Junior
        stats = await getJuniorStats(supabase, userData.id)
        break
        
      case 'manager':
        // Статистика для Manager
        stats = await getManagerStats(supabase)
        break
        
      case 'hr':
        // Статистика для HR
        stats = await getHRStats(supabase)
        break
        
      case 'cfo':
        // Статистика для CFO
        stats = await getCFOStats(supabase)
        break
        
      case 'tester':
        // Статистика для Tester
        stats = await getTesterStats(supabase)
        break
        
      case 'admin':
        // Статистика для Admin
        stats = await getAdminStats(supabase)
        break
        
      default:
        stats = { message: 'No stats available for this role' }
    }

    return NextResponse.json({ success: true, stats, role })

  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getJuniorStats(supabase: any, userId: string) {
  try {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    // Получаем активные карты пользователя
    const { count: activeCards } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', userId)
      .eq('status', 'active')

    // Получаем тесты за месяц
    const { count: monthlyTests } = await supabase
      .from('casino_tests')
      .select('*', { count: 'exact', head: true })
      .eq('tester_id', userId)
      .gte('created_at', startOfMonth.toISOString())

    // Получаем успешные тесты
    const { count: successfulTests } = await supabase
      .from('casino_tests')
      .select('*', { count: 'exact', head: true })
      .eq('tester_id', userId)
      .eq('test_result', 'passed')

    // Получаем ожидающие выводы
    const { count: pendingWithdrawals } = await supabase
      .from('test_withdrawals')
      .select('tw.*, ct.tester_id', { count: 'exact', head: true })
      .from('test_withdrawals as tw')
      .innerJoin('casino_tests as ct', 'tw.work_id', 'ct.id')
      .eq('ct.tester_id', userId)
      .eq('tw.withdrawal_status', 'pending')

    const successRate = monthlyTests > 0 ? Math.round((successfulTests / monthlyTests) * 100) : 0

    return {
      active_cards: activeCards || 0,
      monthly_tests: monthlyTests || 0,
      success_rate: successRate,
      pending_withdrawals: pendingWithdrawals || 0,
      total_works: successfulTests || 0,
      days_to_payout: 3 // Примерное значение
    }
  } catch (error) {
    console.error('Junior stats error:', error)
    return {
      active_cards: 0,
      monthly_tests: 0,
      success_rate: 0,
      pending_withdrawals: 0,
      total_works: 0,
      days_to_payout: 0
    }
  }
}

async function getManagerStats(supabase: any) {
  try {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    // Получаем ожидающие выводы
    const { count: pendingWithdrawals } = await supabase
      .from('test_withdrawals')
      .select('*', { count: 'exact', head: true })
      .eq('withdrawal_status', 'pending')

    // Получаем размер команды (активные junior'ы)
    const { count: teamSize } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'junior')
      .eq('status', 'active')

    // Получаем профит команды за месяц
    const { data: monthlyWithdrawals } = await supabase
      .from('test_withdrawals')
      .select(`
        withdrawal_amount,
        work:casino_tests!inner (
          deposit_amount,
          tester:users!inner (
            role
          )
        )
      `)
      .eq('work.tester.role', 'junior')
      .eq('withdrawal_status', 'approved')
      .gte('updated_at', startOfMonth.toISOString())

    const teamProfit = (monthlyWithdrawals || []).reduce((sum: number, w: any) => {
      return sum + ((w.withdrawal_amount || 0) - (w.work?.deposit_amount || 0))
    }, 0)

    // Получаем критические алерты (заблокированные карты)
    const { count: criticalAlerts } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'blocked')

    // Получаем статистику успешности команды
    const { data: allTests } = await supabase
      .from('casino_tests')
      .select(`
        test_result,
        tester:users!inner (
          role
        )
      `)
      .eq('tester.role', 'junior')

    const successfulTests = (allTests || []).filter((t: any) => t.test_result === 'passed').length
    const totalTests = (allTests || []).length
    const avgSuccessRate = totalTests > 0 ? Math.round((successfulTests / totalTests) * 100) : 0

    // Получаем доступные карты для назначения
    const { count: availableCards } = await supabase
      .from('cards')
      .select(`
        *,
        bank_account:bank_accounts!inner (
          balance,
          is_active
        )
      `, { count: 'exact', head: true })
      .is('assigned_to', null)
      .eq('status', 'active')
      .eq('bank_account.is_active', true)
      .gte('bank_account.balance', 10)

    return {
      pending_withdrawals: pendingWithdrawals || 0,
      team_size: teamSize || 0,
      team_profit: teamProfit,
      critical_alerts: criticalAlerts || 0,
      avg_success_rate: avgSuccessRate,
      available_cards: availableCards || 0
    }
  } catch (error) {
    console.error('Manager stats error:', error)
    return {
      pending_withdrawals: 0,
      team_size: 0,
      team_profit: 0,
      critical_alerts: 0,
      avg_success_rate: 0,
      available_cards: 0
    }
  }
}

async function getHRStats(supabase: any) {
  try {
    // Получаем количество активных пользователей
    const { count: activeUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    // Получаем количество пользователей созданных в этом месяце
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: newUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString())

    return {
      active_employees: activeUsers || 0,
      new_employees: newUsers || 0,
      avg_efficiency: 0,
      nda_signed: 0
    }
  } catch (error) {
    console.error('HR stats error:', error)
    return {
      active_employees: 0,
      new_employees: 0,
      avg_efficiency: 0,
      nda_signed: 0
    }
  }
}

async function getCFOStats(supabase: any) {
  return {
    profit_loss: 0,
    expenses: 0,
    payouts_pending: 0,
    roi: 0
  }
}

async function getTesterStats(supabase: any) {
  return {
    casinos_tested: 0,
    approved: 0,
    rejected: 0,
    in_progress: 0
  }
}

async function getAdminStats(supabase: any) {
  return {
    active_sessions: 0,
    system_alerts: 0,
    operations_per_day: 0,
    avg_response_time: 0
  }
}
