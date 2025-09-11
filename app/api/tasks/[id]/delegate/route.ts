import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const taskId = params.id
    const body = await request.json()
    const { assignee_id, due_date, notes } = body

    if (!assignee_id) {
      return NextResponse.json({ 
        error: 'Assignee is required' 
      }, { status: 400 })
    }

    // Получение задачи
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Проверка прав на делегирование
    const canDelegate = 
      // Создатель задачи
      task.created_by === currentUser.id ||
      // Team Lead может делегировать задачи своих Junior'ов
      (currentUser.role === 'teamlead') ||
      // Manager может делегировать любые задачи
      (currentUser.role === 'manager') ||
      // Admin может делегировать любые задачи
      (currentUser.role === 'admin')

    if (!canDelegate) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Проверка получателя делегирования
    const { data: assignee, error: assigneeError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, status, team_lead_id')
      .eq('id', assignee_id)
      .single()

    if (assigneeError || !assignee || assignee.status !== 'active') {
      return NextResponse.json({ error: 'Invalid assignee' }, { status: 400 })
    }

    // Дополнительная проверка для Team Lead - может назначать только своим Junior'ам
    if (currentUser.role === 'teamlead' && assignee.team_lead_id !== currentUser.id) {
      return NextResponse.json({ 
        error: 'Team Lead can only delegate to their own juniors' 
      }, { status: 403 })
    }

    // Обновление задачи
    const updateData: any = {
      assignee_id,
      updated_at: new Date().toISOString()
    }

    if (due_date) {
      updateData.due_date = due_date
    }

    // Если задача была в статусе "backlog", переводим в "todo"
    if (task.task_status === 'backlog') {
      updateData.task_status = 'todo'
    }

    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select(`
        *,
        assignee:assignee_id(
          id,
          email,
          first_name,
          last_name,
          role
        ),
        created_by_user:created_by(
          email,
          first_name,
          last_name,
          role
        )
      `)
      .single()

    if (updateError) {
      throw updateError
    }

    // Создание комментария о делегировании (если есть заметки)
    if (notes) {
      const { error: commentError } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          user_id: currentUser.id,
          content: `Задача делегирована: ${notes}`,
          comment_type: 'delegation'
        })

      if (commentError) {
        console.error('Failed to create delegation comment:', commentError)
        // Не останавливаем выполнение, комментарий не критичен
      }
    }

    console.log('Task delegated:', {
      task_id: taskId,
      from_user: user.email,
      to_user: assignee.id,
      delegated_by: currentUser.role,
      due_date: due_date || 'не указан'
    })

    return NextResponse.json({
      success: true,
      task: updatedTask,
      message: `Задача делегирована пользователю ${assignee.first_name || assignee.email}`
    })

  } catch (error: any) {
    console.error('Delegate task error:', error)
    return NextResponse.json({
      error: 'Failed to delegate task',
      details: error.message
    }, { status: 500 })
  }
}
