import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Получаем текущего пользователя
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('auth_id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)
    
    const yesterdayEnd = new Date(yesterday)
    yesterdayEnd.setHours(23, 59, 59, 999)

    // 1. Профит за месяц и изменение к вчера
    const { data: monthWithdrawals } = await supabase
      .from('work_withdrawals')
      .select('withdrawal_amount, works!inner(deposit_amount, junior_id, work_date)')
      .eq('works.junior_id', userData.id)
      .eq('status', 'received')
      .gte('works.work_date', startOfMonth.toISOString())

    const monthProfit = monthWithdrawals?.reduce((sum, w) => {
      const work = Array.isArray(w.works) ? w.works[0] : w.works
      return sum + (w.withdrawal_amount - (work?.deposit_amount || 0))
    }, 0) || 0

    const { data: yesterdayWithdrawals } = await supabase
      .from('work_withdrawals')
      .select('withdrawal_amount, works!inner(deposit_amount, junior_id, work_date)')
      .eq('works.junior_id', userData.id)
      .eq('status', 'received')
      .gte('works.work_date', yesterday.toISOString())
      .lte('works.work_date', yesterdayEnd.toISOString())

    const yesterdayProfit = yesterdayWithdrawals?.reduce((sum, w) => {
      const work = Array.isArray(w.works) ? w.works[0] : w.works
      return sum + (w.withdrawal_amount - (work?.deposit_amount || 0))
    }, 0) || 0

    const profitChange = yesterdayProfit > 0 
      ? ((monthProfit - yesterdayProfit) / yesterdayProfit) * 100 
      : 0

    // 2. Позиция в рейтинге
    const { data: allJuniors } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'junior')
      .eq('status', 'active')

    // Получаем профит всех Junior за месяц
    const { data: allWithdrawals } = await supabase
      .from('work_withdrawals')
      .select('withdrawal_amount, works!inner(junior_id, deposit_amount, work_date)')
      .eq('status', 'received')
      .gte('works.work_date', startOfMonth.toISOString())

    const juniorProfits = new Map()
    allWithdrawals?.forEach(w => {
      const work = Array.isArray(w.works) ? w.works[0] : w.works
      const profit = w.withdrawal_amount - (work?.deposit_amount || 0)
      const juniorId = work?.junior_id
      
      if (juniorId) {
        juniorProfits.set(juniorId, (juniorProfits.get(juniorId) || 0) + profit)
      }
    })

    const sortedProfits = Array.from(juniorProfits.entries())
      .sort((a, b) => b[1] - a[1])
    
    const rankPosition = sortedProfits.findIndex(([id]) => id === userData.id) + 1
    const totalJuniors = allJuniors?.length || 0

    // 3. Дни до зарплаты
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const daysToSalary = Math.ceil((lastDayOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    // 4. Успешность и изменение за неделю
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const { data: weekWithdrawals } = await supabase
      .from('work_withdrawals')
      .select('status, works!inner(junior_id)')
      .eq('works.junior_id', userData.id)
      .gte('created_at', weekAgo.toISOString())

    const weekTotal = weekWithdrawals?.length || 0
    const weekSuccessful = weekWithdrawals?.filter(w => w.status === 'received').length || 0
    const successRate = weekTotal > 0 ? (weekSuccessful / weekTotal) * 100 : 0

    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

    const { data: prevWeekWithdrawals } = await supabase
      .from('work_withdrawals')
      .select('status, works!inner(junior_id)')
      .eq('works.junior_id', userData.id)
      .gte('created_at', twoWeeksAgo.toISOString())
      .lt('created_at', weekAgo.toISOString())

    const prevWeekTotal = prevWeekWithdrawals?.length || 0
    const prevWeekSuccessful = prevWeekWithdrawals?.filter(w => w.status === 'received').length || 0
    const prevSuccessRate = prevWeekTotal > 0 ? (prevWeekSuccessful / prevWeekTotal) * 100 : 0
    const successRateChange = successRate - prevSuccessRate

    // 5. Назначенные карты с полной информацией
    const { data: assignedCards } = await supabase
      .from('card_assignments')
      .select(`
        *,
        cards!inner(
          id,
          card_number_mask,
          card_bin,
          exp_month,
          exp_year,
          status,
          bank_accounts!inner(
            holder_name,
            banks!inner(name, country)
          )
        ),
        casinos!inner(name, allowed_bins)
      `)
      .eq('junior_id', userData.id)
      .eq('status', 'assigned')

    // 6. График профита за 7 дней
    const profitChart = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      
      const nextDay = new Date(date)
      nextDay.setDate(nextDay.getDate() + 1)

      const { data: dayWithdrawals } = await supabase
        .from('work_withdrawals')
        .select('withdrawal_amount, works!inner(deposit_amount, junior_id, work_date)')
        .eq('works.junior_id', userData.id)
        .eq('status', 'received')
        .gte('works.work_date', date.toISOString())
        .lt('works.work_date', nextDay.toISOString())

      const dayProfit = dayWithdrawals?.reduce((sum, w) => {
        const work = Array.isArray(w.works) ? w.works[0] : w.works
        return sum + (w.withdrawal_amount - (work?.deposit_amount || 0))
      }, 0) || 0

      profitChart.push({
        date: date.toLocaleDateString('ru-RU', { weekday: 'short' }),
        profit: dayProfit,
        fullDate: date.toISOString()
      })
    }

    // 7. Топ-5 лидеров
    const topPerformers = sortedProfits.slice(0, 5).map(([juniorId, profit], index) => ({
      position: index + 1,
      juniorId,
      profit,
      isCurrentUser: juniorId === userData.id
    }))

    // Получаем имена топ лидеров
    const topJuniorIds = topPerformers.map(p => p.juniorId)
    const { data: topJuniorsData } = await supabase
      .from('users')
      .select('id, first_name, last_name, telegram_username')
      .in('id', topJuniorIds)

    const enrichedTopPerformers = topPerformers.map(performer => {
      const juniorData = topJuniorsData?.find(j => j.id === performer.juniorId)
      return {
        ...performer,
        name: juniorData ? `${juniorData.first_name || ''} ${juniorData.last_name || ''}`.trim() : 'Неизвестно',
        telegram: juniorData?.telegram_username
      }
    })

    // 8. Последние транзакции
    const { data: recentTransactions } = await supabase
      .from('work_withdrawals')
      .select(`
        id,
        withdrawal_amount,
        status,
        created_at,
        works!inner(
          deposit_amount,
          casino_username,
          junior_id,
          casinos!inner(name)
        )
      `)
      .eq('works.junior_id', userData.id)
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      stats: {
        monthProfit,
        profitChange,
        rankPosition,
        totalJuniors,
        daysToSalary,
        nextSalaryDate: lastDayOfMonth.toLocaleDateString('ru-RU'),
        successRate,
        successRateChange
      },
      assignedCards: assignedCards?.map(assignment => {
        const card = Array.isArray(assignment.cards) ? assignment.cards[0] : assignment.cards
        const bankAccount = Array.isArray(card?.bank_accounts) ? card.bank_accounts[0] : card?.bank_accounts
        const bank = Array.isArray(bankAccount?.banks) ? bankAccount.banks[0] : bankAccount?.banks
        const casino = Array.isArray(assignment.casinos) ? assignment.casinos[0] : assignment.casinos
        
        return {
          id: card?.id,
          card_number_mask: card?.card_number_mask,
          full_number: `${card?.card_bin || '****'}** **** ${card?.card_number_mask?.slice(-4) || '****'}`,
          exp_month: card?.exp_month,
          exp_year: card?.exp_year,
          status: assignment.status,
          casino_name: casino?.name,
          bank_name: bank?.name,
          holder_name: bankAccount?.holder_name,
          card_bin: card?.card_bin,
          is_bin_compatible: casino?.allowed_bins?.includes(card?.card_bin)
        }
      }) || [],
      profitChart,
      topPerformers: enrichedTopPerformers,
      recentTransactions: recentTransactions?.map(transaction => {
        const work = Array.isArray(transaction.works) ? transaction.works[0] : transaction.works
        const casino = Array.isArray(work?.casinos) ? work.casinos[0] : work?.casinos
        
        return {
          id: transaction.id,
          time: new Date(transaction.created_at).toLocaleTimeString('ru-RU'),
          casino: casino?.name || 'Неизвестно',
          deposit: work?.deposit_amount || 0,
          withdrawal: transaction.withdrawal_amount,
          status: transaction.status,
          type: 'withdrawal' as const
        }
      }) || []
    })

  } catch (error) {
    console.error('Ошибка загрузки расширенной статистики:', error)
    return NextResponse.json({
      error: 'Ошибка загрузки данных'
    }, { status: 500 })
  }
}
