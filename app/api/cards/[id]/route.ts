import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить информацию о карте
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const cardId = params.id
    
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

    if (!userData || !['manager', 'cfo', 'admin', 'junior'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Получаем информацию о карте
    const { data: card, error: cardError } = await supabase
      .from('cards_with_bank_info')
      .select('*')
      .eq('id', cardId)
      .single()

    if (cardError || !card) {
      return NextResponse.json({ error: 'Карта не найдена' }, { status: 404 })
    }

    return NextResponse.json({ card })

  } catch (error) {
    console.error('Get card error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Обновить карту
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const cardId = params.id
    
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

    if (!userData || !['manager', 'cfo', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      card_type, 
      status, 
      daily_limit, 
      exp_month, 
      exp_year,
      card_bin,
      card_number,
      cvv
    } = body

    // Получаем текущие данные карты
    const { data: currentCard, error: getCardError } = await supabase
      .from('cards')
      .select('*')
      .eq('id', cardId)
      .single()

    if (getCardError || !currentCard) {
      return NextResponse.json({ error: 'Карта не найдена' }, { status: 404 })
    }

    // Проверяем, что карта не используется в активных работах
    if (status === 'blocked' || status === 'inactive') {
      const { data: activeWorks } = await supabase
        .from('works')
        .select('id')
        .eq('card_id', cardId)
        .eq('status', 'active')

      if (activeWorks && activeWorks.length > 0) {
        return NextResponse.json({ 
          error: 'Нельзя блокировать карту с активными работами. Сначала завершите все работы.' 
        }, { status: 400 })
      }
    }

    // Обновляем карту
    const { data: updatedCard, error: updateError } = await supabase
      .from('cards')
      .update({
        card_type: card_type || undefined,
        status: status || undefined,
        daily_limit: daily_limit !== undefined ? daily_limit : undefined,
        exp_month: exp_month || undefined,
        exp_year: exp_year || undefined,
        card_bin: card_bin || undefined
      })
      .eq('id', cardId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Обновляем секретные данные карты если они предоставлены (только для CFO/Admin)
    if ((card_number || cvv) && ['cfo', 'admin'].includes(userData.role)) {
      const secretUpdates: any = {}
      
      if (card_number) {
        secretUpdates.pan_encrypted = `ENCRYPTED_${card_number}` // В реальности здесь будет шифрование
        // Обновляем маску карты
        const cardMask = card_number.replace(/(\d{4})\d{8}(\d{4})/, '$1****$2')
        await supabase
          .from('cards')
          .update({ card_number_mask: cardMask })
          .eq('id', cardId)
      }
      
      if (cvv) {
        secretUpdates.cvv_encrypted = `ENCRYPTED_${cvv}` // В реальности здесь будет шифрование
      }

      if (Object.keys(secretUpdates).length > 0) {
        await supabase
          .from('card_secrets')
          .update(secretUpdates)
          .eq('card_id', cardId)
      }
    }

    return NextResponse.json({
      success: true,
      card: updatedCard,
      message: `Карта ${currentCard.card_number_mask} обновлена`
    })

  } catch (error) {
    console.error('Update card error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Удалить карту
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const cardId = params.id
    
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

    if (!userData || !['cfo', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden - только CFO и Admin могут удалять карты' }, { status: 403 })
    }

    // Получаем информацию о карте
    const { data: card, error: getCardError } = await supabase
      .from('cards')
      .select('card_number_mask')
      .eq('id', cardId)
      .single()

    if (getCardError || !card) {
      return NextResponse.json({ error: 'Карта не найдена' }, { status: 404 })
    }

    // Проверяем есть ли активные работы с этой картой
    const { data: activeWorks } = await supabase
      .from('works')
      .select('id')
      .eq('card_id', cardId)
      .eq('status', 'active')

    if (activeWorks && activeWorks.length > 0) {
      return NextResponse.json({ 
        error: 'Нельзя удалить карту с активными работами. Сначала завершите все работы.' 
      }, { status: 400 })
    }

    // Проверяем есть ли незавершенные выводы
    const { data: pendingWithdrawals } = await supabase
      .from('work_withdrawals')
      .select('id')
      .eq('card_id', cardId)
      .in('status', ['pending', 'processing'])

    if (pendingWithdrawals && pendingWithdrawals.length > 0) {
      return NextResponse.json({ 
        error: 'Нельзя удалить карту с незавершенными выводами. Сначала обработайте все выводы.' 
      }, { status: 400 })
    }

    // Логируем удаление карты перед удалением
    await supabase.rpc('log_action', {
      p_action_type: 'card_deleted',
      p_entity_type: 'card',
      p_entity_id: cardId,
      p_entity_name: card.card_number_mask,
      p_old_values: { card_mask: card.card_number_mask },
      p_change_description: `Удалена карта: ${card.card_number_mask}`,
      p_performed_by: userData.id,
      p_ip_address: request.headers.get('x-forwarded-for') || '127.0.0.1',
      p_user_agent: request.headers.get('user-agent') || ''
    })

    // Удаляем карту (каскадное удаление удалит связанные записи)
    const { error: deleteError } = await supabase
      .from('cards')
      .delete()
      .eq('id', cardId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Карта ${card.card_number_mask} удалена`
    })

  } catch (error) {
    console.error('Delete card error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
