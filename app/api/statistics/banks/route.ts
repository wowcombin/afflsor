import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить статистику банков (включая PayPal как отдельный "банк")
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
                details: 'Недостаточно прав для просмотра статистики банков'
            }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const period = searchParams.get('period') || 'today'

        // Получаем статистику обычных банков
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

        if (bankError) {
            console.error('Bank statistics fetch error:', bankError)
            return NextResponse.json({
                error: 'Ошибка получения статистики банков',
                details: bankError.message
            }, { status: 500 })
        }

        // Получаем статистику PayPal (как отдельного "банка")
        const { data: paypalReport, error: paypalError } = await fetch(`${request.url.split('/api')[0]}/api/paypal/reports?period=${period}`)
            .then(res => res.ok ? res.json() : null)
            .catch(() => null)

        // Фильтруем статистику банков по датам
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

        // Агрегируем статистику по банкам
        const aggregatedBankStats = filteredBankStats.reduce((acc, stat) => {
            const bankId = stat.bank_id

            if (!acc[bankId]) {
                acc[bankId] = {
                    bank: stat.bank,
                    period_stats: {
                        total_days: 0,
                        total_works_created: 0,
                        total_works_completed: 0,
                        total_deposits: 0,
                        total_withdrawals: 0,
                        total_profit: 0,
                        avg_success_rate: 0,
                        best_day_profit: 0,
                        unique_cards: new Set(),
                        unique_users: new Set(),
                        unique_casinos: new Set()
                    },
                    daily_stats: []
                }
            }

            const bankData = acc[bankId]
            bankData.period_stats.total_days++
            bankData.period_stats.total_works_created += stat.works_created || 0
            bankData.period_stats.total_works_completed += stat.works_completed || 0
            bankData.period_stats.total_deposits += parseFloat(stat.total_deposits || 0)
            bankData.period_stats.total_withdrawals += parseFloat(stat.total_withdrawals || 0)
            bankData.period_stats.total_profit += parseFloat(stat.total_profit || 0)
            bankData.period_stats.best_day_profit = Math.max(bankData.period_stats.best_day_profit, parseFloat(stat.total_profit || 0))

            bankData.daily_stats.push(stat)

            return acc
        }, {} as Record<string, any>)

        // Финализируем данные банков
        Object.values(aggregatedBankStats).forEach((bankData: any) => {
            const days = bankData.period_stats.total_days
            if (days > 0) {
                bankData.period_stats.avg_success_rate = bankData.daily_stats.reduce((sum: number, day: any) => sum + (day.success_rate || 0), 0) / days
            }

            // Убираем Set объекты
            bankData.period_stats.unique_cards_count = bankData.period_stats.unique_cards.size
            bankData.period_stats.unique_users_count = bankData.period_stats.unique_users.size
            bankData.period_stats.unique_casinos_count = bankData.period_stats.unique_casinos.size
            delete bankData.period_stats.unique_cards
            delete bankData.period_stats.unique_users
            delete bankData.period_stats.unique_casinos
        })

        // Сортируем банки по прибыли
        const sortedBanks = Object.values(aggregatedBankStats).sort((a: any, b: any) =>
            b.period_stats.total_profit - a.period_stats.total_profit
        )

        // Добавляем рейтинги
        sortedBanks.forEach((bank: any, index) => {
            bank.period_stats.profit_rank = index + 1
        })

        // Создаем сравнительную статистику: Банки vs PayPal
        const comparison = {
            banks: {
                count: sortedBanks.length,
                total_profit: sortedBanks.reduce((sum, bank: any) => sum + bank.period_stats.total_profit, 0),
                total_works: sortedBanks.reduce((sum, bank: any) => sum + bank.period_stats.total_works_completed, 0),
                avg_success_rate: sortedBanks.length > 0 ?
                    (sortedBanks as any[]).reduce((sum, bank: any) => sum + bank.period_stats.avg_success_rate, 0) / sortedBanks.length : 0
            },
            paypal: paypalReport ? {
                count: paypalReport.summary?.total_accounts || 0,
                total_profit: paypalReport.summary?.total_profit || 0,
                total_works: paypalReport.summary?.completed_works || 0,
                avg_success_rate: paypalReport.summary?.profit_margin || 0
            } : {
                count: 0,
                total_profit: 0,
                total_works: 0,
                avg_success_rate: 0
            }
        }

        console.log(`Bank statistics fetched for ${userData.role} ${userData.email}: ${sortedBanks.length} banks, period: ${period}`)

        return NextResponse.json({
            success: true,
            period,
            banks: sortedBanks,
            paypal_summary: paypalReport?.summary || null,
            comparison,
            summary: {
                total_banks: sortedBanks.length,
                total_profit: sortedBanks.reduce((sum, bank: any) => sum + bank.period_stats.total_profit, 0),
                total_works: sortedBanks.reduce((sum, bank: any) => sum + bank.period_stats.total_works_completed, 0),
                avg_success_rate: sortedBanks.length > 0 ?
                    (sortedBanks as any[]).reduce((sum, bank: any) => sum + bank.period_stats.avg_success_rate, 0) / sortedBanks.length : 0
            }
        })

    } catch (error: any) {
        console.error('Bank statistics API error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}
