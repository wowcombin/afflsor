import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Проверяем аутентификацию
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Получаем параметры запроса
    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get('dateRange') || '30d'

    // Вычисляем диапазон дат
    const now = new Date()
    let startDate: Date
    
    switch (dateRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case '30d':
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
    }

    // Получаем курсы валют
    const ratesResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/currency-rates`)
    const exchangeRates = ratesResponse.ok ? await ratesResponse.json() : { rates: { USD: 1 } }

    // Функция конвертации в USD
    const convertToUSD = (amount: number, currency: string): number => {
      if (currency === 'USD') return amount
      const rate = exchangeRates.rates[currency] || 1
      return amount * rate * 0.95 // Google rate -5%
    }

    // 1. Получаем общую статистику пользователей
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, role, created_at')
      .eq('role', 'junior')

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const totalJuniors = usersData?.length || 0

    // 2. Получаем активных Junior (те, кто создавал работы за период)
    const { data: activeJuniorsData, error: activeJuniorsError } = await supabase
      .from('works')
      .select('junior_id')
      .gte('created_at', startDate.toISOString())
      .neq('junior_id', null)

    if (activeJuniorsError) {
      console.error('Error fetching active juniors:', activeJuniorsError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const activeJuniorIds = Array.from(new Set(activeJuniorsData?.map(w => w.junior_id) || []))
    const activeJuniors = activeJuniorIds.length

    // 3. Получаем статистику выводов
    const { data: withdrawalsData, error: withdrawalsError } = await supabase
      .from('work_withdrawals')
      .select(`
        id,
        withdrawal_amount,
        status,
        created_at,
        updated_at,
        works!inner (
          id,
          junior_id,
          casino_id,
          deposit_amount,
          created_at,
          casinos!inner (
            id,
            name,
            currency
          ),
          users!inner (
            id,
            first_name,
            last_name,
            telegram_username
          )
        )
      `)
      .gte('created_at', startDate.toISOString())

    if (withdrawalsError) {
      console.error('Error fetching withdrawals:', withdrawalsError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const withdrawals = withdrawalsData || []

    // Подсчитываем статистику выводов
    const totalWithdrawals = withdrawals.length
    const pendingWithdrawals = withdrawals.filter(w => w.status === 'waiting' || w.status === 'new').length
    const approvedWithdrawals = withdrawals.filter(w => w.status === 'received').length
    const rejectedWithdrawals = withdrawals.filter(w => w.status === 'block').length

    // Подсчитываем просроченные (более 4 часов)
    const overdueWithdrawals = withdrawals.filter(w => {
      if (w.status !== 'waiting' && w.status !== 'new') return false
      const hours = Math.floor((Date.now() - new Date(w.created_at).getTime()) / (1000 * 60 * 60))
      return hours > 4
    }).length

    // 4. Рассчитываем профит
    let totalProfit = 0
    let todayProfit = 0
    let weekProfit = 0
    let monthProfit = 0

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    withdrawals.forEach(w => {
      const work = Array.isArray(w.works) ? w.works[0] : w.works
      const casino = Array.isArray(work.casinos) ? work.casinos[0] : work.casinos
      
      const depositUSD = convertToUSD(work.deposit_amount, casino.currency || 'USD')
      const withdrawalUSD = convertToUSD(w.withdrawal_amount, casino.currency || 'USD')
      const profit = withdrawalUSD - depositUSD

      if (w.status === 'received') {
        totalProfit += profit
        
        const createdDate = new Date(w.created_at)
        if (createdDate >= today) {
          todayProfit += profit
        }
        if (createdDate >= weekAgo) {
          weekProfit += profit
        }
        if (createdDate >= monthAgo) {
          monthProfit += profit
        }
      }
    })

    // 5. Среднее время обработки (только для завершенных)
    const completedWithdrawals = withdrawals.filter(w => w.status === 'received' || w.status === 'block')
    let avgProcessingTime = 0
    
    if (completedWithdrawals.length > 0) {
      const totalProcessingTime = completedWithdrawals.reduce((sum, w) => {
        const created = new Date(w.created_at).getTime()
        const updated = new Date(w.updated_at).getTime()
        return sum + (updated - created)
      }, 0)
      avgProcessingTime = totalProcessingTime / completedWithdrawals.length / (1000 * 60 * 60) // в часах
    }

    // 6. Топ исполнители
    const juniorStats = new Map()
    
    withdrawals.forEach(w => {
      const work = Array.isArray(w.works) ? w.works[0] : w.works
      const user = Array.isArray(work.users) ? work.users[0] : work.users
      const casino = Array.isArray(work.casinos) ? work.casinos[0] : work.casinos
      
      const juniorId = work.junior_id
      if (!juniorStats.has(juniorId)) {
        juniorStats.set(juniorId, {
          id: juniorId,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Неизвестно',
          telegram: user.telegram_username ? `@${user.telegram_username}` : '',
          profit: 0,
          withdrawals: 0,
          successfulWithdrawals: 0
        })
      }
      
      const stats = juniorStats.get(juniorId)
      stats.withdrawals++
      
      if (w.status === 'received') {
        const depositUSD = convertToUSD(work.deposit_amount, casino.currency || 'USD')
        const withdrawalUSD = convertToUSD(w.withdrawal_amount, casino.currency || 'USD')
        stats.profit += (withdrawalUSD - depositUSD)
        stats.successfulWithdrawals++
      }
    })

    const topPerformers = Array.from(juniorStats.values())
      .map(stats => ({
        ...stats,
        successRate: stats.withdrawals > 0 ? (stats.successfulWithdrawals / stats.withdrawals) * 100 : 0
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5)

    // 7. Статистика по казино
    const casinoStats = new Map()
    
    withdrawals.forEach(w => {
      const work = Array.isArray(w.works) ? w.works[0] : w.works
      const casino = Array.isArray(work.casinos) ? work.casinos[0] : work.casinos
      
      const casinoName = casino.name
      if (!casinoStats.has(casinoName)) {
        casinoStats.set(casinoName, {
          name: casinoName,
          totalDeposits: 0,
          totalWithdrawals: 0,
          profit: 0,
          totalOperations: 0,
          successfulOperations: 0
        })
      }
      
      const stats = casinoStats.get(casinoName)
      const depositUSD = convertToUSD(work.deposit_amount, casino.currency || 'USD')
      const withdrawalUSD = convertToUSD(w.withdrawal_amount, casino.currency || 'USD')
      
      stats.totalDeposits += depositUSD
      stats.totalOperations++
      
      if (w.status === 'received') {
        stats.totalWithdrawals += withdrawalUSD
        stats.profit += (withdrawalUSD - depositUSD)
        stats.successfulOperations++
      }
    })

    const casinoStatsArray = Array.from(casinoStats.values())
      .map(stats => ({
        ...stats,
        successRate: stats.totalOperations > 0 ? (stats.successfulOperations / stats.totalOperations) * 100 : 0
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10)

    // 8. Дневная статистика (последние 30 дней)
    const dailyStats = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayWithdrawals = withdrawals.filter(w => {
        const wDate = new Date(w.created_at).toISOString().split('T')[0]
        return wDate === dateStr
      })
      
      let dayDeposits = 0
      let dayWithdrawalsAmount = 0
      let dayProfit = 0
      
      dayWithdrawals.forEach(w => {
        const work = Array.isArray(w.works) ? w.works[0] : w.works
        const casino = Array.isArray(work.casinos) ? work.casinos[0] : work.casinos
        
        const depositUSD = convertToUSD(work.deposit_amount, casino.currency || 'USD')
        const withdrawalUSD = convertToUSD(w.withdrawal_amount, casino.currency || 'USD')
        
        dayDeposits += depositUSD
        if (w.status === 'received') {
          dayWithdrawalsAmount += withdrawalUSD
          dayProfit += (withdrawalUSD - depositUSD)
        }
      })
      
      dailyStats.push({
        date: dateStr,
        deposits: Math.round(dayDeposits),
        withdrawals: Math.round(dayWithdrawalsAmount),
        profit: Math.round(dayProfit)
      })
    }

    // Формируем ответ
    const analyticsData = {
      totalJuniors,
      activeJuniors,
      totalWithdrawals,
      pendingWithdrawals,
      approvedWithdrawals,
      rejectedWithdrawals,
      totalProfit: Math.round(totalProfit * 100) / 100,
      todayProfit: Math.round(todayProfit * 100) / 100,
      weekProfit: Math.round(weekProfit * 100) / 100,
      monthProfit: Math.round(monthProfit * 100) / 100,
      avgProcessingTime: Math.round(avgProcessingTime * 10) / 10,
      overdueWithdrawals,
      topPerformers,
      casinoStats: casinoStatsArray,
      dailyStats
    }

    return NextResponse.json(analyticsData)

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
