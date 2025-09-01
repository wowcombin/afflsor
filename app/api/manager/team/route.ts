import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить данные команды для менеджера
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
      .select('id, role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData || userData.status !== 'active' || userData.role !== 'manager') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Получаем всех пользователей для отладки, потом отфильтруем junior'ов
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        telegram_username,
        role,
        status,
        salary_percentage,
        salary_bonus,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    if (usersError) {
      console.error('Users fetch error:', usersError)
      return NextResponse.json({ error: 'Failed to fetch users data' }, { status: 500 })
    }

    console.log('🔍 Все пользователи в системе:', {
      total: allUsers?.length || 0,
      users: allUsers?.map(user => ({
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        role: user.role,
        status: user.status
      })) || []
    })

    // Фильтруем только junior'ов
    const juniors = allUsers?.filter(user => user.role === 'junior') || []
    
    console.log('🔍 Junior\'ы найдены:', {
      total: juniors.length,
      juniors: juniors.map(user => ({
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        role: user.role
      }))
    })



    // Для каждого junior'а получаем статистику
    const juniorsWithStats = await Promise.all(
      (juniors || []).map(async (junior) => {
        try {
          // Получаем статистику тестов
          const startOfMonth = new Date()
          startOfMonth.setDate(1)
          startOfMonth.setHours(0, 0, 0, 0)

          const [
            totalTestsResult,
            monthlyTestsResult,
            successfulTestsResult,
            assignedCardsResult,
            pendingWithdrawalsResult,
            lastActivityResult
          ] = await Promise.all([
            // Общее количество тестов
            supabase
              .from('casino_tests')
              .select('id', { count: 'exact', head: true })
              .eq('tester_id', junior.id),
            
            // Тесты за текущий месяц
            supabase
              .from('casino_tests')
              .select('id', { count: 'exact', head: true })
              .eq('tester_id', junior.id)
              .gte('created_at', startOfMonth.toISOString()),
            
            // Успешные тесты
            supabase
              .from('casino_tests')
              .select('id', { count: 'exact', head: true })
              .eq('tester_id', junior.id)
              .eq('test_result', 'passed'),
            
            // Назначенные карты
            supabase
              .from('cards')
              .select('id', { count: 'exact', head: true })
              .eq('assigned_to', junior.id)
              .eq('status', 'active'),
            
            // Ожидающие выводы
            supabase
              .from('test_withdrawals')
              .select(`
                id,
                work:casino_tests!inner (
                  tester_id
                )
              `, { count: 'exact', head: true })
              .eq('work.tester_id', junior.id)
              .eq('withdrawal_status', 'pending'),
            
            // Последняя активность
            supabase
              .from('casino_tests')
              .select('created_at')
              .eq('tester_id', junior.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()
          ])

          // Получаем профит за месяц
          const { data: monthlyWithdrawals } = await supabase
            .from('test_withdrawals')
            .select(`
              withdrawal_amount,
              work:casino_tests!inner (
                tester_id,
                deposit_amount
              )
            `)
            .eq('work.tester_id', junior.id)
            .eq('withdrawal_status', 'approved')
            .gte('updated_at', startOfMonth.toISOString())

          const totalProfit = (monthlyWithdrawals || []).reduce((sum: number, w: any) => {
            return sum + ((w.withdrawal_amount || 0) - (w.work?.deposit_amount || 0))
          }, 0)

          const totalTests = totalTestsResult.count || 0
          const successfulTests = successfulTestsResult.count || 0
          const successRate = totalTests > 0 ? Math.round((successfulTests / totalTests) * 100) : 0

          return {
            ...junior,
            stats: {
              total_tests: totalTests,
              successful_tests: successfulTests,
              success_rate: successRate,
              monthly_tests: monthlyTestsResult.count || 0,
              assigned_cards: assignedCardsResult.count || 0,
              pending_withdrawals: pendingWithdrawalsResult.count || 0,
              total_profit: totalProfit,
              last_activity: lastActivityResult.data?.created_at || null
            }
          }
        } catch (error) {
          console.error(`Error fetching stats for junior ${junior.id}:`, error)
          return {
            ...junior,
            stats: {
              total_tests: 0,
              successful_tests: 0,
              success_rate: 0,
              monthly_tests: 0,
              assigned_cards: 0,
              pending_withdrawals: 0,
              total_profit: 0,
              last_activity: null
            }
          }
        }
      })
    )

    // Общая статистика команды
    const teamStats = {
      total_juniors: juniorsWithStats.length,
      active_juniors: juniorsWithStats.filter(j => j.status === 'active').length,
      total_monthly_tests: juniorsWithStats.reduce((sum, j) => sum + (j.stats?.monthly_tests || 0), 0),
      total_monthly_profit: juniorsWithStats.reduce((sum, j) => sum + (j.stats?.total_profit || 0), 0),
      avg_success_rate: juniorsWithStats.length > 0 ? 
        Math.round(juniorsWithStats.reduce((sum, j) => sum + (j.stats?.success_rate || 0), 0) / juniorsWithStats.length) : 0,
      pending_withdrawals: juniorsWithStats.reduce((sum, j) => sum + (j.stats?.pending_withdrawals || 0), 0)
    }

    return NextResponse.json({ 
      success: true, 
      data: juniorsWithStats,
      team_stats: teamStats
    })

  } catch (error) {
    console.error('Team data error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
