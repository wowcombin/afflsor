import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
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

    // Проверка доступа к задаче
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('created_by, assignee_id')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Проверка прав доступа
    const hasAccess = 
      task.created_by === currentUser.id ||
      task.assignee_id === currentUser.id ||
      ['manager', 'teamlead', 'hr', 'admin'].includes(currentUser.role)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Получение чек-листа
    const { data: checklist, error } = await supabase
      .from('task_checklist')
      .select('*')
      .eq('task_id', taskId)
      .order('order_index', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      checklist: checklist || []
    })

  } catch (error: any) {
    console.error('Get task checklist error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}
