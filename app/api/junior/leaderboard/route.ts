import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Функция конвертации валют (синхронная версия)
function convertToUSDSync(amount: number, currency: string, rates: any): number {
  const rate = rates[currency] || 1
  return amount * rate
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Проверка аутентификации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Junior Leaderboard API called:', { user: user.email })

    const { data: userData } = await supabase
      .from('users')
      .select('id, role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData || userData.status !== 'active' || userData.role !== 'junior') {
      return NextResponse.json({ error: 'Access denied - только для Junior' }, { status: 403 })
    }

    // Получаем параметры запроса
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'current_month' // current_month, last_month, all_time

    // Определяем временные рамки
    let startDate: Date
    let endDate: Date
    const now = new Date()

    switch (period) {
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
        break
      case 'all_time':
        startDate = new Date(2024, 0, 1) // Начало 2024 года
        endDate = now
        break
      case 'current_month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = now
        break
    }

    // Получаем всех активных Junior'ов
    const { data: allJuniors, error: juniorsError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        created_at,
        salary_percentage
      `)
      .eq('role', 'junior')
      .eq('status', 'active')

    if (juniorsError) {
      console.error('Error fetching juniors:', juniorsError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Получаем работы за период
    const { data: works, error: worksError } = await supabase
      .from('works')
      .select(`
        id,
        junior_id,
        deposit_amount,
        created_at,
        casinos (
          id,
          name,
          currency
        )
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (worksError) {
      console.error('Error fetching works:', worksError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Получаем выводы за период
    const workIds = works?.map(w => w.id) || []
    let withdrawals: any[] = []
    
    if (workIds.length > 0) {
      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from('work_withdrawals')
        .select(`
          id,
          work_id,
          withdrawal_amount,
          status,
          created_at
        `)
        .in('work_id', workIds)
        .eq('status', 'received') // Только успешные выводы

      if (withdrawalsError) {
        console.error('Error fetching withdrawals:', withdrawalsError)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      withdrawals = withdrawalsData || []
    }

    // Курсы валют (упрощенные)
    const rates = {
      'USD': 1.0,
      'EUR': 1.09,
      'GBP': 1.27,
      'CAD': 0.74
    }

    // Рассчитываем статистику для каждого Junior'а
    const juniorStats = allJuniors?.map(junior => {
      const juniorWorks = works?.filter(w => w.junior_id === junior.id) || []
      const juniorWithdrawals = withdrawals.filter(w => 
        juniorWorks.some(work => work.id === w.work_id)
      )

      let totalProfit = 0
      let totalDeposits = 0
      let totalWithdrawals = 0
      let successfulWorks = 0
      let biggestWin = 0
      let biggestWinCasino = ''

      juniorWorks.forEach(work => {
        const workWithdrawals = juniorWithdrawals.filter(w => w.work_id === work.id)
        const currency = (work.casinos as any)?.currency || 'USD'
        const depositUSD = convertToUSDSync(work.deposit_amount, currency, rates)
        
        totalDeposits += depositUSD

        if (workWithdrawals.length > 0) {
          successfulWorks++
          
          workWithdrawals.forEach(withdrawal => {
            const withdrawalUSD = convertToUSDSync(withdrawal.withdrawal_amount, currency, rates)
            totalWithdrawals += withdrawalUSD
            
            const workProfit = withdrawalUSD - depositUSD
            totalProfit += workProfit
            
            // Отслеживаем самый большой выигрыш
            if (workProfit > biggestWin) {
              biggestWin = workProfit
              biggestWinCasino = (work.casinos as any)?.name || 'Неизвестное казино'
            }
          })
        }
      })

      const totalWorks = juniorWorks.length
      const successRate = totalWorks > 0 ? (successfulWorks / totalWorks) * 100 : 0
      const avgProfitPerWork = successfulWorks > 0 ? totalProfit / successfulWorks : 0

      return {
        id: junior.id,
        name: `${junior.first_name || ''} ${junior.last_name || ''}`.trim() || junior.email,
        email: junior.email,
        totalProfit: Math.round(totalProfit * 100) / 100,
        totalWorks,
        successfulWorks,
        successRate: Math.round(successRate * 100) / 100,
        avgProfitPerWork: Math.round(avgProfitPerWork * 100) / 100,
        biggestWin: Math.round(biggestWin * 100) / 100,
        biggestWinCasino,
        salaryPercentage: junior.salary_percentage || 10,
        estimatedEarnings: Math.round(totalProfit * (junior.salary_percentage || 10) / 100 * 100) / 100,
        joinedDate: junior.created_at,
        isCurrentUser: junior.id === userData.id
      }
    }) || []

    // Сортируем по профиту
    juniorStats.sort((a, b) => b.totalProfit - a.totalProfit)

    // Добавляем позицию в рейтинге
    juniorStats.forEach((junior, index) => {
      (junior as any).rank = index + 1
    })

    // Общая статистика
    const totalCompanyProfit = juniorStats.reduce((sum, j) => sum + j.totalProfit, 0)
    const totalCompanyWorks = juniorStats.reduce((sum, j) => sum + j.totalWorks, 0)
    const totalSuccessfulWorks = juniorStats.reduce((sum, j) => sum + j.successfulWorks, 0)
    const avgCompanySuccessRate = totalCompanyWorks > 0 ? (totalSuccessfulWorks / totalCompanyWorks) * 100 : 0

    // Находим лидера месяца
    const monthLeader = juniorStats[0] || null

    // Мотивационные сообщения
    const motivationalMessages = [
      "🚀 Каждая работа - это шаг к финансовой свободе!",
      "💰 Твой успех зависит только от твоих усилий!",
      "🏆 Стань лидером месяца и получи бонус!",
      "⚡ Чем больше работаешь, тем больше зарабатываешь!",
      "🎯 Поставь цель и достигни её!",
      "💪 Упорство и труд всё перетрут!",
      "🌟 Ты можешь больше, чем думаешь!",
      "🔥 Зажги этот месяц своими результатами!"
    ]

    const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]

    // Достижения и бейджи
    const achievements = []
    const currentUser = juniorStats.find(j => j.isCurrentUser)
    
    if (currentUser) {
      const userRank = (currentUser as any).rank
      if (userRank === 1) achievements.push({ title: "👑 Лидер месяца", description: "Первое место в рейтинге!" })
      if (userRank <= 3) achievements.push({ title: "🥉 Топ-3", description: "В тройке лучших!" })
      if (currentUser.successRate >= 80) achievements.push({ title: "🎯 Снайпер", description: "Успешность 80%+" })
      if (currentUser.totalWorks >= 50) achievements.push({ title: "🔥 Трудяга", description: "50+ работ за период" })
      if (currentUser.biggestWin >= 1000) achievements.push({ title: "💎 Крупный выигрыш", description: "Выигрыш $1000+" })
    }

    return NextResponse.json({
      success: true,
      period,
      leaderboard: juniorStats,
      companyStats: {
        totalProfit: Math.round(totalCompanyProfit * 100) / 100,
        totalWorks: totalCompanyWorks,
        avgSuccessRate: Math.round(avgCompanySuccessRate * 100) / 100,
        activeJuniors: juniorStats.length
      },
      monthLeader,
      motivationalMessage: randomMessage,
      achievements,
      currentUserRank: (currentUser as any)?.rank || null
    })

  } catch (error) {
    console.error('Junior Leaderboard API Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
