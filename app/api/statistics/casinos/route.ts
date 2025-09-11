import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить статистику казино
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
        details: 'Недостаточно прав для просмотра статистики казино'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'today' // today, 3days, week, 2weeks, month
    const casinoId = searchParams.get('casino_id') // Для фильтрации по конкретному казино

    // Получаем статистику казино
    let query = supabase
      .from('casino_daily_stats')
      .select(`
        *,
        casino:casino_id (
          id,
          name,
          url,
          status,
          paypal_compatible
        )
      `)

    // Фильтрация по конкретному казино
    if (casinoId) {
      query = query.eq('casino_id', casinoId)
    }

    const { data: casinoStats, error } = await query
      .order('date', { ascending: false })

    if (error) {
      console.error('Casino statistics fetch error:', error)
      return NextResponse.json({ 
        error: 'Ошибка получения статистики казино',
        details: error.message
      }, { status: 500 })
    }

    // Фильтруем по датам
    const filteredStats = casinoStats?.filter(stat => {
      const statDate = new Date(stat.date)
      const currentDate = new Date()
      
      switch (period) {
        case 'today':
          return statDate.toDateString() === currentDate.toDateString()
        case '3days':
          return statDate >= new Date(currentDate.getTime() - 2 * 24 * 60 * 60 * 1000)
        case 'week':
          return statDate >= new Date(currentDate.getTime() - 6 * 24 * 60 * 60 * 1000)
        case '2weeks':
          return statDate >= new Date(currentDate.getTime() - 13 * 24 * 60 * 60 * 1000)
        case 'month':
          return statDate.getMonth() === currentDate.getMonth() && statDate.getFullYear() === currentDate.getFullYear()
        default:
          return true
      }
    }) || []

    // Агрегируем статистику по казино за период
    const aggregatedStats = filteredStats.reduce((acc, stat) => {
      const casinoId = stat.casino_id
      
      if (!acc[casinoId]) {
        acc[casinoId] = {
          casino: stat.casino,
          period_stats: {
            total_days: 0,
            total_works_created: 0,
            total_works_completed: 0,
            total_deposits: 0,
            total_withdrawals: 0,
            total_profit: 0,
            avg_success_rate: 0,
            best_day_profit: 0,
            card_profit: 0,
            paypal_profit: 0,
            unique_users: new Set(),
            unique_cards: new Set(),
            unique_paypal_accounts: new Set()
          },
          daily_stats: []
        }
      }
      
      const casinoData = acc[casinoId]
      casinoData.period_stats.total_days++
      casinoData.period_stats.total_works_created += stat.total_works_created || 0
      casinoData.period_stats.total_works_completed += stat.total_works_completed || 0
      casinoData.period_stats.total_deposits += parseFloat(stat.total_deposits || 0)
      casinoData.period_stats.total_withdrawals += parseFloat(stat.total_withdrawals || 0)
      casinoData.period_stats.total_profit += parseFloat(stat.total_profit || 0)
      casinoData.period_stats.card_profit += parseFloat(stat.card_total_profit || 0)
      casinoData.period_stats.paypal_profit += parseFloat(stat.paypal_total_profit || 0)
      casinoData.period_stats.best_day_profit = Math.max(casinoData.period_stats.best_day_profit, parseFloat(stat.total_profit || 0))
      
      casinoData.daily_stats.push(stat)
      
      return acc
    }, {} as Record<string, any>)

    // Рассчитываем средние значения и финализируем данные
    Object.values(aggregatedStats).forEach((casinoData: any) => {
      const days = casinoData.period_stats.total_days
      if (days > 0) {
        casinoData.period_stats.avg_success_rate = casinoData.daily_stats.reduce((sum: number, day: any) => sum + (day.overall_success_rate || 0), 0) / days
      }
      
      // Убираем Set объекты для JSON
      casinoData.period_stats.unique_users_count = casinoData.period_stats.unique_users.size
      casinoData.period_stats.unique_cards_count = casinoData.period_stats.unique_cards.size
      casinoData.period_stats.unique_paypal_accounts_count = casinoData.period_stats.unique_paypal_accounts.size
      delete casinoData.period_stats.unique_users
      delete casinoData.period_stats.unique_cards
      delete casinoData.period_stats.unique_paypal_accounts
    })

    // Сортируем казино по прибыли
    const sortedCasinos = Object.values(aggregatedStats).sort((a: any, b: any) => 
      b.period_stats.total_profit - a.period_stats.total_profit
    )

    // Добавляем рейтинги
    sortedCasinos.forEach((casino: any, index) => {
      casino.period_stats.profit_rank = index + 1
    })

    // Получаем также статистику банков для сравнения
    const { data: bankStats, error: bankError } = await supabase
      .from('bank_daily_stats')
      .select(`
        *,
        bank:bank_id (
          id,
          name,
          country,
          is_active
        )
      `)
      .order('date', { ascending: false })

    const filteredBankStats = bankStats?.filter(stat => {
      const statDate = new Date(stat.date)
      const currentDate = new Date()
      
      switch (period) {
        case 'today':
          return statDate.toDateString() === currentDate.toDateString()
        case '3days':
          return statDate >= new Date(currentDate.getTime() - 2 * 24 * 60 * 60 * 1000)
        case 'week':
          return statDate >= new Date(currentDate.getTime() - 6 * 24 * 60 * 60 * 1000)
        case '2weeks':
          return statDate >= new Date(currentDate.getTime() - 13 * 24 * 60 * 60 * 1000)
        case 'month':
          return statDate.getMonth() === currentDate.getMonth() && statDate.getFullYear() === currentDate.getFullYear()
        default:
          return true
      }
    }) || []

    console.log(`Casino statistics fetched for ${userData.role} ${userData.email}: ${sortedCasinos.length} casinos, ${filteredBankStats.length} banks, period: ${period}`)

    return NextResponse.json({
      success: true,
      period,
      casinos: {
        total_count: sortedCasinos.length,
        data: sortedCasinos,
        summary: {
          total_profit: sortedCasinos.reduce((sum, casino: any) => sum + casino.period_stats.total_profit, 0),
          total_works: sortedCasinos.reduce((sum, casino: any) => sum + casino.period_stats.total_works_completed, 0),
          avg_success_rate: sortedCasinos.length > 0 ? 
            (sortedCasinos as any[]).reduce((sum, casino: any) => sum + casino.period_stats.avg_success_rate, 0) / sortedCasinos.length : 0,
          card_profit: sortedCasinos.reduce((sum, casino: any) => sum + casino.period_stats.card_profit, 0),
          paypal_profit: sortedCasinos.reduce((sum, casino: any) => sum + casino.period_stats.paypal_profit, 0)
        }
      },
      banks: {
        total_count: filteredBankStats.length,
        data: filteredBankStats,
        summary: {
          total_profit: filteredBankStats.reduce((sum, bank: any) => sum + parseFloat(bank.total_profit || 0), 0),
          total_works: filteredBankStats.reduce((sum, bank: any) => sum + (bank.works_completed || 0), 0),
          avg_success_rate: filteredBankStats.length > 0 ? 
            filteredBankStats.reduce((sum, bank: any) => sum + (bank.success_rate || 0), 0) / filteredBankStats.length : 0
        }
      }
    })

  } catch (error: any) {
    console.error('Casino statistics API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}
