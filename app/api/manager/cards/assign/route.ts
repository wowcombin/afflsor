import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST - Назначить карту junior'у
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
    const { card_ids, user_id, casino_id, notes } = body

    // Поддерживаем как одиночное назначение (card_id), так и массовое (card_ids)
    const cardIds = card_ids || (body.card_id ? [body.card_id] : [])

    if (!cardIds || cardIds.length === 0 || !user_id) {
      return NextResponse.json({ error: 'Card IDs and User ID are required' }, { status: 400 })
    }

    // Проверяем, что пользователь существует и является junior'ом
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, role, status, first_name, last_name')
      .eq('id', user_id)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (targetUser.role !== 'junior' || targetUser.status !== 'active') {
      return NextResponse.json({ error: 'User must be an active junior' }, { status: 400 })
    }

    // Проверяем все карты с информацией о назначениях
    const { data: cards, error: cardsError } = await supabase
      .from('cards')
      .select(`
        id,
        status,
        assigned_to,
        assigned_casino_id,
        card_number_mask,
        bank_account:bank_accounts (
          balance,
          is_active
        )
      `)
      .in('id', cardIds)

    if (cardsError || !cards) {
      return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 })
    }

    // Проверяем существующие назначения карт на это казино ЛЮБЫМ пользователем (если казино указано)
    let existingAssignments: any[] = []
    if (casino_id) {
      const { data: assignments } = await supabase
        .from('card_casino_assignments')
        .select('card_id')
        .eq('casino_id', casino_id)
        .eq('status', 'active')
        .in('card_id', cardIds)
      
      existingAssignments = assignments || []
    }

    // Фильтруем доступные карты
    const availableCards = cards.filter(card => {
      const bankAccount = card.bank_account as any
      
      // Базовые проверки
      if (!(
        card.status === 'active' &&
        bankAccount?.is_active &&
        (bankAccount?.balance || 0) >= 10
      )) {
        return false
      }
      
      // Проверяем, не назначена ли карта уже на это конкретное казино
      if (casino_id) {
        // Проверяем старую систему
        if (card.assigned_casino_id === casino_id) {
          return false
        }
        
        // Проверяем новую систему
        if (existingAssignments.some(assignment => assignment.card_id === card.id)) {
          return false
        }
      }
      
      return true
    })

    if (availableCards.length === 0) {
      return NextResponse.json({ 
        error: 'No cards available for assignment',
        details: 'All selected cards are either inactive, already assigned, or have insufficient balance'
      }, { status: 400 })
    }

    const assignedCards = []
    const failedCards = []

    // Назначаем каждую доступную карту
    for (const card of availableCards) {
      try {
        // Назначаем карту
        const { error: assignError } = await supabase
          .from('cards')
          .update({
            assigned_to: user_id,
            assigned_at: new Date().toISOString(),
            assigned_casino_id: casino_id || null,
            notes: notes || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', card.id)

        if (assignError) {
          console.error('Assignment error for card', card.id, ':', assignError)
          failedCards.push({ card_id: card.id, error: 'Failed to assign' })
          continue
        }

        // Создаем запись в card_assignments
        const { error: assignmentError } = await supabase
          .from('card_assignments')
          .insert({
            card_id: card.id,
            user_id,
            assigned_by: userData.id,
            status: 'active',
            notes
          })

        if (assignmentError) {
          console.error('Assignment record error for card', card.id, ':', assignmentError)
          // Не критично, продолжаем
        }

        // Логируем действие
        await supabase
          .from('action_history')
          .insert({
            action_type: 'assign',
            entity_type: 'card',
            entity_id: card.id,
            entity_name: `Card ${card.card_number_mask} assignment to ${targetUser.first_name} ${targetUser.last_name}`,
            change_description: `Manager assigned card to junior${notes ? `: ${notes}` : ''}`,
            performed_by: userData.id,
            new_values: { 
              assigned_to: user_id, 
              assigned_casino_id: casino_id,
              notes 
            }
          })

        assignedCards.push({
          card_id: card.id,
          card_mask: card.card_number_mask
        })

      } catch (error) {
        console.error('Error assigning card', card.id, ':', error)
        failedCards.push({ card_id: card.id, error: 'Unexpected error' })
      }
    }

    const response = {
      success: true,
      message: `${assignedCards.length} карт назначено Junior'у ${targetUser.first_name} ${targetUser.last_name}`,
      assigned_count: assignedCards.length,
      total_requested: cardIds.length,
      assigned_cards: assignedCards,
      failed_cards: failedCards,
      assignment_details: {
        user_id,
        user_name: `${targetUser.first_name} ${targetUser.last_name}`,
        assigned_by: userData.id,
        assigned_at: new Date().toISOString(),
        casino_id: casino_id || null
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Card assignment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
