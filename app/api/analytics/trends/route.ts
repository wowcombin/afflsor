import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Проверка аутентификации
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Получение текущего пользователя
        const { data: currentUser } = await supabase
            .from('users')
            .select('role, status')
            .eq('auth_id', user.id)
            .single()

        if (!currentUser || currentUser.status !== 'active') {
            return NextResponse.json({ error: 'User not found or inactive' }, { status: 403 })
        }

        // Проверка роли (только C-Level и Manager)
        const allowedRoles = ['admin', 'manager', 'cfo']
        if (!allowedRoles.includes(currentUser.role)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const timeRange = searchParams.get('time_range') || '3months'

        // Определение количества месяцев для анализа
        let monthsCount = 3
        switch (timeRange) {
            case '1month':
                monthsCount = 1
                break
            case '3months':
                monthsCount = 3
                break
            case '6months':
                monthsCount = 6
                break
            case '1year':
                monthsCount = 12
                break
        }

        // Получение данных по месяцам
        const monthlyTrends: any[] = []

        for (let i = monthsCount - 1; i >= 0; i--) {
            const startDate = new Date()
            startDate.setMonth(startDate.getMonth() - i)
            startDate.setDate(1)
            startDate.setHours(0, 0, 0, 0)

            const endDate = new Date(startDate)
            endDate.setMonth(endDate.getMonth() + 1)
            endDate.setDate(0)
            endDate.setHours(23, 59, 59, 999)

            // Получение задач за месяц
            const { data: monthTasks, error: monthError } = await supabase
                .from('tasks')
                .select('id, task_status, created_at, updated_at')
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString())

            if (monthError) {
                console.error(`Error loading tasks for month ${i}:`, monthError)
                continue
            }

            // Получение завершенных задач за месяц
            const { data: completedTasks, error: completedError } = await supabase
                .from('tasks')
                .select('id')
                .eq('task_status', 'done')
                .gte('updated_at', startDate.toISOString())
                .lte('updated_at', endDate.toISOString())

            if (completedError) {
                console.error(`Error loading completed tasks for month ${i}:`, completedError)
            }

            const createdCount = monthTasks?.length || 0
            const completedCount = completedTasks?.length || 0
            const completionRate = createdCount > 0 ? (completedCount / createdCount) * 100 : 0

            monthlyTrends.push({
                month: startDate.toLocaleDateString('ru-RU', {
                    year: 'numeric',
                    month: 'long'
                }),
                created_tasks: createdCount,
                completed_tasks: completedCount,
                completion_rate: completionRate,
                month_date: startDate.toISOString()
            })
        }

        // Сортировка по дате (новые первыми)
        monthlyTrends.sort((a, b) => new Date(b.month_date).getTime() - new Date(a.month_date).getTime())

        console.log('Monthly trends loaded:', {
            time_range: timeRange,
            months_analyzed: monthsCount,
            trends_count: monthlyTrends.length,
            requested_by: user.email
        })

        return NextResponse.json({
            success: true,
            trends: monthlyTrends
        })

    } catch (error: any) {
        console.error('Trends analytics API error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}
