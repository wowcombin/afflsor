import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// PATCH - Обновить банковский аккаунт (блокировка/разблокировка)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const accountId = params.id
    
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      is_active, 
      holder_name, 
      account_number,
      sort_code,
      bank_url,
      login_password
    } = body

    // Получаем текущие данные аккаунта
    const { data: currentAccount, error: getAccountError } = await supabase
      .from('bank_accounts')
      .select('id, holder_name, is_active')
      .eq('id', accountId)
      .single()

    if (getAccountError || !currentAccount) {
      return NextResponse.json({ error: 'Банковский аккаунт не найден' }, { status: 404 })
    }

    // Обновляем аккаунт
    const updateData: any = {}
    if (holder_name !== undefined) updateData.holder_name = holder_name
    if (account_number !== undefined) updateData.account_number = account_number
    if (sort_code !== undefined) updateData.sort_code = sort_code
    if (bank_url !== undefined) updateData.bank_url = bank_url
    if (login_password !== undefined) updateData.login_password = login_password
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: updatedAccount, error: updateError } = await supabase
      .from('bank_accounts')
      .update(updateData)
      .eq('id', accountId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Если аккаунт деактивирован, блокируем все карты
    if (is_active === false && currentAccount.is_active === true) {
      await supabase
        .from('cards')
        .update({ status: 'blocked' })
        .eq('bank_account_id', accountId)
    }

    // Если аккаунт активирован, восстанавливаем карты (если баланс достаточный)
    if (is_active === true && currentAccount.is_active === false) {
      const { data: account } = await supabase
        .from('bank_accounts')
        .select('balance')
        .eq('id', accountId)
        .single()

      if (account && account.balance >= 10) {
        await supabase
          .from('cards')
          .update({ status: 'active' })
          .eq('bank_account_id', accountId)
          .eq('status', 'blocked')
      }
    }

    const actionMessage = is_active === false ? 'отправлен в архив' : is_active === true ? 'восстановлен из архива' : 'обновлен'

    // Логируем действие
    const actionType = is_active === false ? 'account_blocked' : is_active === true ? 'account_updated' : 'account_updated'
    
    await supabase.rpc('log_action', {
      p_action_type: actionType,
      p_entity_type: 'account',
      p_entity_id: accountId,
      p_entity_name: currentAccount.holder_name,
      p_old_values: { 
        is_active: currentAccount.is_active,
        holder_name: currentAccount.holder_name
      },
      p_new_values: updateData,
      p_change_description: `Аккаунт ${currentAccount.holder_name} ${actionMessage}`,
      p_performed_by: userData.id,
      p_ip_address: request.headers.get('x-forwarded-for') || '127.0.0.1',
      p_user_agent: request.headers.get('user-agent') || ''
    })

    return NextResponse.json({
      success: true,
      account: updatedAccount,
      message: `Аккаунт ${currentAccount.holder_name} ${actionMessage}`
    })

  } catch (error) {
    console.error('Update bank account error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Удалить банковский аккаунт (только Admin)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const accountId = params.id
    
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
      return NextResponse.json({ error: 'Forbidden - только CFO и Admin могут удалять аккаунты' }, { status: 403 })
    }

    // Получаем информацию об аккаунте
    const { data: account, error: getAccountError } = await supabase
      .from('bank_accounts')
      .select(`
        id, 
        holder_name,
        cards(id)
      `)
      .eq('id', accountId)
      .single()

    if (getAccountError || !account) {
      return NextResponse.json({ error: 'Банковский аккаунт не найден' }, { status: 404 })
    }

    // Проверяем есть ли активные работы с картами этого аккаунта
    if (account.cards && account.cards.length > 0) {
      const cardIds = account.cards.map((card: any) => card.id)
      
      const { data: activeWorks } = await supabase
        .from('works')
        .select('id')
        .in('card_id', cardIds)
        .eq('status', 'active')

      if (activeWorks && activeWorks.length > 0) {
        return NextResponse.json({ 
          error: 'Нельзя удалить аккаунт с активными работами. Сначала завершите все работы.' 
        }, { status: 400 })
      }
    }

    // Логируем удаление аккаунта перед удалением
    await supabase.rpc('log_action', {
      p_action_type: 'account_deleted',
      p_entity_type: 'account',
      p_entity_id: accountId,
      p_entity_name: account.holder_name,
      p_change_description: `Удален аккаунт: ${account.holder_name}`,
      p_performed_by: userData.id,
      p_old_values: { 
        holder_name: account.holder_name,
        cards_count: account.cards ? account.cards.length : 0
      },
      p_ip_address: request.headers.get('x-forwarded-for') || '127.0.0.1',
      p_user_agent: request.headers.get('user-agent') || ''
    })

    // Удаляем аккаунт (каскадное удаление удалит карты)
    const { error: deleteError } = await supabase
      .from('bank_accounts')
      .delete()
      .eq('id', accountId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Аккаунт ${account.holder_name} и все связанные карты удалены`
    })

  } catch (error) {
    console.error('Delete bank account error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
