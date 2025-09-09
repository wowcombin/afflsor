import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { convertToUSDSync } from '@/lib/currency'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('Analytics API called at:', new Date().toISOString())

    const supabase = await createClient()

    // Проверяем аутентификацию
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('Auth error:', authError)
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

    console.log('Date range:', { dateRange, startDate: startDate.toISOString() })

    // Используем fallback курсы вместо fetch (избегаем проблем с сетью)
    const rates: { [key: string]: number } = { 
      USD: 0.95, 
      GBP: 1.21, 
      EUR: 1.05, 
      CAD: 0.69 
    }

    // 1. Получаем общую статистику пользователей
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, role, created_at')
      .eq('role', 'junior')

    if (usersError) {
      console.error('Users error:', usersError)
      throw new Error('Failed to fetch users')
    }

    const totalJuniors = usersData?.length || 0

    // 2. Получаем активных Junior (те, кто создавал работы за период)
    // Используем данные из works с JOIN к users для получения junior_id
    const { data: activeJuniorsData, error: activeJuniorsError } = await supabase
      .from('works')
      .select(`
        users!inner(id, role)
      `)
      .gte('created_at', startDate.toISOString())
      .eq('users.role', 'junior')

    if (activeJuniorsError) {
      console.error('Active juniors error:', activeJuniorsError)
      throw new Error('Failed to fetch active juniors')
    }

    // Извлекаем уникальные ID Junior из результата
    const activeJuniorIds = Array.from(new Set(
      activeJuniorsData?.map(w => {
        const user = Array.isArray(w.users) ? w.users[0] : w.users
        return user?.id
      }).filter(Boolean) || []
    ))
    const activeJuniors = activeJuniorIds.length

    // 3. Получаем статистику выводов
    const { data: withdrawalsData, error: withdrawalsError } = await supabase
      .from('work_withdrawals')
      .select(`
        *,
        works!inner(
          deposit_amount,
          casinos!inner(name, currency),
          users!inner(id, role)
        )
      `)
      .gte('created_at', startDate.toISOString())

    if (withdrawalsError) {
      console.error('Withdrawals error:', withdrawalsError)
      throw new Error('Failed to fetch withdrawals')
    }

    const withdrawals = withdrawalsData || []
    console.log('Withdrawals count:', withdrawals.length)

    // Подсчитываем статистику
    const totalWithdrawals = withdrawals.length
    const newWithdrawals = withdrawals.filter(w => w.status === 'new').length
    const pendingWithdrawals = withdrawals.filter(w => w.status === 'waiting').length
    const approvedWithdrawals = withdrawals.filter(w => w.status === 'received').length
    const rejectedWithdrawals = withdrawals.filter(w => w.status === 'block').length

    // Подсчитываем профит
    let totalProfit = 0
    let todayProfit = 0
    let weekProfit = 0
    let monthProfit = 0

    const today = new Date()
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    withdrawals.forEach(w => {
      const work = Array.isArray(w.works) ? w.works[0] : w.works
      if (!work) return

      const casino = Array.isArray(work.casinos) ? work.casinos[0] : work.casinos
      if (!casino) return

      const depositUSD = convertToUSDSync(work.deposit_amount || 0, casino.currency || 'USD', rates)
      const withdrawalUSD = convertToUSDSync(w.withdrawal_amount || 0, casino.currency || 'USD', rates)
      const profit = withdrawalUSD - depositUSD

      totalProfit += profit

      const createdAt = new Date(w.created_at)
      if (createdAt >= monthAgo) monthProfit += profit
      if (createdAt >= weekAgo) weekProfit += profit
      if (createdAt.toDateString() === today.toDateString()) todayProfit += profit
    })

    // Просроченные выводы (>4 часа)
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000)
    const overdueWithdrawals = withdrawals.filter(w =>
      w.status === 'waiting' && new Date(w.created_at) < fourHoursAgo
    ).length

    // Среднее время обработки
    const processedWithdrawals = withdrawals.filter(w => w.status !== 'waiting')
    let avgProcessingTime = 0
    if (processedWithdrawals.length > 0) {
      const totalProcessingTime = processedWithdrawals.reduce((sum, w) => {
        const created = new Date(w.created_at).getTime()
        const updated = new Date(w.updated_at).getTime()
        return sum + (updated - created)
      }, 0)
      avgProcessingTime = totalProcessingTime / processedWithdrawals.length / (1000 * 60 * 60) // в часах
    }

    // Топ исполнители
    const juniorStats: { [key: string]: { profit: number, withdrawals: number, approved: number } } = {}

    withdrawals.forEach(w => {
      const work = Array.isArray(w.works) ? w.works[0] : w.works
      if (!work) return

      const user = Array.isArray(work.users) ? work.users[0] : work.users
      if (!user || !user.id) return

      const casino = Array.isArray(work.casinos) ? work.casinos[0] : work.casinos
      if (!casino) return

      const depositUSD = convertToUSDSync(work.deposit_amount || 0, casino.currency || 'USD', rates)
      const withdrawalUSD = convertToUSDSync(w.withdrawal_amount || 0, casino.currency || 'USD', rates)
      const profit = withdrawalUSD - depositUSD

      if (!juniorStats[user.id]) {
        juniorStats[user.id] = { profit: 0, withdrawals: 0, approved: 0 }
      }

      juniorStats[user.id].profit += profit
      juniorStats[user.id].withdrawals += 1
      if (w.status === 'received') juniorStats[user.id].approved += 1
    })

    // Получаем данные пользователей для топ исполнителей
    const { data: juniorUsersData } = await supabase
      .from('users')
      .select('id, first_name, last_name, telegram_username')
      .in('id', Object.keys(juniorStats))

    const topPerformers = Object.entries(juniorStats)
      .map(([juniorId, stats]) => {
        const user = juniorUsersData?.find(u => u.id === juniorId)
        const displayName = user?.telegram_username ||
          (user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : 'Неизвестно')

        return {
          id: juniorId,
          name: displayName,
          telegram: user?.telegram_username || '',
          profit: Math.round(stats.profit * 100) / 100,
          withdrawals: stats.withdrawals,
          successRate: stats.withdrawals > 0 ? Math.round((stats.approved / stats.withdrawals) * 100 * 100) / 100 : 0
        }
      })
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10)

    // Статистика по казино
    const casinoStats: { [key: string]: { deposits: number, withdrawals: number, profit: number, count: number, approved: number } } = {}

    withdrawals.forEach(w => {
      const work = Array.isArray(w.works) ? w.works[0] : w.works
      if (!work) return

      const casino = Array.isArray(work.casinos) ? work.casinos[0] : work.casinos
      if (!casino) return

      const depositUSD = convertToUSDSync(work.deposit_amount || 0, casino.currency || 'USD', rates)
      const withdrawalUSD = convertToUSDSync(w.withdrawal_amount || 0, casino.currency || 'USD', rates)
      const profit = withdrawalUSD - depositUSD

      if (!casinoStats[casino.name]) {
        casinoStats[casino.name] = { deposits: 0, withdrawals: 0, profit: 0, count: 0, approved: 0 }
      }

      casinoStats[casino.name].deposits += depositUSD
      casinoStats[casino.name].withdrawals += withdrawalUSD
      casinoStats[casino.name].profit += profit
      casinoStats[casino.name].count += 1
      if (w.status === 'received') casinoStats[casino.name].approved += 1
    })

    const casinoStatsArray = Object.entries(casinoStats)
      .map(([name, stats]) => ({
        name,
        totalDeposits: Math.round(stats.deposits * 100) / 100,
        totalWithdrawals: Math.round(stats.withdrawals * 100) / 100,
        profit: Math.round(stats.profit * 100) / 100,
        successRate: stats.count > 0 ? Math.round((stats.approved / stats.count) * 100 * 100) / 100 : 0
      }))
      .sort((a, b) => b.profit - a.profit)

    // Дневная статистика (последние 30 дней)
    const dailyStats = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]

      const dayWithdrawals = withdrawals.filter(w =>
        w.created_at.split('T')[0] === dateStr
      )

      let dayDeposits = 0
      let dayWithdrawalsAmount = 0
      let dayProfit = 0

      dayWithdrawals.forEach(w => {
        const work = Array.isArray(w.works) ? w.works[0] : w.works
        if (!work) return

        const casino = Array.isArray(work.casinos) ? work.casinos[0] : work.casinos
        if (!casino) return

        const depositUSD = convertToUSDSync(work.deposit_amount || 0, casino.currency || 'USD', rates)
        const withdrawalUSD = convertToUSDSync(w.withdrawal_amount || 0, casino.currency || 'USD', rates)

        dayDeposits += depositUSD
        dayWithdrawalsAmount += withdrawalUSD
        dayProfit += (withdrawalUSD - depositUSD)
      })

      return {
        date: dateStr,
        deposits: Math.round(dayDeposits * 100) / 100,
        withdrawals: Math.round(dayWithdrawalsAmount * 100) / 100,
        profit: Math.round(dayProfit * 100) / 100
      }
    }).reverse()

    // Детальная статистика по каждому статусу
    const calculateStatusStats = (status: string) => {
      const statusWithdrawals = withdrawals.filter(w => w.status === status)
      let todayAmount = 0, weekAmount = 0, monthAmount = 0

      statusWithdrawals.forEach(w => {
        const work = Array.isArray(w.works) ? w.works[0] : w.works
        if (!work) return

        const casino = Array.isArray(work.casinos) ? work.casinos[0] : work.casinos
        if (!casino) return

        const createdAt = new Date(w.created_at)
        let amount = 0

        if (status === 'block') {
          // Для заблокированных - общая потеря (сумма выводов)
          amount = convertToUSDSync(w.withdrawal_amount || 0, casino.currency || 'USD', rates)
        } else {
          // Для остальных - профит или ожидаемый профит
          const depositUSD = convertToUSDSync(work.deposit_amount || 0, casino.currency || 'USD', rates)
          const withdrawalUSD = convertToUSDSync(w.withdrawal_amount || 0, casino.currency || 'USD', rates)
          amount = withdrawalUSD - depositUSD
        }

        if (createdAt >= monthAgo) monthAmount += amount
        if (createdAt >= weekAgo) weekAmount += amount
        if (createdAt.toDateString() === today.toDateString()) todayAmount += amount
      })

      return {
        today: Math.round(todayAmount * 100) / 100,
        week: Math.round(weekAmount * 100) / 100,
        month: Math.round(monthAmount * 100) / 100
      }
    }

    const statusStats = {
      new: calculateStatusStats('new'),
      waiting: calculateStatusStats('waiting'),
      received: calculateStatusStats('received'),
      block: calculateStatusStats('block')
    }

    const analyticsData = {
      totalJuniors,
      activeJuniors,
      totalWithdrawals,
      newWithdrawals,
      pendingWithdrawals,
      approvedWithdrawals,
      rejectedWithdrawals,
      totalProfit: Math.round(totalProfit * 100) / 100,
      todayProfit: Math.round(todayProfit * 100) / 100,
      weekProfit: Math.round(weekProfit * 100) / 100,
      monthProfit: Math.round(monthProfit * 100) / 100,
      avgProcessingTime: Math.round(avgProcessingTime * 100) / 100,
      overdueWithdrawals,
      statusStats,
      topPerformers,
      casinoStats: casinoStatsArray,
      dailyStats
    }

    console.log('Analytics data prepared successfully')
    return NextResponse.json(analyticsData)

  } catch (error) {
    console.error('Analytics API error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error details:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : 'No stack trace'
    })

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}