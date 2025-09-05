import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { convertToUSDSync, getCasinoCurrency } from '@/lib/currency'

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
          
          console.log(`📊 Обрабатываем junior ${junior.id} (${junior.first_name} ${junior.last_name})`)
          console.log(`📅 Начало месяца: ${startOfMonth.toISOString()}`)
          
          // Проверяем есть ли работы у этого junior'а вообще
          const { data: allWorksCheck, error: worksCheckError } = await supabase
            .from('works')
            .select('id, created_at, deposit_amount')
            .eq('junior_id', junior.id)
            .limit(5)
          
          console.log(`🔍 Проверка работ junior ${junior.id}:`, {
            found: allWorksCheck?.length || 0,
            error: worksCheckError?.message,
            sample: allWorksCheck
          })

          // Простые запросы без сложных JOIN'ов
          const { data: allWorks } = await supabase
            .from('works')
            .select('id, created_at')
            .eq('junior_id', junior.id)

          const { data: monthlyWorks } = await supabase
            .from('works')
            .select('id')
            .eq('junior_id', junior.id)
            .gte('created_at', startOfMonth.toISOString())

          const { data: allWithdrawals } = await supabase
            .from('work_withdrawals')
            .select('id, status, work_id')
            
          const { data: assignedCards } = await supabase
            .from('cards')
            .select('id')
            .eq('assigned_to', junior.id)
            .eq('status', 'active')

          // Фильтруем выводы этого junior'а
          const juniorWithdrawals = allWithdrawals?.filter(w => 
            allWorks?.some(work => work.id === w.work_id)
          ) || []

          const successfulWithdrawals = juniorWithdrawals.filter(w => w.status === 'received')
          const pendingWithdrawals = juniorWithdrawals.filter(w => ['new', 'waiting'].includes(w.status))

          const totalWorksResult = { count: allWorks?.length || 0 }
          const monthlyWorksResult = { count: monthlyWorks?.length || 0 }
          const successfulWorksResult = { count: successfulWithdrawals.length }
          const assignedCardsResult = { count: assignedCards?.length || 0 }
          const pendingWithdrawalsResult = { count: pendingWithdrawals.length }
          const lastActivityResult = { data: allWorks?.[0] || null }

          // Получаем профит за месяц
          const { data: monthlyWithdrawals } = await supabase
            .from('work_withdrawals')
            .select(`
              withdrawal_amount,
              work:works!inner (
                junior_id,
                deposit_amount,
                casinos (
                  currency
                )
              )
            `)
            .eq('work.junior_id', junior.id)
            .eq('status', 'received')
            .gte('updated_at', startOfMonth.toISOString())

          // Загружаем курсы валют для конвертации
          const ratesResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/currency-rates`)
          let rates: { [key: string]: number } = { USD: 0.95, GBP: 1.21, EUR: 1.05, CAD: 0.69 } // fallback
          if (ratesResponse.ok) {
            const ratesData = await ratesResponse.json()
            rates = ratesData.rates || rates
          }

          // Используем единую функцию конвертации
          const totalProfit = (monthlyWithdrawals || []).reduce((sum: number, w: any) => {
            const currency = w.work?.casinos?.currency || 'USD'
            const withdrawalUSD = convertToUSDSync(w.withdrawal_amount || 0, currency, rates)
            const depositUSD = convertToUSDSync(w.work?.deposit_amount || 0, currency, rates)
            return sum + (withdrawalUSD - depositUSD)
          }, 0)

          const totalWorks = totalWorksResult.count || 0
          const successfulWorks = successfulWorksResult.count || 0
          const successRate = totalWorks > 0 ? Math.round((successfulWorks / totalWorks) * 100) : 0
          
          console.log(`📈 Статистика junior ${junior.id}:`, {
            totalWorks,
            monthlyWorks: monthlyWorksResult.count || 0,
            successfulWorks,
            successRate,
            assignedCards: assignedCardsResult.count || 0,
            pendingWithdrawals: pendingWithdrawalsResult.count || 0,
            totalProfit,
            monthlyWithdrawalsCount: monthlyWithdrawals?.length || 0
          })

          return {
            ...junior,
            stats: {
              total_accounts: totalWorks,
              successful_accounts: successfulWorks,
              success_rate: successRate,
              monthly_accounts: monthlyWorksResult.count || 0,
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
              total_accounts: 0,
              successful_accounts: 0,
              success_rate: 0,
              monthly_accounts: 0,
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
      total_monthly_accounts: juniorsWithStats.reduce((sum, j) => sum + (j.stats?.monthly_accounts || 0), 0),
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
