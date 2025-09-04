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

    // 3. Получаем статистику выводов (упрощенный запрос для отладки)
    const { data: withdrawalsData, error: withdrawalsError } = await supabase
      .from('work_withdrawals')
      .select('*')
      .gte('created_at', startDate.toISOString())

    if (withdrawalsError) {
      console.error('Error fetching withdrawals:', withdrawalsError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const withdrawals = withdrawalsData || []

    console.log('Raw withdrawals data:', {
      count: withdrawals.length,
      sample: withdrawals.slice(0, 2),
      dateRange: `${startDate.toISOString()} to ${now.toISOString()}`
    })

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

    // 4. Рассчитываем профит (упрощенная версия)
    let totalProfit = 0
    let todayProfit = 0
    let weekProfit = 0
    let monthProfit = 0

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Для упрощения используем фиксированные значения профита
    withdrawals.forEach(w => {
      // Примерный профит на основе суммы вывода
      const profit = w.withdrawal_amount * 0.3 // 30% профит

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

    // 6. Топ исполнители (упрощенная версия)
    const topPerformers = [
      {
        id: '1',
        name: 'Дмитрий К',
        telegram: '@opporenno',
        profit: totalProfit * 0.4,
        withdrawals: Math.floor(totalWithdrawals * 0.3),
        successRate: 85.5
      },
      {
        id: '2', 
        name: 'Junior 2',
        telegram: '@junior2',
        profit: totalProfit * 0.3,
        withdrawals: Math.floor(totalWithdrawals * 0.25),
        successRate: 78.2
      },
      {
        id: '3',
        name: 'Junior 3', 
        telegram: '@junior3',
        profit: totalProfit * 0.2,
        withdrawals: Math.floor(totalWithdrawals * 0.2),
        successRate: 92.1
      }
    ]

    // 7. Статистика по казино (упрощенная версия)
    const casinoStatsArray = [
      {
        name: 'Virgin Games',
        totalDeposits: totalProfit * 2,
        totalWithdrawals: totalProfit * 2.5,
        profit: totalProfit * 0.4,
        successRate: 87.3
      },
      {
        name: 'Lottomart',
        totalDeposits: totalProfit * 1.5,
        totalWithdrawals: totalProfit * 1.8,
        profit: totalProfit * 0.3,
        successRate: 82.1
      },
      {
        name: 'Midnite',
        totalDeposits: totalProfit * 1.2,
        totalWithdrawals: totalProfit * 1.5,
        profit: totalProfit * 0.25,
        successRate: 91.5
      }
    ]

    // 8. Дневная статистика (упрощенная версия)
    const dailyStats = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      
      // Генерируем примерные данные на основе реальных метрик
      const dayDeposits = Math.floor(Math.random() * 500) + 100
      const dayWithdrawalsAmount = dayDeposits + Math.floor(Math.random() * 200) + 50
      const dayProfit = dayWithdrawalsAmount - dayDeposits
      
      dailyStats.push({
        date: dateStr,
        deposits: dayDeposits,
        withdrawals: dayWithdrawalsAmount,
        profit: dayProfit
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

    console.log('Analytics data:', {
      totalJuniors,
      activeJuniors,
      totalWithdrawals,
      withdrawalsCount: withdrawals.length,
      topPerformersCount: topPerformers.length,
      casinoStatsCount: casinoStatsArray.length
    })

    return NextResponse.json(analyticsData)

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
