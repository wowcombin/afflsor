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

        // Определение временного диапазона
        let dateFilter = new Date()
        switch (timeRange) {
            case '1month':
                dateFilter.setMonth(dateFilter.getMonth() - 1)
                break
            case '3months':
                dateFilter.setMonth(dateFilter.getMonth() - 3)
                break
            case '6months':
                dateFilter.setMonth(dateFilter.getMonth() - 6)
                break
            case '1year':
                dateFilter.setFullYear(dateFilter.getFullYear() - 1)
                break
            default:
                dateFilter.setMonth(dateFilter.getMonth() - 3)
        }

        // Получение статистики по департаментам через проекты
        const { data: departmentData, error } = await supabase
            .from('projects')
            .select(`
        project_type,
        tasks(
          id,
          task_status,
          created_at,
          updated_at,
          actual_hours,
          assignee:assignee_id(role)
        )
      `)
            .gte('created_at', dateFilter.toISOString())

        if (error) {
            throw error
        }

        // Обработка данных по департаментам
        const departmentStats: any[] = []
        const deptMap = new Map()

        // Группировка по типам проектов (департаментам)
        departmentData?.forEach((project: any) => {
            const deptType = project.project_type || 'general'

            if (!deptMap.has(deptType)) {
                deptMap.set(deptType, {
                    department: deptType,
                    total_tasks: 0,
                    completed_tasks: 0,
                    in_progress_tasks: 0,
                    overdue_tasks: 0,
                    total_hours: 0,
                    completed_hours: 0
                })
            }

            const dept = deptMap.get(deptType)

            project.tasks?.forEach((task: any) => {
                dept.total_tasks++

                if (task.task_status === 'done') {
                    dept.completed_tasks++
                    dept.completed_hours += task.actual_hours || 0
                } else if (task.task_status === 'in_progress') {
                    dept.in_progress_tasks++
                }

                // Проверка на просроченность
                if (task.due_date && new Date(task.due_date) < new Date() && task.task_status !== 'done') {
                    dept.overdue_tasks++
                }

                dept.total_hours += task.actual_hours || 0
            })
        })

        // Преобразование в массив с вычисленными метриками
        deptMap.forEach((dept, deptType) => {
            const completionRate = dept.total_tasks > 0 ? (dept.completed_tasks / dept.total_tasks) * 100 : 0
            const avgCompletionTime = dept.completed_tasks > 0 ? dept.completed_hours / dept.completed_tasks : 0

            departmentStats.push({
                department: deptType,
                total_tasks: dept.total_tasks,
                completed_tasks: dept.completed_tasks,
                in_progress_tasks: dept.in_progress_tasks,
                overdue_tasks: dept.overdue_tasks,
                completion_rate: completionRate,
                avg_completion_time: avgCompletionTime
            })
        })

        // Сортировка по количеству задач
        departmentStats.sort((a, b) => b.total_tasks - a.total_tasks)

        console.log('Department analytics loaded:', {
            time_range: timeRange,
            departments_count: departmentStats.length,
            requested_by: user.email
        })

        return NextResponse.json({
            success: true,
            departments: departmentStats
        })

    } catch (error: any) {
        console.error('Department analytics API error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}
