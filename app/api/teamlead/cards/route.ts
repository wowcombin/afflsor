import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить карты команды Team Lead
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
                details: 'Только Team Lead могут просматривать карты команды'
            }, { status: 403 })
        }

        if (userData.status !== 'active') {
            return NextResponse.json({
                error: 'Аккаунт не активен',
                details: 'Статус аккаунта должен быть active'
            }, { status: 403 })
        }

        console.log('Team Lead cards request:', {
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
                cards: [],
                message: 'У вас нет Junior\'ов в команде'
            })
        }

        // Получаем карты, назначенные Junior'ам из команды
        const { data: cards, error: cardsError } = await supabase
            .from('cards')
            .select(`
        id,
        card_number_mask,
        card_bin,
        card_type,
        exp_month,
        exp_year,
        status,
        assigned_to,
        assigned_at,
        created_at,
        bank_accounts!inner (
          id,
          holder_name,
          balance,
          currency,
          banks (
            id,
            name,
            country
          )
        ),
        users:assigned_to (
          id,
          email,
          first_name,
          last_name,
          role
        ),
        card_casino_assignments (
          id,
          casino_id,
          assignment_type,
          status,
          deposit_amount,
          casinos (
            id,
            name,
            company
          )
        )
      `)
            .in('assigned_to', juniorIds)
            .order('created_at', { ascending: false })

        if (cardsError) {
            console.error('Team Lead cards query error:', cardsError)
            return NextResponse.json({
                error: 'Ошибка получения карт',
                details: cardsError.message
            }, { status: 500 })
        }

        // Обрабатываем данные карт
        const processedCards = (cards || []).map(card => {
            const bankAccount = (card as any).bank_accounts
            const bank = bankAccount?.banks
            const assignee = (card as any).users
            const casinoAssignments = (card as any).card_casino_assignments || []
            
            return {
                ...card,
                bank_name: bank?.name || 'Неизвестный банк',
                bank_country: bank?.country || '',
                holder_name: bankAccount?.holder_name || '',
                balance: bankAccount?.balance || 0,
                currency: bankAccount?.currency || 'USD',
                assignee: assignee || null,
                casino_assignments: casinoAssignments
            }
        })

        console.log(`Found ${processedCards.length} cards for Team Lead ${userData.email}`)

        return NextResponse.json({
            success: true,
            cards: processedCards
        })

    } catch (error: any) {
        console.error('Team Lead cards API error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}
