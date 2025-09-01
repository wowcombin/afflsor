import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// API для назначения карт на казино или Junior

// PATCH - Назначить/отозвать карту для казино или Junior
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { id } = params
    
    // Проверка аутентификации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData || userData.status !== 'active') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { action, casino_id, junior_id } = body
    
    console.log('🎯 Card assignment request:', {
      cardId: id,
      action,
      casino_id,
      junior_id,
      userRole: userData.role
    })

    // Проверяем что карта существует
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select(`
        id,
        card_number_mask,
        status,
        assigned_to,
        assigned_casino_id,
        bank_accounts!inner(
          id,
          holder_name,
          banks!inner(name)
        )
      `)
      .eq('id', id)
      .single()

    if (cardError || !card) {
      console.error('❌ Card not found:', { cardId: id, cardError })
      return NextResponse.json({ error: 'Карта не найдена' }, { status: 404 })
    }
    
    console.log('🃏 Found card:', {
      cardId: card.id,
      mask: card.card_number_mask,
      status: card.status,
      assigned_to: card.assigned_to,
      assigned_casino_id: card.assigned_casino_id
    })

    let updateData: any = {}
    let logMessage = ''

    switch (action) {
      case 'assign_to_casino':
        // Только Tester может назначать карты для казино
        if (userData.role !== 'tester') {
          console.error('❌ Wrong role:', userData.role)
          return NextResponse.json({ error: 'Forbidden - только Tester может назначать карты для тестирования' }, { status: 403 })
        }

        if (!casino_id) {
          console.error('❌ No casino_id provided')
          return NextResponse.json({ error: 'Укажите казино для назначения' }, { status: 400 })
        }

        if (card.status !== 'active' || card.assigned_to || card.assigned_casino_id) {
          console.error('❌ Card not available:', {
            status: card.status,
            assigned_to: card.assigned_to,
            assigned_casino_id: card.assigned_casino_id
          })
          return NextResponse.json({ 
            error: `Карта недоступна для назначения. Статус: ${card.status}, назначена пользователю: ${!!card.assigned_to}, назначена казино: ${!!card.assigned_casino_id}` 
          }, { status: 400 })
        }

        // Проверяем что казино существует
        const { data: casino, error: casinoError } = await supabase
          .from('casinos')
          .select('id, name, status')
          .eq('id', casino_id)
          .single()

        if (casinoError || !casino) {
          return NextResponse.json({ error: 'Казино не найдено' }, { status: 404 })
        }

        if (!['new', 'testing'].includes(casino.status)) {
          return NextResponse.json({ error: 'Карты можно назначать только новым казино или казино в процессе тестирования' }, { status: 400 })
        }

        updateData = { assigned_casino_id: casino_id }
        logMessage = `Карта ${card.card_number_mask} назначена для тестирования казино "${casino.name}"`
        break

      case 'unassign_from_casino':
        // Только Tester может отзывать карты с тестирования
        if (userData.role !== 'tester') {
          return NextResponse.json({ error: 'Forbidden - только Tester может отзывать карты с тестирования' }, { status: 403 })
        }

        if (!card.assigned_casino_id) {
          return NextResponse.json({ error: 'Карта не назначена для тестирования' }, { status: 400 })
        }

        updateData = { assigned_casino_id: null }
        logMessage = `Карта ${card.card_number_mask} отозвана с тестирования`
        break

      case 'assign_to_junior':
        // Manager может назначать карты Junior
        if (!['manager', 'admin'].includes(userData.role)) {
          return NextResponse.json({ error: 'Forbidden - только Manager и Admin могут назначать карты Junior' }, { status: 403 })
        }

        if (!junior_id) {
          return NextResponse.json({ error: 'Укажите Junior для назначения' }, { status: 400 })
        }

        if (card.status !== 'active' || card.assigned_to || card.assigned_casino_id) {
          return NextResponse.json({ error: 'Карта недоступна для назначения' }, { status: 400 })
        }

        // Проверяем что Junior существует
        const { data: junior, error: juniorError } = await supabase
          .from('users')
          .select('id, first_name, last_name, role')
          .eq('id', junior_id)
          .eq('role', 'junior')
          .single()

        if (juniorError || !junior) {
          return NextResponse.json({ error: 'Junior не найден' }, { status: 404 })
        }

        updateData = { assigned_to: junior_id }
        logMessage = `Карта ${card.card_number_mask} назначена Junior ${junior.first_name} ${junior.last_name}`
        break

      case 'unassign_from_junior':
        // Manager может отзывать карты у Junior
        if (!['manager', 'admin'].includes(userData.role)) {
          return NextResponse.json({ error: 'Forbidden - только Manager и Admin могут отзывать карты у Junior' }, { status: 403 })
        }

        if (!card.assigned_to) {
          return NextResponse.json({ error: 'Карта не назначена Junior' }, { status: 400 })
        }

        updateData = { assigned_to: null }
        logMessage = `Карта ${card.card_number_mask} отозвана у Junior`
        break

      default:
        return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 })
    }

    // Обновляем карту
    const { data: updatedCard, error: updateError } = await supabase
      .from('cards')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    console.log('✅ Card updated successfully:', {
      cardId: id,
      updateData,
      updatedCard: updatedCard?.id
    })

    // Логируем действие (без ошибок если функция не существует)
    try {
      await supabase.rpc('log_action', {
        p_user_id: userData.id,
        p_action: 'UPDATE',
        p_entity_type: 'card_assignment',
        p_entity_id: id,
        p_details: logMessage
      })
    } catch (logError) {
      console.warn('⚠️ Logging failed:', logError)
      // Продолжаем работу даже если логирование не работает
    }

    return NextResponse.json({
      success: true,
      card: updatedCard,
      message: logMessage
    })

  } catch (error) {
    console.error('Card assignment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}