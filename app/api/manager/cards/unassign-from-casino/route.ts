import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST - Отозвать карту с конкретного казино
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
      .select('id, role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData || userData.status !== 'active' || userData.role !== 'manager') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { card_id, casino_id } = body

    if (!card_id || !casino_id) {
      return NextResponse.json({ error: 'Card ID and Casino ID are required' }, { status: 400 })
    }

    console.log('🎯 Запрос на отзыв карты с казино:', {
      card_id,
      casino_id,
      manager_id: userData.id
    })

    // Проверяем, что карта существует
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select(`
        id,
        card_number_mask,
        assigned_to,
        assigned_user:users!cards_assigned_to_fkey (
          id, first_name, last_name, email
        )
      `)
      .eq('id', card_id)
      .single()

    if (cardError || !card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    // Проверяем, что казино существует
    const { data: casino, error: casinoError } = await supabase
      .from('casinos')
      .select('id, name, company')
      .eq('id', casino_id)
      .single()

    if (casinoError || !casino) {
      return NextResponse.json({ error: 'Casino not found' }, { status: 404 })
    }

    // Находим активное назначение карты на это казино
    const { data: casinoAssignment, error: assignmentError } = await supabase
      .from('card_casino_assignments')
      .select('*')
      .eq('card_id', card_id)
      .eq('casino_id', casino_id)
      .eq('status', 'active')
      .single()

    if (assignmentError || !casinoAssignment) {
      return NextResponse.json({ 
        error: 'No active assignment found for this card and casino' 
      }, { status: 404 })
    }

    // Обновляем статус назначения на казино на 'completed'
    const { error: updateCasinoError } = await supabase
      .from('card_casino_assignments')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', casinoAssignment.id)

    if (updateCasinoError) {
      console.error('Error updating casino assignment:', updateCasinoError)
      return NextResponse.json({ error: 'Failed to unassign from casino' }, { status: 500 })
    }

    // Проверяем, есть ли другие активные назначения на казино для этой карты
    const { data: otherAssignments, error: otherError } = await supabase
      .from('card_casino_assignments')
      .select('id')
      .eq('card_id', card_id)
      .eq('status', 'active')

    if (otherError) {
      console.error('Error checking other assignments:', otherError)
    }

    // Если нет других активных назначений на казино, убираем общее назначение карты
    if (!otherAssignments || otherAssignments.length === 0) {
      const { error: cardUpdateError } = await supabase
        .from('cards')
        .update({
          assigned_to: null,
          assigned_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', card_id)

      if (cardUpdateError) {
        console.error('Error updating card assignment:', cardUpdateError)
        // Не критично, продолжаем
      }

      // Обновляем статус общего назначения на 'completed'
      const { error: generalAssignmentError } = await supabase
        .from('card_assignments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('card_id', card_id)
        .eq('status', 'active')

      if (generalAssignmentError) {
        console.error('Error updating general assignment:', generalAssignmentError)
        // Не критично, продолжаем
      }
    }

    // Логируем действие
    await supabase
      .from('action_history')
      .insert({
        action_type: 'unassign',
        entity_type: 'card',
        entity_id: card_id,
        entity_name: `Card ${card.card_number_mask} unassigned from ${casino.name}`,
        change_description: `Manager unassigned card from casino ${casino.name}`,
        performed_by: userData.id,
        old_values: { 
          casino_id,
          casino_name: casino.name,
          assigned_to: card.assigned_to
        }
      })

    const response = {
      success: true,
      message: `Карта ${card.card_number_mask} отозвана с казино ${casino.name}`,
      card_id,
      casino_id,
      casino_name: casino.name,
      unassigned_at: new Date().toISOString()
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Card unassign from casino error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
