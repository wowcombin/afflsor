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
            .select('role, status')
            .eq('auth_id', user.id)
            .single()

        if (!currentUser || currentUser.status !== 'active') {
            return NextResponse.json({ error: 'User not found or inactive' }, { status: 403 })
        }

        // Проверка роли (только определенные роли могут работать с шаблонами)
        const allowedRoles = ['admin', 'manager', 'hr', 'tester']
        if (!allowedRoles.includes(currentUser.role)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const category = searchParams.get('category') || 'all'
        const role = searchParams.get('role') || 'all'

        // Построение запроса с фильтрами
        let query = supabase
            .from('task_templates')
            .select(`
        *,
        created_by_user:created_by(
          email,
          first_name,
          last_name,
          role
        )
      `)
            .eq('is_active', true)
            .order('created_at', { ascending: false })

        if (category !== 'all') {
            query = query.eq('category', category)
        }

        if (role !== 'all') {
            query = query.eq('target_role', role)
        }

        const { data: templates, error } = await query

        if (error) {
            throw error
        }

        return NextResponse.json({
            success: true,
            templates: templates || []
        })

    } catch (error: any) {
        console.error('Task templates API error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
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

        // Проверка роли
        const allowedRoles = ['admin', 'manager', 'hr', 'tester']
        if (!allowedRoles.includes(currentUser.role)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const body = await request.json()
        const {
            title,
            description,
            category,
            target_role,
            estimated_hours,
            default_priority,
            checklist_items,
            tags,
            auto_assign
        } = body

        // Валидация обязательных полей
        if (!title || !category) {
            return NextResponse.json({
                error: 'Title and category are required'
            }, { status: 400 })
        }

        // Создание шаблона задачи
        const { data: template, error } = await supabase
            .from('task_templates')
            .insert({
                title: title.trim(),
                description: description?.trim() || null,
                category,
                target_role: target_role || null,
                estimated_hours: estimated_hours ? parseFloat(estimated_hours) : null,
                default_priority: default_priority || 'medium',
                checklist_items: checklist_items || [],
                tags: tags || [],
                auto_assign: auto_assign || false,
                created_by: currentUser.id
            })
            .select()
            .single()

        if (error) {
            throw error
        }

        console.log('Task template created:', {
            template_id: template.id,
            title: template.title,
            category: template.category,
            created_by: user.email
        })

        return NextResponse.json({
            success: true,
            template,
            message: 'Шаблон задачи создан успешно'
        })

    } catch (error: any) {
        console.error('Create task template error:', error)
        return NextResponse.json({
            error: 'Failed to create task template',
            details: error.message
        }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
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

        const body = await request.json()
        const {
            id,
            title,
            description,
            category,
            target_role,
            estimated_hours,
            default_priority,
            checklist_items,
            tags,
            auto_assign,
            is_active
        } = body

        if (!id) {
            return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
        }

        // Проверка прав (только создатель или админ может редактировать)
        const { data: existingTemplate } = await supabase
            .from('task_templates')
            .select('created_by')
            .eq('id', id)
            .single()

        if (!existingTemplate) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 })
        }

        if (existingTemplate.created_by !== currentUser.id && currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // Обновление шаблона
        const updateData: any = {}
        if (title !== undefined) updateData.title = title.trim()
        if (description !== undefined) updateData.description = description?.trim() || null
        if (category !== undefined) updateData.category = category
        if (target_role !== undefined) updateData.target_role = target_role
        if (estimated_hours !== undefined) updateData.estimated_hours = estimated_hours ? parseFloat(estimated_hours) : null
        if (default_priority !== undefined) updateData.default_priority = default_priority
        if (checklist_items !== undefined) updateData.checklist_items = checklist_items
        if (tags !== undefined) updateData.tags = tags
        if (auto_assign !== undefined) updateData.auto_assign = auto_assign
        if (is_active !== undefined) updateData.is_active = is_active

        updateData.updated_at = new Date().toISOString()

        const { data: template, error } = await supabase
            .from('task_templates')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            throw error
        }

        console.log('Task template updated:', {
            template_id: template.id,
            title: template.title,
            updated_by: user.email
        })

        return NextResponse.json({
            success: true,
            template,
            message: 'Шаблон задачи обновлен успешно'
        })

    } catch (error: any) {
        console.error('Update task template error:', error)
        return NextResponse.json({
            error: 'Failed to update task template',
            details: error.message
        }, { status: 500 })
    }
}
