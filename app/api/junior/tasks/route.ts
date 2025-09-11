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
            .select('id, role, status')
            .eq('auth_id', user.id)
            .single()

        if (!currentUser || currentUser.status !== 'active') {
            return NextResponse.json({ error: 'User not found or inactive' }, { status: 403 })
        }

        // Проверка роли Junior
        if (currentUser.role !== 'junior') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const statusParam = searchParams.get('status')

        // Построение запроса задач
        let query = supabase
            .from('tasks')
            .select(`
        *,
        project:project_id(
          id,
          title,
          project_type
        ),
        created_by_user:created_by(
          email,
          first_name,
          last_name,
          role
        )
      `)
            .eq('assignee_id', currentUser.id)
            .order('created_at', { ascending: false })

        // Фильтрация по статусу
        if (statusParam && statusParam !== 'all') {
            if (statusParam.includes(',')) {
                // Множественные статусы (например, "todo,in_progress,review")
                const statuses = statusParam.split(',')
                query = query.in('task_status', statuses)
            } else {
                query = query.eq('task_status', statusParam)
            }
        }

        const { data: tasks, error } = await query

        if (error) {
            throw error
        }

        // Добавляем информацию о просроченности
        const tasksWithOverdue = (tasks || []).map(task => ({
            ...task,
            is_overdue: task.due_date && new Date(task.due_date) < new Date() && task.task_status !== 'done'
        }))

        console.log('Junior tasks loaded:', {
            junior_id: currentUser.id,
            total_tasks: tasksWithOverdue.length,
            status_filter: statusParam || 'all'
        })

        return NextResponse.json({
            success: true,
            tasks: tasksWithOverdue
        })

    } catch (error: any) {
        console.error('Junior tasks API error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}
