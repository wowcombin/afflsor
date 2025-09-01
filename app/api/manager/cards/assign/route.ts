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
    const { card_id, user_id, casino_id, notes } = body

    if (!card_id || !user_id) {
      return NextResponse.json({ error: 'Card ID and User ID are required' }, { status: 400 })
    }

    // Проверяем, что карта существует и доступна для назначения
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select(`
        id,
        status,
        assigned_to,
        bank_account:bank_accounts (
          balance,
          is_active
        )
      `)
      .eq('id', card_id)
      .single()

    if (cardError || !card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    if (card.assigned_to) {
      return NextResponse.json({ error: 'Card is already assigned' }, { status: 400 })
    }

    if (card.status !== 'active') {
      return NextResponse.json({ error: 'Card is not active' }, { status: 400 })
    }

    const bankAccount = card.bank_account as any
    if (!bankAccount?.is_active || (bankAccount?.balance || 0) < 10) {
      return NextResponse.json({ 
        error: 'Insufficient balance or inactive bank account',
        required_balance: 10,
        current_balance: bankAccount?.balance || 0
      }, { status: 400 })
    }

    // Проверяем, что пользователь существует и является junior'ом
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, role, status')
      .eq('id', user_id)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (targetUser.role !== 'junior' || targetUser.status !== 'active') {
      return NextResponse.json({ error: 'User must be an active junior' }, { status: 400 })
    }

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
      .eq('id', card_id)

    if (assignError) {
      console.error('Assignment error:', assignError)
      return NextResponse.json({ error: 'Failed to assign card' }, { status: 500 })
    }

    // Создаем запись в card_assignments
    const { error: assignmentError } = await supabase
      .from('card_assignments')
      .insert({
        card_id,
        user_id,
        assigned_by: userData.id,
        status: 'active',
        notes
      })

    if (assignmentError) {
      console.error('Assignment record error:', assignmentError)
      // Не критично, продолжаем
    }

    // Логируем действие
    await supabase
      .from('action_history')
      .insert({
        action_type: 'assign',
        entity_type: 'card',
        entity_id: card_id,
        entity_name: `Card assignment to user ${user_id}`,
        change_description: `Manager assigned card to junior${notes ? `: ${notes}` : ''}`,
        performed_by: userData.id,
        new_values: { 
          assigned_to: user_id, 
          assigned_casino_id: casino_id,
          notes 
        }
      })

    // Здесь можно добавить уведомление junior'у
    // await sendNotificationToJunior(user_id, 'card_assigned', { card_id })

    return NextResponse.json({ 
      success: true, 
      message: 'Card assigned successfully',
      assignment: {
        card_id,
        user_id,
        assigned_by: userData.id,
        assigned_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Card assignment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
