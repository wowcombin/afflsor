import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST - Team Lead назначает карту Junior'у для казино
export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // Проверка аутентификации
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Проверка роли Team Lead
        const { data: userData } = await supabase
            .from('users')
            .select('id, role, status, email')
            .eq('auth_id', user.id)
            .single()

        if (!userData || userData.role !== 'teamlead' || userData.status !== 'active') {
            return NextResponse.json({
                error: 'Access denied',
                details: 'Только активные Team Lead могут назначать карты'
            }, { status: 403 })
        }

        const body = await request.json()
        const { card_id, junior_id, casino_id } = body

        if (!card_id || !junior_id || !casino_id) {
            return NextResponse.json({
                error: 'Заполните обязательные поля',
                details: 'card_id, junior_id и casino_id обязательны'
            }, { status: 400 })
        }

        // Проверяем, что Junior принадлежит команде этого Team Lead'а
        const { data: junior, error: juniorError } = await supabase
            .from('users')
            .select('id, email, first_name, last_name, role, status, team_lead_id')
            .eq('id', junior_id)
            .eq('role', 'junior')
            .eq('status', 'active')
            .eq('team_lead_id', userData.id)
            .single()

        if (juniorError || !junior) {
            return NextResponse.json({
                error: 'Junior не найден',
                details: 'Указанный Junior не найден в вашей команде или неактивен'
            }, { status: 404 })
        }

        // Проверяем, что казино назначено этому Team Lead'у
        const { data: casinoAssignment } = await supabase
            .from('casino_teamlead_assignments')
            .select('id')
            .eq('casino_id', casino_id)
            .eq('teamlead_id', userData.id)
            .eq('is_active', true)
            .single()

        if (!casinoAssignment) {
            return NextResponse.json({
                error: 'Казино не назначено',
                details: 'Данное казино не назначено вашей команде'
            }, { status: 403 })
        }

        // Получаем информацию о карте и проверяем доступ
        const { data: card, error: cardError } = await supabase
            .from('cards')
            .select(`
        id,
        card_number,
        bank_id,
        status,
        banks (
          id,
          name,
          country
        )
      `)
            .eq('id', card_id)
            .single()

        if (cardError || !card) {
            return NextResponse.json({
                error: 'Карта не найдена',
                details: 'Указанная карта не существует'
            }, { status: 404 })
        }

        // Проверяем, что банк карты назначен этому Team Lead'у
        const { data: bankAssignment } = await supabase
            .from('bank_teamlead_assignments')
            .select('id')
            .eq('bank_id', card.bank_id)
            .eq('teamlead_id', userData.id)
            .eq('is_active', true)
            .single()

        if (!bankAssignment) {
            return NextResponse.json({
                error: 'Банк не назначен',
                details: 'Банк этой карты не назначен вашей команде'
            }, { status: 403 })
        }

        // Проверяем, что карта свободна
        if (card.status !== 'available') {
            return NextResponse.json({
                error: 'Карта недоступна',
                details: 'Карта уже назначена или заблокирована'
            }, { status: 400 })
        }

        // Проверяем, что карта не назначена уже на это казино
        const { data: existingAssignment } = await supabase
            .from('card_casino_assignments')
            .select('id')
            .eq('card_id', card_id)
            .eq('casino_id', casino_id)
            .eq('is_active', true)
            .single()

        if (existingAssignment) {
            return NextResponse.json({
                error: 'Карта уже назначена на это казино',
                details: 'Данная карта уже используется для этого казино'
            }, { status: 400 })
        }

        // Назначаем карту
        const { data: assignment, error: assignError } = await supabase
            .from('card_casino_assignments')
            .insert({
                card_id,
                casino_id,
                user_id: junior_id,
                assigned_by: userData.id,
                assigned_at: new Date().toISOString()
            })
            .select()
            .single()

        if (assignError) {
            console.error('Card assignment error:', assignError)
            return NextResponse.json({
                error: 'Ошибка назначения карты',
                details: assignError.message
            }, { status: 500 })
        }

        // Обновляем статус карты
        const { error: updateError } = await supabase
            .from('cards')
            .update({
                status: 'assigned',
                updated_at: new Date().toISOString()
            })
            .eq('id', card_id)

        if (updateError) {
            console.error('Card status update error:', updateError)
        }

        // Получаем информацию о казино для логирования
        const { data: casino } = await supabase
            .from('casinos')
            .select('name')
            .eq('id', casino_id)
            .single()

        console.log('✅ Team Lead assigned card to Junior:', {
            teamLeadEmail: userData.email,
            juniorEmail: junior.email,
            cardNumber: card.card_number?.slice(-4),
            casinoName: casino?.name,
            bankId: card.bank_id
        })

        return NextResponse.json({
            success: true,
            assignment,
            message: `Карта назначена Junior ${junior.email} для казино ${casino?.name || casino_id}`
        })

    } catch (error: any) {
        console.error('Team Lead card assignment error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}
