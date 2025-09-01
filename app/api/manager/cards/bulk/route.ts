import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST - Массовые операции с картами
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
    const { action, card_ids, comment } = body

    if (!action || !card_ids || !Array.isArray(card_ids) || card_ids.length === 0) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    let updateData: any = { updated_at: new Date().toISOString() }
    let actionDescription = ''

    switch (action) {
      case 'block':
        updateData.status = 'blocked'
        actionDescription = 'Blocked cards'
        break
      case 'unblock':
        updateData.status = 'active'
        actionDescription = 'Unblocked cards'
        break
      case 'unassign':
        updateData.assigned_to = null
        updateData.assigned_at = null
        updateData.assigned_casino_id = null
        actionDescription = 'Unassigned cards'
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Получаем информацию о картах перед обновлением
    const { data: cardsBeforeUpdate, error: fetchError } = await supabase
      .from('cards')
      .select('id, card_number_mask, status, assigned_to')
      .in('id', card_ids)

    if (fetchError) {
      console.error('Fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 })
    }

    // Обновляем карты
    const { error: updateError } = await supabase
      .from('cards')
      .update(updateData)
      .in('id', card_ids)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update cards' }, { status: 500 })
    }

    // Если отзываем карты, обновляем статус назначений
    if (action === 'unassign') {
      // Обновляем card_assignments
      await supabase
        .from('card_assignments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .in('card_id', card_ids)
        .eq('status', 'active')

      // Обновляем card_casino_assignments
      await supabase
        .from('card_casino_assignments')
        .update({
          status: 'completed'
        })
        .in('card_id', card_ids)
        .eq('status', 'active')
    }

    // Логируем действия для каждой карты
    const historyRecords = cardsBeforeUpdate?.map(card => ({
      action_type: action,
      entity_type: 'card',
      entity_id: card.id,
      entity_name: card.card_number_mask,
      change_description: `${actionDescription}${comment ? `: ${comment}` : ''}`,
      performed_by: userData.id,
      old_values: {
        status: card.status,
        assigned_to: card.assigned_to
      },
      new_values: updateData
    })) || []

    if (historyRecords.length > 0) {
      await supabase
        .from('action_history')
        .insert(historyRecords)
    }

    return NextResponse.json({ 
      success: true, 
      message: `${card_ids.length} cards ${action}ed successfully`,
      updated_count: card_ids.length,
      action,
      card_ids
    })

  } catch (error) {
    console.error('Bulk cards operation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
