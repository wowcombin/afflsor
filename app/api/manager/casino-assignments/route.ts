import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить назначения казино Team Lead'ам
export async function GET() {
    try {
        const supabase = await createClient()

        // Проверка аутентификации и роли
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('role, status')
            .eq('auth_id', user.id)
            .single()

        if (!userData || !['manager', 'cfo', 'tester', 'hr', 'admin'].includes(userData.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Получаем все назначения казино
        const { data: assignments, error } = await supabase
            .from('casino_teamlead_assignments')
            .select(`
        id,
        casino_id,
        teamlead_id,
        assigned_at,
        is_active,
        notes,
        casino:casino_id (
          name,
          url,
          status
        ),
        teamlead:teamlead_id (
          email,
          first_name,
          last_name
        ),
        assigned_by_user:assigned_by (
          email,
          role
        )
      `)
            .eq('is_active', true)
            .order('assigned_at', { ascending: false })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ assignments: assignments || [] })

    } catch (error: any) {
        console.error('Casino assignments API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST - Назначить казино Team Lead'у
export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // Проверка аутентификации и роли
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('id, role, status, email')
            .eq('auth_id', user.id)
            .single()

        if (!userData || !['manager', 'cfo', 'tester', 'admin'].includes(userData.role)) {
            return NextResponse.json({
                error: 'Forbidden',
                details: 'Только Manager, CFO, Tester и Admin могут назначать казино Team Lead\'ам'
            }, { status: 403 })
        }

        const body = await request.json()
        const { casino_id, teamlead_id, notes } = body

        if (!casino_id || !teamlead_id) {
            return NextResponse.json({
                error: 'Заполните обязательные поля',
                details: 'casino_id и teamlead_id обязательны'
            }, { status: 400 })
        }

        // Проверяем, что Team Lead существует и активен
        const { data: teamlead, error: teamleadError } = await supabase
            .from('users')
            .select('id, email, first_name, last_name, role, status')
            .eq('id', teamlead_id)
            .eq('role', 'teamlead')
            .eq('status', 'active')
            .single()

        if (teamleadError || !teamlead) {
            return NextResponse.json({
                error: 'Team Lead не найден',
                details: 'Указанный Team Lead не существует или неактивен'
            }, { status: 404 })
        }

        // Проверяем, что казино существует и активно
        const { data: casino, error: casinoError } = await supabase
            .from('casinos')
            .select('id, name, url, status')
            .eq('id', casino_id)
            .single()

        if (casinoError || !casino) {
            return NextResponse.json({
                error: 'Казино не найдено',
                details: 'Указанное казино не существует'
            }, { status: 404 })
        }

        // Проверяем, не назначено ли казино уже этому Team Lead'у
        const { data: existingAssignment } = await supabase
            .from('casino_teamlead_assignments')
            .select('id')
            .eq('casino_id', casino_id)
            .eq('teamlead_id', teamlead_id)
            .eq('is_active', true)
            .single()

        if (existingAssignment) {
            return NextResponse.json({
                error: 'Казино уже назначено',
                details: 'Это казино уже назначено данному Team Lead\'у'
            }, { status: 400 })
        }

        // Создаем назначение
        const { data: assignment, error: createError } = await supabase
            .from('casino_teamlead_assignments')
            .insert({
                casino_id,
                teamlead_id,
                assigned_by: userData.id,
                notes: notes?.trim() || null
            })
            .select()
            .single()

        if (createError) {
            return NextResponse.json({
                error: 'Ошибка создания назначения',
                details: createError.message
            }, { status: 500 })
        }

        console.log('✅ Casino assigned to Team Lead:', {
            casinoName: casino.name,
            teamleadEmail: teamlead.email,
            assignedBy: userData.email
        })

        return NextResponse.json({
            success: true,
            assignment,
            message: `Казино ${casino.name} назначено Team Lead ${teamlead.email}`
        })

    } catch (error: any) {
        console.error('Casino assignment error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
