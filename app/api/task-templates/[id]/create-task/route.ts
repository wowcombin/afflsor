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

        const templateId = params.id
        const body = await request.json()
        const {
            assignee_id,
            due_date,
            project_id,
            custom_title,
            custom_description,
            custom_priority,
            additional_tags
        } = body

        // Получение шаблона
        const { data: template, error: templateError } = await supabase
            .from('task_templates')
            .select('*')
            .eq('id', templateId)
            .eq('is_active', true)
            .single()

        if (templateError || !template) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 })
        }

        // Подготовка данных задачи на основе шаблона
        const taskData = {
            title: custom_title || template.title,
            description: custom_description || template.description,
            priority: custom_priority || template.default_priority,
            estimated_hours: template.estimated_hours,
            assignee_id: assignee_id || null,
            project_id: project_id || null,
            due_date: due_date || null,
            tags: [...(template.tags || []), ...(additional_tags || [])],
            template_id: template.id,
            created_by: currentUser.id
        }

        // Создание задачи
        const { data: task, error: taskError } = await supabase
            .from('tasks')
            .insert(taskData)
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

        if (taskError) {
            throw taskError
        }

        // Создание чек-листа из шаблона (если есть)
        if (template.checklist_items && template.checklist_items.length > 0) {
            const checklistItems = template.checklist_items.map((item: string, index: number) => ({
                task_id: task.id,
                title: item,
                is_completed: false,
                order_index: index
            }))

            const { error: checklistError } = await supabase
                .from('task_checklist')
                .insert(checklistItems)

            if (checklistError) {
                console.error('Failed to create checklist items:', checklistError)
                // Не останавливаем выполнение, чек-лист не критичен
            }
        }

        console.log('Task created from template:', {
            task_id: task.id,
            template_id: template.id,
            template_title: template.title,
            assignee: task.assignee?.email,
            created_by: user.email
        })

        return NextResponse.json({
            success: true,
            task,
            message: `Задача создана из шаблона "${template.title}"`
        })

    } catch (error: any) {
        console.error('Create task from template error:', error)
        return NextResponse.json({
            error: 'Failed to create task from template',
            details: error.message
        }, { status: 500 })
    }
}
