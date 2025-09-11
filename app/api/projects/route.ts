import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить проекты
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
        const status = searchParams.get('status') // active, completed, cancelled
        const projectType = searchParams.get('type') // development, marketing, etc.
        const ownerId = searchParams.get('owner_id')

        // Базовый запрос
        let query = supabase
            .from('projects')
            .select(`
        *,
        owner:owner_id (
          id,
          email,
          first_name,
          last_name,
          role
        ),
        created_by_user:created_by (
          email,
          first_name,
          last_name
        ),
        tasks (
          id,
          title,
          task_status,
          assignee:assignee_id (
            email,
            first_name,
            last_name,
            role
          )
        )
      `)

        // Фильтры
        if (status) {
            query = query.eq('status', status)
        }
        if (projectType) {
            query = query.eq('project_type', projectType)
        }
        if (ownerId) {
            query = query.eq('owner_id', ownerId)
        }

        // Фильтрация по ролям (дополнительная логика)
        if (userData.role === 'teamlead') {
            // Team Lead видит проекты где он owner или есть задачи для его команды
            // Это будет обработано через RLS
        }

        const { data: projects, error } = await query
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Projects fetch error:', error)
            return NextResponse.json({
                error: 'Ошибка получения проектов',
                details: error.message
            }, { status: 500 })
        }

        // Обогащаем данные статистикой
        const enrichedProjects = projects?.map(project => {
            const tasks = project.tasks || []
            const totalTasks = tasks.length
            const completedTasks = tasks.filter((t: any) => t.task_status === 'done').length
            const inProgressTasks = tasks.filter((t: any) => t.task_status === 'in_progress').length

            return {
                ...project,
                task_stats: {
                    total: totalTasks,
                    completed: completedTasks,
                    in_progress: inProgressTasks,
                    completion_rate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
                }
            }
        }) || []

        console.log(`Projects fetched for ${userData.role} ${userData.email}: ${enrichedProjects.length} projects`)

        return NextResponse.json({
            success: true,
            projects: enrichedProjects
        })

    } catch (error: any) {
        console.error('Projects API error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}

// POST - Создать новый проект
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

        if (!userData || !['ceo', 'cfo', 'manager', 'hr', 'admin'].includes(userData.role)) {
            return NextResponse.json({
                error: 'Access denied',
                details: 'Недостаточно прав для создания проектов'
            }, { status: 403 })
        }

        const body = await request.json()
        const {
            title,
            description,
            project_type = 'other',
            owner_id,
            priority = 'medium',
            start_date,
            end_date,
            deadline,
            budget
        } = body

        if (!title || !owner_id) {
            return NextResponse.json({
                error: 'Заполните обязательные поля',
                details: 'Название проекта и владелец обязательны'
            }, { status: 400 })
        }

        // Проверяем, что владелец существует
        const { data: owner, error: ownerError } = await supabase
            .from('users')
            .select('id, email, role, status')
            .eq('id', owner_id)
            .single()

        if (ownerError || !owner || owner.status !== 'active') {
            return NextResponse.json({
                error: 'Владелец не найден',
                details: 'Указанный владелец не существует или неактивен'
            }, { status: 404 })
        }

        // Создаем проект
        const { data: project, error: createError } = await supabase
            .from('projects')
            .insert({
                title: title.trim(),
                description: description?.trim() || null,
                project_type,
                owner_id,
                created_by: userData.id,
                priority,
                start_date: start_date || null,
                end_date: end_date || null,
                deadline: deadline || null,
                budget: budget ? parseFloat(budget) : null
            })
            .select()
            .single()

        if (createError) {
            console.error('Project creation error:', createError)
            return NextResponse.json({
                error: 'Ошибка создания проекта',
                details: createError.message
            }, { status: 500 })
        }

        console.log('✅ Project created:', {
            createdBy: userData.email,
            title: project.title,
            owner: owner.email,
            type: project_type
        })

        return NextResponse.json({
            success: true,
            project,
            message: `Проект "${project.title}" создан`
        })

    } catch (error: any) {
        console.error('Project creation error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}
