import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить статистику команд Team Lead'ов
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
                details: 'Недостаточно прав для просмотра статистики команд'
            }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const period = searchParams.get('period') || 'today' // today, 3days, week, 2weeks, month
        const teamLeadId = searchParams.get('team_lead_id') // Для фильтрации по конкретному Team Lead

        // Определяем диапазон дат
        let dateFilter = ''
        const today = new Date()

        switch (period) {
            case 'today':
                dateFilter = `date = CURRENT_DATE`
                break
            case '3days':
                dateFilter = `date >= CURRENT_DATE - INTERVAL '2 days'`
                break
            case 'week':
                dateFilter = `date >= CURRENT_DATE - INTERVAL '6 days'`
                break
            case '2weeks':
                dateFilter = `date >= CURRENT_DATE - INTERVAL '13 days'`
                break
            case 'month':
                dateFilter = `date >= DATE_TRUNC('month', CURRENT_DATE)`
                break
            default:
                dateFilter = `date = CURRENT_DATE`
        }

        // Базовый запрос
        let query = supabase
            .from('team_daily_stats')
            .select(`
        *,
        team_lead:team_lead_id (
          id,
          email,
          first_name,
          last_name,
          status
        )
      `)

        // Фильтрация по Team Lead (если роль teamlead или указан конкретный ID)
        if (userData.role === 'teamlead') {
            query = query.eq('team_lead_id', userData.id)
        } else if (teamLeadId) {
            query = query.eq('team_lead_id', teamLeadId)
        }

        const { data: teamStats, error } = await query
            .order('date', { ascending: false })

        if (error) {
            console.error('Team statistics fetch error:', error)
            return NextResponse.json({
                error: 'Ошибка получения статистики команд',
                details: error.message
            }, { status: 500 })
        }

        // Фильтруем по датам (так как RLS не поддерживает сложные условия)
        const filteredStats = teamStats?.filter(stat => {
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

        // Агрегируем статистику по периоду
        const aggregatedStats = filteredStats.reduce((acc, stat) => {
            const teamLeadId = stat.team_lead_id

            if (!acc[teamLeadId]) {
                acc[teamLeadId] = {
                    team_lead: stat.team_lead,
                    period_stats: {
                        total_days: 0,
                        avg_juniors_count: 0,
                        total_works_created: 0,
                        total_works_completed: 0,
                        total_deposits: 0,
                        total_withdrawals: 0,
                        total_profit: 0,
                        avg_success_rate: 0,
                        best_day_profit: 0,
                        total_card_profit: 0,
                        total_paypal_profit: 0
                    },
                    daily_stats: []
                }
            }

            const teamData = acc[teamLeadId]
            teamData.period_stats.total_days++
            teamData.period_stats.total_works_created += stat.total_works_created || 0
            teamData.period_stats.total_works_completed += stat.total_works_completed || 0
            teamData.period_stats.total_deposits += parseFloat(stat.total_deposits || 0)
            teamData.period_stats.total_withdrawals += parseFloat(stat.total_withdrawals || 0)
            teamData.period_stats.total_profit += parseFloat(stat.total_profit || 0)
            teamData.period_stats.total_card_profit += parseFloat(stat.card_total_profit || 0)
            teamData.period_stats.total_paypal_profit += parseFloat(stat.paypal_total_profit || 0)
            teamData.period_stats.best_day_profit = Math.max(teamData.period_stats.best_day_profit, parseFloat(stat.total_profit || 0))

            teamData.daily_stats.push(stat)

            return acc
        }, {} as Record<string, any>)

        // Рассчитываем средние значения
        Object.values(aggregatedStats).forEach((teamData: any) => {
            const days = teamData.period_stats.total_days
            if (days > 0) {
                teamData.period_stats.avg_juniors_count = teamData.daily_stats.reduce((sum: number, day: any) => sum + (day.active_juniors_count || 0), 0) / days
                teamData.period_stats.avg_success_rate = teamData.daily_stats.reduce((sum: number, day: any) => sum + (day.success_rate || 0), 0) / days
            }
        })

        // Сортируем команды по прибыли
        const sortedTeams = Object.values(aggregatedStats).sort((a: any, b: any) =>
            b.period_stats.total_profit - a.period_stats.total_profit
        )

        // Добавляем рейтинги
        sortedTeams.forEach((team: any, index) => {
            team.period_stats.profit_rank = index + 1
        })

        console.log(`Statistics fetched for ${userData.role} ${userData.email}: ${sortedTeams.length} teams, period: ${period}`)

        return NextResponse.json({
            success: true,
            period,
            total_teams: sortedTeams.length,
            teams: sortedTeams,
            summary: {
                total_profit: sortedTeams.reduce((sum, team: any) => sum + team.period_stats.total_profit, 0),
                total_works: sortedTeams.reduce((sum, team: any) => sum + team.period_stats.total_works_completed, 0),
                avg_success_rate: sortedTeams.length > 0 ?
                    (sortedTeams as any[]).reduce((sum, team: any) => sum + team.period_stats.avg_success_rate, 0) / sortedTeams.length : 0
            }
        })

    } catch (error: any) {
        console.error('Team statistics API error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}
