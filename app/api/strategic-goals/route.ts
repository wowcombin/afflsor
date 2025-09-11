import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить стратегические цели
export async function GET(request: Request) {
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

        if (!userData || !['ceo', 'cfo', 'manager', 'admin'].includes(userData.role)) {
            return NextResponse.json({
                error: 'Access denied',
                details: 'Недостаточно прав для просмотра стратегических целей'
            }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const quarter = searchParams.get('quarter') // 2024-Q1, 2024-Q2, etc.
        const year = searchParams.get('year')
        const status = searchParams.get('status')
        const goalType = searchParams.get('goal_type')

        // Базовый запрос
        let query = supabase
            .from('strategic_goals')
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
        )
      `)

        // Фильтры
        if (quarter) {
            query = query.eq('quarter', quarter)
        }
        if (year) {
            query = query.eq('year', parseInt(year))
        }
        if (status) {
            query = query.eq('status', status)
        }
        if (goalType) {
            query = query.eq('goal_type', goalType)
        }

        const { data: goals, error } = await query
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Strategic goals fetch error:', error)
            return NextResponse.json({
                error: 'Ошибка получения стратегических целей',
                details: error.message
            }, { status: 500 })
        }

        // Обогащаем данные прогрессом
        const enrichedGoals = goals?.map(goal => {
            const progress = goal.target_value > 0 ?
                (goal.current_value / goal.target_value) * 100 : 0

            const isOverdue = goal.end_date && new Date(goal.end_date) < new Date() && goal.status === 'active'
            const daysLeft = goal.end_date ?
                Math.ceil((new Date(goal.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null

            return {
                ...goal,
                progress_percentage: Math.min(progress, 100),
                is_overdue: isOverdue,
                days_left: daysLeft,
                achievement_status: progress >= 100 ? 'achieved' :
                    progress >= 75 ? 'on_track' :
                        progress >= 50 ? 'at_risk' : 'critical'
            }
        }) || []

        console.log(`Strategic goals fetched for ${userData.role} ${userData.email}: ${enrichedGoals.length} goals`)

        return NextResponse.json({
            success: true,
            goals: enrichedGoals
        })

    } catch (error: any) {
        console.error('Strategic goals API error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}

// POST - Создать новую стратегическую цель
export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // Проверка аутентификации
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Проверка роли C-Level
        const { data: userData } = await supabase
            .from('users')
            .select('id, role, status, email')
            .eq('auth_id', user.id)
            .single()

        if (!userData || !['ceo', 'cfo', 'admin'].includes(userData.role)) {
            return NextResponse.json({
                error: 'Access denied',
                details: 'Только C-Level могут создавать стратегические цели'
            }, { status: 403 })
        }

        const body = await request.json()
        const {
            title,
            description,
            goal_type = 'okr',
            owner_id,
            quarter,
            year,
            target_value,
            unit = '',
            start_date,
            end_date,
            linked_project_ids
        } = body

        if (!title || !owner_id || !target_value || !start_date || !end_date) {
            return NextResponse.json({
                error: 'Заполните обязательные поля',
                details: 'Название, владелец, целевое значение, даты начала и окончания обязательны'
            }, { status: 400 })
        }

        // Проверяем даты
        if (new Date(start_date) >= new Date(end_date)) {
            return NextResponse.json({
                error: 'Некорректные даты',
                details: 'Дата окончания должна быть позже даты начала'
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

        // Создаем стратегическую цель
        const { data: goal, error: createError } = await supabase
            .from('strategic_goals')
            .insert({
                title: title.trim(),
                description: description?.trim() || null,
                goal_type,
                owner_id,
                created_by: userData.id,
                quarter: quarter?.trim() || null,
                year: year ? parseInt(year) : new Date().getFullYear(),
                target_value: parseFloat(target_value),
                current_value: 0,
                unit: unit.trim(),
                start_date,
                end_date,
                linked_project_ids: linked_project_ids || null
            })
            .select()
            .single()

        if (createError) {
            console.error('Strategic goal creation error:', createError)
            return NextResponse.json({
                error: 'Ошибка создания стратегической цели',
                details: createError.message
            }, { status: 500 })
        }

        console.log('✅ Strategic goal created:', {
            createdBy: userData.email,
            title: goal.title,
            owner: owner.email,
            type: goal_type,
            target: target_value,
            unit
        })

        return NextResponse.json({
            success: true,
            goal,
            message: `Стратегическая цель "${goal.title}" создана`
        })

    } catch (error: any) {
        console.error('Strategic goal creation error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}
