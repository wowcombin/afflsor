import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// PATCH - Одобрить вывод (Team Lead)
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient()
        const withdrawalId = params.id

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

        if (userError || !userData || userData.role !== 'teamlead' || userData.status !== 'active') {
            return NextResponse.json({
                error: 'Access denied',
                details: 'Только активные Team Lead могут одобрять выводы'
            }, { status: 403 })
        }

        const body = await request.json()
        const { comment } = body

        // Получаем информацию о выводе и проверяем, что он от Junior из команды
        const { data: withdrawal, error: getError } = await supabase
            .from('withdrawals')
            .select(`
        id,
        user_id,
        amount,
        currency,
        status
      `)
            .eq('id', withdrawalId)
            .single()

        if (getError || !withdrawal) {
            return NextResponse.json({
                error: 'Вывод не найден',
                details: getError?.message
            }, { status: 404 })
        }

        // Получаем информацию о пользователе отдельно
        const { data: withdrawalUser, error: userGetError } = await supabase
            .from('users')
            .select('team_lead_id, email, first_name, last_name, role')
            .eq('id', withdrawal.user_id)
            .single()

        if (userGetError || !withdrawalUser) {
            return NextResponse.json({
                error: 'Пользователь не найден',
                details: userGetError?.message
            }, { status: 404 })
        }

        // Проверяем, что это вывод от Junior из команды этого Team Lead
        if (withdrawalUser.team_lead_id !== userData.id || withdrawalUser.role !== 'junior') {
            return NextResponse.json({
                error: 'Access denied',
                details: 'Вы можете одобрять только выводы своих Junior сотрудников'
            }, { status: 403 })
        }

        if (withdrawal.status !== 'pending') {
            return NextResponse.json({
                error: 'Вывод уже обработан',
                details: `Статус вывода: ${withdrawal.status}`
            }, { status: 400 })
        }

        // Одобряем вывод
        const { error: updateError } = await supabase
            .from('withdrawals')
            .update({
                status: 'approved',
                manager_comment: comment?.trim() || `Одобрено Team Lead ${userData.email}`,
                updated_at: new Date().toISOString()
            })
            .eq('id', withdrawalId)

        if (updateError) {
            console.error('Withdrawal approval error:', updateError)
            return NextResponse.json({
                error: 'Ошибка одобрения вывода',
                details: updateError.message
            }, { status: 500 })
        }

        console.log('✅ Withdrawal approved by Team Lead:', {
            withdrawalId,
            teamLeadEmail: userData.email,
            juniorEmail: withdrawalUser.email,
            amount: withdrawal.amount,
            currency: withdrawal.currency
        })

        return NextResponse.json({
            success: true,
            message: 'Вывод успешно одобрен'
        })

    } catch (error: any) {
        console.error('Team Lead approve withdrawal error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}
