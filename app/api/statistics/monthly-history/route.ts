import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить месячную историю статистики
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

    if (!userData || !['manager', 'cfo', 'hr', 'tester', 'admin', 'teamlead'].includes(userData.role)) {
      return NextResponse.json({ 
        error: 'Access denied',
        details: 'Недостаточно прав для просмотра месячной статистики'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const monthsCount = parseInt(searchParams.get('months') || '6') // Количество месяцев истории
    const category = searchParams.get('category') || 'all' // all, teams, casinos, banks, juniors

    // Генерируем список месяцев для анализа
    const months = []
    const currentDate = new Date()
    for (let i = 0; i < monthsCount; i++) {
      const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      months.push({
        month: `${monthDate.getFullYear()}-${(monthDate.getMonth() + 1).toString().padStart(2, '0')}`,
        name: monthDate.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long' })
      })
    }

    const results: any = {
      success: true,
      period: `${monthsCount} месяцев`,
      months: months.map(m => m.month),
      month_names: months.map(m => m.name),
      category
    }

    // Получаем месячную статистику команд
    if (category === 'all' || category === 'teams') {
      const { data: teamMonthlyStats, error: teamError } = await supabase
        .from('monthly_team_stats')
        .select(`
          *,
          team_lead:team_lead_id (
            id,
            email,
            first_name,
            last_name
          )
        `)
        .in('month', months.map(m => m.month))
        .order('month', { ascending: false })

      if (!teamError && teamMonthlyStats) {
        // Группируем по месяцам
        const teamsByMonth = teamMonthlyStats.reduce((acc, stat) => {
          if (!acc[stat.month]) acc[stat.month] = []
          acc[stat.month].push(stat)
          return acc
        }, {} as Record<string, any[]>)

        results.teams_history = {
          by_month: teamsByMonth,
          summary: teamMonthlyStats.reduce((acc, stat) => {
            acc.total_profit += parseFloat(stat.total_profit || 0)
            acc.total_works += stat.total_works_completed || 0
            acc.unique_teams++
            return acc
          }, { total_profit: 0, total_works: 0, unique_teams: 0 }),
          trends: calculateTeamTrends(teamMonthlyStats, months)
        }
      }
    }

    // Получаем месячную статистику казино
    if (category === 'all' || category === 'casinos') {
      const { data: casinoMonthlyStats, error: casinoError } = await supabase
        .from('casino_monthly_stats')
        .select(`
          *,
          casino:casino_id (
            id,
            name,
            url,
            paypal_compatible
          )
        `)
        .in('month', months.map(m => m.month))
        .order('month', { ascending: false })

      if (!casinoError && casinoMonthlyStats) {
        const casinosByMonth = casinoMonthlyStats.reduce((acc, stat) => {
          if (!acc[stat.month]) acc[stat.month] = []
          acc[stat.month].push(stat)
          return acc
        }, {} as Record<string, any[]>)

        results.casinos_history = {
          by_month: casinosByMonth,
          summary: casinoMonthlyStats.reduce((acc, stat) => {
            acc.total_profit += parseFloat(stat.total_profit || 0)
            acc.total_works += stat.total_works_completed || 0
            acc.unique_casinos++
            return acc
          }, { total_profit: 0, total_works: 0, unique_casinos: 0 }),
          trends: calculateCasinoTrends(casinoMonthlyStats, months)
        }
      }
    }

    // Получаем статистику зарплат по месяцам (из существующей таблицы)
    if (category === 'all' || category === 'salaries') {
      const { data: salaryHistory, error: salaryError } = await supabase
        .from('salary_calculations')
        .select(`
          month,
          total_salary,
          role,
          employee:employee_id (
            email,
            first_name,
            last_name
          )
        `)
        .in('month', months.map(m => m.month))
        .order('month', { ascending: false })

      if (!salaryError && salaryHistory) {
        const salariesByMonth = salaryHistory.reduce((acc, salary) => {
          if (!acc[salary.month]) acc[salary.month] = []
          acc[salary.month].push(salary)
          return acc
        }, {} as Record<string, any[]>)

        results.salaries_history = {
          by_month: salariesByMonth,
          summary: {
            total_payroll: salaryHistory.reduce((sum, s) => sum + parseFloat(s.total_salary || 0), 0),
            months_calculated: Object.keys(salariesByMonth).length,
            employees_paid: new Set(salaryHistory.map(s => (s.employee as any)?.email).filter(Boolean)).size
          }
        }
      }
    }

    // Создаем сводную хронологию
    const chronology = months.map(monthData => {
      const month = monthData.month
      const monthName = monthData.name
      
      const teamStats = results.teams_history?.by_month[month] || []
      const casinoStats = results.casinos_history?.by_month[month] || []
      const salaryStats = results.salaries_history?.by_month[month] || []
      
      return {
        month,
        month_name: monthName,
        teams: {
          count: teamStats.length,
          total_profit: teamStats.reduce((sum: number, t: any) => sum + parseFloat(t.total_profit || 0), 0),
          best_team: teamStats.sort((a: any, b: any) => parseFloat(b.total_profit || 0) - parseFloat(a.total_profit || 0))[0] || null
        },
        casinos: {
          count: casinoStats.length,
          total_profit: casinoStats.reduce((sum: number, c: any) => sum + parseFloat(c.total_profit || 0), 0),
          best_casino: casinoStats.sort((a: any, b: any) => parseFloat(b.total_profit || 0) - parseFloat(a.total_profit || 0))[0] || null
        },
        salaries: {
          total_payroll: salaryStats.reduce((sum: number, s: any) => sum + parseFloat(s.total_salary || 0), 0),
          employees_count: salaryStats.length
        }
      }
    })

    results.chronology = chronology

    console.log(`Monthly history fetched for ${userData.role} ${userData.email}: ${monthsCount} months, category: ${category}`)

    return NextResponse.json(results)

  } catch (error: any) {
    console.error('Monthly history API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}

// Функция для расчета трендов команд
function calculateTeamTrends(stats: any[], months: any[]) {
  const trends = {
    profit_trend: 'stable',
    works_trend: 'stable',
    efficiency_trend: 'stable'
  }

  if (stats.length >= 2) {
    const sorted = stats.sort((a, b) => a.month.localeCompare(b.month))
    const recent = sorted.slice(-2)
    
    if (recent.length === 2) {
      const [prev, current] = recent
      
      // Тренд прибыли
      const profitChange = ((parseFloat(current.total_profit || 0) - parseFloat(prev.total_profit || 0)) / parseFloat(prev.total_profit || 1)) * 100
      trends.profit_trend = profitChange > 10 ? 'growing' : profitChange < -10 ? 'declining' : 'stable'
      
      // Тренд работ
      const worksChange = ((current.total_works_completed - prev.total_works_completed) / (prev.total_works_completed || 1)) * 100
      trends.works_trend = worksChange > 15 ? 'growing' : worksChange < -15 ? 'declining' : 'stable'
      
      // Тренд эффективности
      const efficiencyChange = (current.month_success_rate - prev.month_success_rate)
      trends.efficiency_trend = efficiencyChange > 5 ? 'improving' : efficiencyChange < -5 ? 'declining' : 'stable'
    }
  }

  return trends
}

// Функция для расчета трендов казино
function calculateCasinoTrends(stats: any[], months: any[]) {
  const trends = {
    profit_trend: 'stable',
    success_rate_trend: 'stable',
    volume_trend: 'stable'
  }

  if (stats.length >= 2) {
    const sorted = stats.sort((a, b) => a.month.localeCompare(b.month))
    const recent = sorted.slice(-2)
    
    if (recent.length === 2) {
      const [prev, current] = recent
      
      const profitChange = ((parseFloat(current.total_profit || 0) - parseFloat(prev.total_profit || 0)) / parseFloat(prev.total_profit || 1)) * 100
      trends.profit_trend = profitChange > 10 ? 'growing' : profitChange < -10 ? 'declining' : 'stable'
      
      const successChange = (current.month_success_rate - prev.month_success_rate)
      trends.success_rate_trend = successChange > 5 ? 'improving' : successChange < -5 ? 'declining' : 'stable'
      
      const volumeChange = ((current.total_works_completed - prev.total_works_completed) / (prev.total_works_completed || 1)) * 100
      trends.volume_trend = volumeChange > 15 ? 'growing' : volumeChange < -15 ? 'declining' : 'stable'
    }
  }

  return trends
}
