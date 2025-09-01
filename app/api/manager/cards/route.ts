import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить все карты для менеджера
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

    if (!userData || userData.status !== 'active' || userData.role !== 'manager') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Получаем все карты с полной информацией включая назначения на казино
    const { data: cards, error } = await supabase
      .from('cards')
      .select(`
        *,
        bank_account:bank_accounts (
          id,
          holder_name,
          balance,
          currency,
          is_active,
          balance_updated_at,
          bank:banks (
            id,
            name,
            country,
            currency
          )
        ),
        assigned_user:users (
          id,
          first_name,
          last_name,
          email,
          telegram_username,
          status
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Получаем назначения карт на казино для всех карт
    const cardIds = cards?.map(card => card.id) || []
    const { data: casinoAssignments } = await supabase
      .from('card_casino_assignments')
      .select(`
        card_id,
        casino_id,
        assignment_type,
        status,
        deposit_amount,
        deposit_date,
        withdrawal_amount,
        withdrawal_date,
        casino:casinos (
          id,
          name,
          company,
          currency
        )
      `)
      .in('card_id', cardIds)
      .eq('status', 'active')

    // Добавляем информацию о назначениях к картам
    const cardsWithAssignments = cards?.map(card => ({
      ...card,
      casino_assignments: casinoAssignments?.filter(assignment => 
        assignment.card_id === card.id
      ).map(assignment => {
        const casino = Array.isArray(assignment.casino) ? assignment.casino[0] : assignment.casino
        return {
          assignment_id: assignment.card_id + '_' + assignment.casino_id,
          casino_id: assignment.casino_id,
          casino_name: casino?.name || 'Unknown',
          casino_company: casino?.company,
          casino_currency: casino?.currency,
          assignment_type: assignment.assignment_type,
          status: assignment.status,
          deposit_amount: assignment.deposit_amount,
          has_deposit: !!assignment.deposit_amount
        }
      }) || []
    })) || []

    // Группируем статистику
    const stats = {
      total_cards: cardsWithAssignments?.length || 0,
      available_cards: cardsWithAssignments?.filter(c => 
        !c.assigned_to && 
        c.status === 'active' && 
        (c.bank_account?.balance || 0) >= 10
      ).length || 0,
      assigned_cards: cardsWithAssignments?.filter(c => c.assigned_to).length || 0,
      blocked_cards: cardsWithAssignments?.filter(c => c.status === 'blocked').length || 0,
      total_balance: cardsWithAssignments?.reduce((sum, c) => sum + (c.bank_account?.balance || 0), 0) || 0
    }

    return NextResponse.json({ 
      success: true, 
      data: cardsWithAssignments || [],
      stats
    })

  } catch (error) {
    console.error('Manager cards error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
