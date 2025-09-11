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

        // Получение задачи с детальной информацией
        const { data: task, error } = await supabase
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
            .eq('id', taskId)
            .single()

        if (error || !task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }

        // Проверка доступа к задаче
        const hasAccess =
            // Создатель задачи
            task.created_by === currentUser.id ||
            // Исполнитель задачи
            task.assignee_id === currentUser.id ||
            // Team Lead может видеть задачи своих Junior'ов
            (currentUser.role === 'teamlead' && task.assignee?.role === 'junior') ||
            // Manager, HR, Admin могут видеть все задачи
            ['manager', 'hr', 'admin'].includes(currentUser.role)

        if (!hasAccess) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // Добавляем информацию о просроченности
        const taskWithOverdue = {
            ...task,
            is_overdue: task.due_date && new Date(task.due_date) < new Date() && task.task_status !== 'done'
        }

        return NextResponse.json({
            success: true,
            task: taskWithOverdue
        })

    } catch (error: any) {
        console.error('Get task error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}

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

        const taskId = params.id
        const body = await request.json()

        // Получение существующей задачи
        const { data: existingTask, error: taskError } = await supabase
            .from('tasks')
            .select('*, assignee:assignee_id(role, team_lead_id)')
            .eq('id', taskId)
            .single()

        if (taskError || !existingTask) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }

        // Проверка прав на обновление
        const canUpdate =
            // Создатель задачи
            existingTask.created_by === currentUser.id ||
            // Исполнитель может обновлять свои задачи
            existingTask.assignee_id === currentUser.id ||
            // Team Lead может обновлять задачи своих Junior'ов
            (currentUser.role === 'teamlead' && existingTask.assignee?.team_lead_id === currentUser.id) ||
            // Manager, Admin могут обновлять любые задачи
            ['manager', 'admin'].includes(currentUser.role)

        if (!canUpdate) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // Подготовка данных для обновления
        const updateData: any = {
            updated_at: new Date().toISOString()
        }

        // Разрешенные поля для обновления
        const allowedFields = [
            'title', 'description', 'task_status', 'priority',
            'due_date', 'estimated_hours', 'actual_hours', 'tags'
        ]

        allowedFields.forEach(field => {
            if (body[field] !== undefined) {
                updateData[field] = body[field]
            }
        })

        // Обновление задачи
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
            .single()

        if (updateError) {
            throw updateError
        }

        // Логирование изменения статуса
        if (body.task_status && body.task_status !== existingTask.task_status) {
            console.log('Task status updated:', {
                task_id: taskId,
                from_status: existingTask.task_status,
                to_status: body.task_status,
                updated_by: user.email,
                user_role: currentUser.role
            })

            // Создание комментария о смене статуса
            const { error: commentError } = await supabase
                .from('task_comments')
                .insert({
                    task_id: taskId,
                    user_id: currentUser.id,
                    content: `Статус изменен с "${existingTask.task_status}" на "${body.task_status}"`,
                    comment_type: 'status_change'
                })

            if (commentError) {
                console.error('Failed to create status change comment:', commentError)
                // Не останавливаем выполнение, комментарий не критичен
            }
        }

        return NextResponse.json({
            success: true,
            task: updatedTask,
            message: 'Задача обновлена успешно'
        })

    } catch (error: any) {
        console.error('Update task error:', error)
        return NextResponse.json({
            error: 'Failed to update task',
            details: error.message
        }, { status: 500 })
    }
}

export async function DELETE(
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

        // Получение задачи для проверки прав
        const { data: task, error: taskError } = await supabase
            .from('tasks')
            .select('created_by, task_status')
            .eq('id', taskId)
            .single()

        if (taskError || !task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }

        // Проверка прав на удаление (только создатель или админ)
        const canDelete =
            task.created_by === currentUser.id ||
            currentUser.role === 'admin'

        if (!canDelete) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // Нельзя удалять выполненные задачи
        if (task.task_status === 'done') {
            return NextResponse.json({
                error: 'Cannot delete completed tasks'
            }, { status: 400 })
        }

        // Удаление связанных комментариев и вложений
        await supabase.from('task_comments').delete().eq('task_id', taskId)
        await supabase.from('task_attachments').delete().eq('task_id', taskId)

        // Удаление задачи
        const { error: deleteError } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId)

        if (deleteError) {
            throw deleteError
        }

        console.log('Task deleted:', {
            task_id: taskId,
            deleted_by: user.email,
            user_role: currentUser.role
        })

        return NextResponse.json({
            success: true,
            message: 'Задача удалена успешно'
        })

    } catch (error: any) {
        console.error('Delete task error:', error)
        return NextResponse.json({
            error: 'Failed to delete task',
            details: error.message
        }, { status: 500 })
    }
}
