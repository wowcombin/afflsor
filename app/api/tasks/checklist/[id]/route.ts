import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
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

    const checklistItemId = params.id
    const body = await request.json()
    const { is_completed } = body

    // Получение элемента чек-листа и связанной задачи
    const { data: checklistItem, error: itemError } = await supabase
      .from('task_checklist')
      .select(`
        *,
        task:task_id(
          id,
          created_by,
          assignee_id,
          task_status
        )
      `)
      .eq('id', checklistItemId)
      .single()

    if (itemError || !checklistItem) {
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 })
    }

    const task = checklistItem.task as any

    // Проверка прав на обновление
    const canUpdate = 
      task.created_by === currentUser.id ||
      task.assignee_id === currentUser.id ||
      ['manager', 'teamlead', 'admin'].includes(currentUser.role)

    if (!canUpdate) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Нельзя изменять чек-лист завершенных задач или задач на проверке
    if (task.task_status === 'done') {
      return NextResponse.json({ 
        error: 'Cannot modify checklist of completed tasks' 
      }, { status: 400 })
    }

    // Обновление элемента чек-листа
    const { data: updatedItem, error: updateError } = await supabase
      .from('task_checklist')
      .update({
        is_completed: is_completed,
        updated_at: new Date().toISOString()
      })
      .eq('id', checklistItemId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    console.log('Checklist item updated:', {
      item_id: checklistItemId,
      task_id: task.id,
      is_completed: is_completed,
      updated_by: user.email
    })

    return NextResponse.json({
      success: true,
      item: updatedItem,
      message: 'Элемент чек-листа обновлен'
    })

  } catch (error: any) {
    console.error('Update checklist item error:', error)
    return NextResponse.json({
      error: 'Failed to update checklist item',
      details: error.message
    }, { status: 500 })
  }
}
