import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// PATCH - Обновить банк (статус, данные)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const bankId = params.id
    
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
      return NextResponse.json({ error: 'Forbidden - только CFO и Admin могут изменять банки' }, { status: 403 })
    }

    const body = await request.json()
    const { name, country, currency, is_active } = body

    // Получаем текущие данные банка
    const { data: currentBank, error: getBankError } = await supabase
      .from('banks')
      .select('id, name, is_active')
      .eq('id', bankId)
      .single()

    if (getBankError || !currentBank) {
      return NextResponse.json({ error: 'Банк не найден' }, { status: 404 })
    }

    // Обновляем банк
    const { data: updatedBank, error: updateError } = await supabase
      .from('banks')
      .update({
        name: name || undefined,
        country: country || undefined,
        currency: currency || undefined,
        is_active: is_active !== undefined ? is_active : undefined
      })
      .eq('id', bankId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Если банк деактивирован, деактивируем все аккаунты и карты
    if (is_active === false && currentBank.is_active === true) {
      // Получаем ID аккаунтов для этого банка
      const { data: bankAccountIds } = await supabase
        .from('bank_accounts')
        .select('id')
        .eq('bank_id', bankId)

      if (bankAccountIds && bankAccountIds.length > 0) {
        const accountIds = bankAccountIds.map(acc => acc.id)

        // Деактивируем аккаунты
        await supabase
          .from('bank_accounts')
          .update({ is_active: false })
          .eq('bank_id', bankId)

        // Блокируем карты
        await supabase
          .from('cards')
          .update({ status: 'blocked' })
          .in('bank_account_id', accountIds)
      }
    }

    const actionMessage = is_active === false ? 'заблокирован' : 'обновлен'

    // Логируем действие
    await supabase.rpc('log_action', {
      p_action_type: is_active === false ? 'bank_blocked' : 'bank_updated',
      p_entity_type: 'bank',
      p_entity_id: bankId,
      p_entity_name: currentBank.name,
      p_old_values: { is_active: currentBank.is_active },
      p_new_values: { is_active: is_active },
      p_change_description: `Банк ${currentBank.name} ${actionMessage}`,
      p_performed_by: userData.id,
      p_ip_address: request.headers.get('x-forwarded-for') || '127.0.0.1',
      p_user_agent: request.headers.get('user-agent') || ''
    })

    return NextResponse.json({
      success: true,
      bank: updatedBank,
      message: `Банк ${currentBank.name} ${actionMessage}`
    })

  } catch (error) {
    console.error('Update bank error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Удалить банк (только для заблокированных банков)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const bankId = params.id
    
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
      return NextResponse.json({ error: 'Forbidden - только CFO и Admin могут удалять банки' }, { status: 403 })
    }

    // Получаем информацию о банке
    const { data: bank, error: getBankError } = await supabase
      .from('banks')
      .select('id, name, is_active')
      .eq('id', bankId)
      .single()

    if (getBankError || !bank) {
      return NextResponse.json({ error: 'Банк не найден' }, { status: 404 })
    }

    // Проверяем что банк заблокирован
    if (bank.is_active) {
      return NextResponse.json({ 
        error: 'Нельзя удалить активный банк. Сначала заблокируйте его.' 
      }, { status: 400 })
    }

    // Проверяем есть ли активные работы с картами этого банка
    const { data: activeWorks } = await supabase
      .rpc('check_bank_active_works', { bank_id: bankId })

    if (activeWorks && activeWorks > 0) {
      return NextResponse.json({ 
        error: 'Нельзя удалить банк с активными работами. Сначала завершите все работы.' 
      }, { status: 400 })
    }

    // Логируем удаление банка перед удалением
    await supabase.rpc('log_action', {
      p_action_type: 'bank_deleted',
      p_entity_type: 'bank',
      p_entity_id: bankId,
      p_entity_name: bank.name,
      p_change_description: `Удален заблокированный банк: ${bank.name}`,
      p_performed_by: userData.id,
      p_old_values: { name: bank.name, is_active: bank.is_active },
      p_ip_address: request.headers.get('x-forwarded-for') || '127.0.0.1',
      p_user_agent: request.headers.get('user-agent') || ''
    })

    // Удаляем банк (каскадное удаление удалит аккаунты и карты)
    const { error: deleteError } = await supabase
      .from('banks')
      .delete()
      .eq('id', bankId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Банк ${bank.name} и все связанные данные удалены`
    })

  } catch (error) {
    console.error('Delete bank error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
