import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// PATCH - Обновить баланс банковского аккаунта
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

    if (!userData || !['manager', 'hr', 'cfo', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { balance, comment } = body

    // Валидация
    if (typeof balance !== 'number' || balance < 0) {
      return NextResponse.json({ error: 'Некорректный баланс' }, { status: 400 })
    }

    // Получаем IP и User Agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     '127.0.0.1'
    const userAgent = request.headers.get('user-agent') || ''

    // Получаем старый баланс для логирования
    const { data: currentAccount, error: getAccountError } = await supabase
      .from('bank_accounts')
      .select('balance, holder_name, currency')
      .eq('id', accountId)
      .single()

    if (getAccountError || !currentAccount) {
      return NextResponse.json({ error: 'Аккаунт не найден' }, { status: 404 })
    }

    const oldBalance = currentAccount.balance

    // Обновляем баланс через безопасную функцию
    const { data: updateResult, error: updateError } = await supabase
      .rpc('update_bank_balance', {
        p_account_id: accountId,
        p_new_balance: balance,
        p_user_id: userData.id,
        p_comment: comment || `Обновлено через интерфейс ${userData.role}`,
        p_ip_address: ipAddress,
        p_user_agent: userAgent
      })

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Получаем обновленные данные аккаунта
    const { data: updatedAccount, error: fetchError } = await supabase
      .from('bank_accounts')
      .select(`
        id,
        holder_name,
        account_number,
        balance,
        currency,
        balance_updated_at,
        banks!inner(name, country)
      `)
      .eq('id', accountId)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: 'Ошибка получения обновленных данных' }, { status: 500 })
    }

    // Получаем количество затронутых карт
    const { data: affectedCards, error: cardsError } = await supabase
      .from('cards')
      .select('id, status')
      .eq('bank_account_id', accountId)

    const bankInfo = Array.isArray(updatedAccount.banks) ? updatedAccount.banks[0] : updatedAccount.banks

    // Логируем изменение баланса в общую историю
    await supabase.rpc('log_action', {
      p_action_type: 'balance_updated',
      p_entity_type: 'account',
      p_entity_id: accountId,
      p_entity_name: updatedAccount.holder_name,
      p_change_description: `Изменен баланс аккаунта ${updatedAccount.holder_name}: ${oldBalance.toFixed(2)} → ${balance.toFixed(2)} ${updatedAccount.currency}. Причина: ${comment}`,
      p_performed_by: userData.id,
      p_old_values: { balance: oldBalance },
      p_new_values: { balance: balance, comment: comment },
      p_ip_address: request.headers.get('x-forwarded-for') || '127.0.0.1',
      p_user_agent: request.headers.get('user-agent') || ''
    })

    return NextResponse.json({
      success: true,
      message: `Баланс аккаунта "${updatedAccount.holder_name}" обновлен`,
      account: {
        ...updatedAccount,
        bank_name: bankInfo?.name,
        bank_country: bankInfo?.country
      },
      affected_cards: affectedCards?.length || 0,
      cards_status: {
        available: affectedCards?.filter(c => c.status === 'active').length || 0,
        hidden: affectedCards?.filter(c => c.status === 'low_balance').length || 0
      }
    })

  } catch (error) {
    console.error('Update bank balance error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Получить историю изменений баланса
export async function GET(
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
      .select('role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData || !['manager', 'hr', 'cfo', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Получаем историю изменений
    const { data: history, error } = await supabase
      .from('bank_balance_history')
      .select(`
        id,
        old_balance,
        new_balance,
        change_amount,
        change_reason,
        created_at,
        ip_address,
        users!bank_balance_history_changed_by_fkey(
          first_name,
          last_name,
          role
        )
      `)
      .eq('bank_account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Форматируем историю
    const formattedHistory = history.map(entry => {
      const userInfo = Array.isArray(entry.users) ? entry.users[0] : entry.users
      
      return {
        ...entry,
        changed_by_user: userInfo ? {
          name: `${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim(),
          role: userInfo.role
        } : null
      }
    })

    return NextResponse.json({ history: formattedHistory })

  } catch (error) {
    console.error('Get balance history error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
