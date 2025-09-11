import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить выводы команды Team Lead
export async function GET() {
    try {
        const supabase = await createClient()

        // Проверка аутентификации
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Проверка роли Team Lead
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, role, status, email')
            .eq('auth_id', user.id)
            .single()

        if (userError || !userData) {
            return NextResponse.json({
                error: 'Пользователь не найден',
                details: userError?.message
            }, { status: 404 })
        }

        if (userData.role !== 'teamlead') {
            return NextResponse.json({
                error: 'Access denied',
                details: 'Только Team Lead могут просматривать выводы команды'
            }, { status: 403 })
        }

        if (userData.status !== 'active') {
            return NextResponse.json({
                error: 'Аккаунт не активен',
                details: 'Статус аккаунта должен быть active'
            }, { status: 403 })
        }

        console.log('Team Lead withdrawals request:', {
            teamLeadId: userData.id,
            email: userData.email
        })

        // Сначала получаем Junior'ов этого Team Lead'а
        const { data: teamJuniors, error: juniorsError } = await supabase
            .from('users')
            .select('id')
            .eq('team_lead_id', userData.id)
            .eq('role', 'junior')
            .eq('status', 'active')

        if (juniorsError) {
            console.error('Team Lead juniors error:', juniorsError)
            return NextResponse.json({
                error: 'Ошибка получения команды',
                details: juniorsError.message
            }, { status: 500 })
        }

        const juniorIds = teamJuniors?.map(j => j.id) || []

        if (juniorIds.length === 0) {
            return NextResponse.json({
                success: true,
                withdrawals: [],
                message: 'У вас нет Junior\'ов в команде'
            })
        }

        // Получаем работы Junior'ов и их выводы
        const { data: works, error: worksError } = await supabase
            .from('works')
            .select('id')
            .in('junior_id', juniorIds)

        if (worksError) {
            console.error('Team Lead works query error:', worksError)
            return NextResponse.json({
                error: 'Ошибка получения работ',
                details: worksError.message
            }, { status: 500 })
        }

        const workIds = works?.map(w => w.id) || []

        if (workIds.length === 0) {
            return NextResponse.json({
                success: true,
                withdrawals: [],
                message: 'У Junior\'ов нет работ с выводами'
            })
        }

        // Получаем выводы по работам Junior'ов
        const { data: withdrawals, error: withdrawalsError } = await supabase
            .from('work_withdrawals')
            .select(`
        id,
        work_id,
        withdrawal_amount,
        status,
        checked_by,
        checked_at,
        alarm_message,
        manager_notes,
        created_at,
        updated_at,
        works:work_id (
          id,
          junior_id,
          deposit_amount,
          casino_login,
          status,
          work_date,
          users:junior_id (
            id,
            email,
            first_name,
            last_name,
            role
          ),
          casinos:casino_id (
            id,
            name,
            currency
          ),
          cards:card_id (
            id,
            card_number_mask,
            bank_name
          )
        )
      `)
            .in('work_id', workIds)
            .order('created_at', { ascending: false })

        if (withdrawalsError) {
            console.error('Team Lead withdrawals query error:', withdrawalsError)
            return NextResponse.json({
                error: 'Ошибка получения выводов',
                details: withdrawalsError.message
            }, { status: 500 })
        }

        console.log(`Found ${withdrawals?.length || 0} withdrawals for Team Lead ${userData.email}`)

        return NextResponse.json({
            success: true,
            withdrawals: withdrawals || []
        })

    } catch (error: any) {
        console.error('Team Lead withdrawals API error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}
