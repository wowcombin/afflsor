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

    // Проверка роли Team Lead
    if (currentUser.role !== 'teamlead') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')
    const teamOnly = searchParams.get('team_only') === 'true'

    // Получение Junior'ов в команде Team Lead'а
    const { data: teamJuniors } = await supabase
      .from('users')
      .select('id')
      .eq('team_lead_id', currentUser.id)
      .eq('status', 'active')

    const juniorIds = teamJuniors?.map(j => j.id) || []

    // Построение запроса задач
    let query = supabase
      .from('tasks')
      .select(`
        *,
        assignee:assignee_id(
          id,
          email,
          first_name,
          last_name,
          role
        ),
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
      .order('created_at', { ascending: false })

    if (teamOnly) {
      // Только задачи команды: созданные Team Lead'ом или назначенные его Junior'ам
      query = query.or(`created_by.eq.${currentUser.id},assignee_id.in.(${juniorIds.join(',') || 'null'})`)
    } else {
      // Все доступные задачи для Team Lead'а
      query = query.or(`created_by.eq.${currentUser.id},assignee_id.eq.${currentUser.id},assignee_id.in.(${juniorIds.join(',') || 'null'})`)
    }

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('task_status', statusFilter)
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

    console.log('Team Lead tasks loaded:', {
      teamlead_id: currentUser.id,
      total_tasks: tasksWithOverdue.length,
      team_only: teamOnly,
      status_filter: statusFilter,
      junior_ids: juniorIds
    })

    return NextResponse.json({
      success: true,
      tasks: tasksWithOverdue
    })

  } catch (error: any) {
    console.error('Team Lead tasks API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}
