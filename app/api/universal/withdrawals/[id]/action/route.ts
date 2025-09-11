import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Проверка аутентификации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Получение данных пользователя
    const { data: userData } = await supabase
      .from('users')
      .select('id, role, status, first_name, last_name, email')
      .eq('auth_id', user.id)
      .single()

    if (!userData || userData.status !== 'active') {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 403 })
    }

    const withdrawalId = params.id
    const body = await request.json()
    const { 
      action, 
      comment, 
      source_type,
      status,
      create_task,
      task_title,
      task_description,
      task_priority = 'medium',
      task_assignee_id
    } = body

    if (!action || !source_type) {
      return NextResponse.json({ 
        error: 'Action and source_type are required' 
      }, { status: 400 })
    }

    // Проверка прав доступа по ролям
    const permissions = {
      teamlead: {
        can_approve: true,
        can_reject: true,
        can_comment: true,
        can_block: false,
        can_create_task: false
      },
      manager: {
        can_approve: true,
        can_reject: true,
        can_comment: true,
        can_block: true,
        can_create_task: true
      },
      hr: {
        can_approve: false,
        can_reject: false,
        can_comment: true,
        can_block: true,
        can_create_task: true
      },
      admin: {
        can_approve: true,
        can_reject: true,
        can_comment: true,
        can_block: true,
        can_create_task: true
      },
      cfo: {
        can_approve: false,
        can_reject: false,
        can_comment: true,
        can_block: true,
        can_create_task: true
      }
    }

    const userPermissions = permissions[userData.role as keyof typeof permissions]
    if (!userPermissions) {
      return NextResponse.json({ 
        error: 'Access denied',
        details: 'Роль не имеет доступа к управлению выводами'
      }, { status: 403 })
    }

    let updateResult: any = null
    let taskResult: any = null

    // Выполнение действий в зависимости от типа
    switch (action) {
      case 'approve':
        if (!userPermissions.can_approve) {
          return NextResponse.json({ error: 'Нет прав на одобрение' }, { status: 403 })
        }
        updateResult = await updateWithdrawalStatus(supabase, withdrawalId, source_type, 'approved', userData, comment)
        break

      case 'reject':
        if (!userPermissions.can_reject) {
          return NextResponse.json({ error: 'Нет прав на отклонение' }, { status: 403 })
        }
        updateResult = await updateWithdrawalStatus(supabase, withdrawalId, source_type, 'rejected', userData, comment)
        break

      case 'block':
        if (!userPermissions.can_block) {
          return NextResponse.json({ error: 'Нет прав на блокировку' }, { status: 403 })
        }
        updateResult = await updateWithdrawalStatus(supabase, withdrawalId, source_type, 'blocked', userData, comment)
        break

      case 'comment':
        if (!userPermissions.can_comment) {
          return NextResponse.json({ error: 'Нет прав на комментирование' }, { status: 403 })
        }
        updateResult = await addWithdrawalComment(supabase, withdrawalId, source_type, userData, comment)
        break

      case 'create_task':
        if (!userPermissions.can_create_task) {
          return NextResponse.json({ error: 'Нет прав на создание задач' }, { status: 403 })
        }
        
        if (!task_title) {
          return NextResponse.json({ error: 'Название задачи обязательно' }, { status: 400 })
        }

        // Создаем задачу, связанную с выводом
        const { data: task, error: taskError } = await supabase
          .from('tasks')
          .insert({
            title: task_title,
            description: task_description || `Задача по выводу #${withdrawalId}`,
            priority: task_priority,
            assignee_id: task_assignee_id || null,
            created_by: userData.id,
            tags: ['withdrawal', source_type, 'urgent'],
            metadata: {
              withdrawal_id: withdrawalId,
              source_type: source_type,
              created_from: 'withdrawal_action'
            }
          })
          .select()
          .single()

        if (taskError) {
          return NextResponse.json({
            error: 'Ошибка создания задачи',
            details: taskError.message
          }, { status: 500 })
        }

        taskResult = task
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const responseMessage = action === 'create_task' 
      ? `Задача "${task_title}" создана успешно`
      : `Действие "${action}" выполнено успешно`

    return NextResponse.json({
      success: true,
      message: responseMessage,
      update_result: updateResult,
      task_result: taskResult,
      action,
      performed_by: {
        id: userData.id,
        name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email,
        role: userData.role
      }
    })

  } catch (error: any) {
    console.error('Withdrawal action error:', error)
    return NextResponse.json({
      error: 'Failed to perform action',
      details: error.message
    }, { status: 500 })
  }
}

// Функция обновления статуса вывода
async function updateWithdrawalStatus(
  supabase: any, 
  withdrawalId: string, 
  sourceType: string, 
  newStatus: string, 
  userData: any, 
  comment?: string
) {
  const timestamp = new Date().toISOString()
  const commentField = `${userData.role}_comment`
  const checkedByField = `checked_by_${userData.role}`

  let updateData: any = {
    updated_at: timestamp
  }

  if (sourceType === 'regular') {
    // Для work_withdrawals
    if (userData.role === 'manager' || userData.role === 'teamlead') {
      updateData.status = newStatus === 'approved' ? 'received' : 
                         newStatus === 'rejected' ? 'problem' : 
                         newStatus === 'blocked' ? 'block' : newStatus
      updateData.checked_by = userData.id
      updateData.checked_at = timestamp
      if (comment) updateData.manager_notes = comment
    } else {
      updateData.alarm_message = comment || `${userData.role.toUpperCase()}: ${newStatus}`
    }

    const { data, error } = await supabase
      .from('work_withdrawals')
      .update(updateData)
      .eq('id', withdrawalId)
      .select()
      .single()

    return { data, error, table: 'work_withdrawals' }

  } else if (sourceType === 'paypal') {
    // Для paypal_withdrawals
    if (userData.role === 'manager') {
      updateData.manager_status = newStatus
      updateData.checked_by_manager = userData.id
    } else if (userData.role === 'teamlead') {
      updateData.teamlead_status = newStatus
      updateData.checked_by_teamlead = userData.id
    } else {
      updateData.status = newStatus
      updateData[checkedByField] = userData.id
    }

    if (comment) {
      updateData[commentField] = comment
    }

    const { data, error } = await supabase
      .from('paypal_withdrawals')
      .update(updateData)
      .eq('id', withdrawalId)
      .select()
      .single()

    return { data, error, table: 'paypal_withdrawals' }
  }

  return { error: 'Invalid source type' }
}

// Функция добавления комментария
async function addWithdrawalComment(
  supabase: any, 
  withdrawalId: string, 
  sourceType: string, 
  userData: any, 
  comment: string
) {
  if (!comment) {
    return { error: 'Comment is required' }
  }

  const commentField = `${userData.role}_comment`
  const timestamp = new Date().toISOString()

  const updateData = {
    [commentField]: comment,
    updated_at: timestamp
  }

  const tableName = sourceType === 'regular' ? 'work_withdrawals' : 'paypal_withdrawals'

  const { data, error } = await supabase
    .from(tableName)
    .update(updateData)
    .eq('id', withdrawalId)
    .select()
    .single()

  return { data, error, table: tableName }
}
