import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить задачи
export async function GET(request: Request) {
    try {
        const supabase = await createClient()

        // Проверка аутентификации
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Получаем данные пользователя
        const { data: userData } = await supabase
            .from('users')
            .select('id, role, status, email')
            .eq('auth_id', user.id)
            .single()

        if (!userData || userData.status !== 'active') {
            return NextResponse.json({
                error: 'Access denied',
                details: 'Пользователь неактивен'
            }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const projectId = searchParams.get('project_id')
        const assigneeId = searchParams.get('assignee_id')
        const status = searchParams.get('status')
        const priority = searchParams.get('priority')
        const myTasks = searchParams.get('my_tasks') === 'true'

        // Базовый запрос
        let query = supabase
            .from('tasks')
            .select(`
        *,
        project:project_id (
          id,
          title,
          project_type,
          status
        ),
        assignee:assignee_id (
          id,
          email,
          first_name,
          last_name,
          role
        ),
        created_by_user:created_by (
          email,
          first_name,
          last_name,
          role
        ),
        team_lead:team_lead_id (
          email,
          first_name,
          last_name
        ),
        parent_task:parent_task_id (
          id,
          title
        ),
        task_comments (
          id,
          content,
          created_at,
          user:user_id (
            email,
            first_name,
            last_name
          )
        )
      `)

        // Фильтры
        if (projectId) {
            query = query.eq('project_id', projectId)
        }
        if (assigneeId) {
            query = query.eq('assignee_id', assigneeId)
        }
        if (status) {
            query = query.eq('task_status', status)
        }
        if (priority) {
            query = query.eq('priority', priority)
        }
        if (myTasks) {
            query = query.eq('assignee_id', userData.id)
        }

        const { data: tasks, error } = await query
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Tasks fetch error:', error)
            return NextResponse.json({
                error: 'Ошибка получения задач',
                details: error.message
            }, { status: 500 })
        }

        // Обогащаем данные
        const enrichedTasks = tasks?.map(task => ({
            ...task,
            is_overdue: task.due_date && new Date(task.due_date) < new Date() && task.task_status !== 'done',
            comments_count: task.task_comments?.length || 0,
            checklist_progress: task.checklist ?
                calculateChecklistProgress(task.checklist) : { completed: 0, total: 0, percentage: 0 }
        })) || []

        console.log(`Tasks fetched for ${userData.role} ${userData.email}: ${enrichedTasks.length} tasks`)

        return NextResponse.json({
            success: true,
            tasks: enrichedTasks
        })

    } catch (error: any) {
        console.error('Tasks API error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}

// POST - Создать новую задачу
export async function POST(request: Request) {
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

        if (!userData || !['ceo', 'cfo', 'manager', 'hr', 'admin', 'teamlead'].includes(userData.role)) {
            return NextResponse.json({
                error: 'Access denied',
                details: 'Недостаточно прав для создания задач'
            }, { status: 403 })
        }

        const body = await request.json()
        const {
            title,
            description,
            project_id,
            assignee_id,
            priority = 'medium',
            due_date,
            estimated_hours,
            parent_task_id,
            tags,
            checklist
        } = body

        if (!title) {
            return NextResponse.json({
                error: 'Заполните обязательные поля',
                details: 'Название задачи обязательно'
            }, { status: 400 })
        }

        // Определяем team_lead_id для Junior'а
        let teamLeadId = null
        if (assignee_id) {
            const { data: assignee } = await supabase
                .from('users')
                .select('id, role, team_lead_id')
                .eq('id', assignee_id)
                .single()

            if (assignee?.role === 'junior') {
                teamLeadId = assignee.team_lead_id
            }
        }

        // Создаем задачу
        const { data: task, error: createError } = await supabase
            .from('tasks')
            .insert({
                title: title.trim(),
                description: description?.trim() || null,
                project_id: project_id || null,
                assignee_id: assignee_id || null,
                created_by: userData.id,
                team_lead_id: teamLeadId,
                priority,
                due_date: due_date || null,
                estimated_hours: estimated_hours ? parseFloat(estimated_hours) : null,
                parent_task_id: parent_task_id || null,
                tags: tags || null,
                checklist: checklist || null
            })
            .select()
            .single()

        if (createError) {
            console.error('Task creation error:', createError)
            return NextResponse.json({
                error: 'Ошибка создания задачи',
                details: createError.message
            }, { status: 500 })
        }

        console.log('✅ Task created:', {
            createdBy: userData.email,
            title: task.title,
            assigneeId: assignee_id,
            projectId: project_id
        })

        return NextResponse.json({
            success: true,
            task,
            message: `Задача "${task.title}" создана`
        })

    } catch (error: any) {
        console.error('Task creation error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}

// Функция для расчета прогресса чек-листа
function calculateChecklistProgress(checklist: any) {
    if (!checklist || !Array.isArray(checklist)) {
        return { completed: 0, total: 0, percentage: 0 }
    }

    const total = checklist.length
    const completed = checklist.filter((item: any) => item.completed === true).length
    const percentage = total > 0 ? (completed / total) * 100 : 0

    return { completed, total, percentage }
}
