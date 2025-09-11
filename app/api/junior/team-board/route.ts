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
      .select('id, role, status, team_lead_id')
      .eq('auth_id', user.id)
      .single()

    if (!currentUser || currentUser.status !== 'active') {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 403 })
    }

    // Проверка роли Junior
    if (currentUser.role !== 'junior') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (!currentUser.team_lead_id) {
      return NextResponse.json({ 
        success: true,
        tasks: [],
        team_members: [],
        message: 'Junior не назначен к Team Lead\'у'
      })
    }

    // Получение других Junior'ов в команде (под тем же Team Lead'ом)
    const { data: teamMembers, error: teamError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, status')
      .eq('team_lead_id', currentUser.team_lead_id)
      .eq('role', 'junior')
      .eq('status', 'active')
      .neq('id', currentUser.id) // Исключаем текущего пользователя

    if (teamError) {
      console.error('Error loading team members:', teamError)
      // Продолжаем выполнение, участники команды не критичны
    }

    // Получение всех Junior'ов команды (включая текущего)
    const allJuniorIds = [currentUser.id, ...(teamMembers || []).map(m => m.id)]

    // Получение задач всех Junior'ов команды
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:assignee_id(
          id,
          email,
          first_name,
          last_name,
          role,
          status
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
      .in('assignee_id', allJuniorIds)
      .order('created_at', { ascending: false })

    if (tasksError) {
      throw tasksError
    }

    // Добавляем информацию о просроченности
    const tasksWithOverdue = (tasks || []).map(task => ({
      ...task,
      is_overdue: task.due_date && new Date(task.due_date) < new Date() && task.task_status !== 'done'
    }))

    console.log('Junior team board loaded:', {
      junior_id: currentUser.id,
      team_lead_id: currentUser.team_lead_id,
      team_members_count: (teamMembers || []).length,
      total_tasks: tasksWithOverdue.length,
      junior_ids: allJuniorIds
    })

    return NextResponse.json({
      success: true,
      tasks: tasksWithOverdue,
      team_members: teamMembers || [],
      current_user: {
        id: currentUser.id,
        team_lead_id: currentUser.team_lead_id
      }
    })

  } catch (error: any) {
    console.error('Junior team board API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}
