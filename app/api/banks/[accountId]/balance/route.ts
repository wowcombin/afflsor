import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// PATCH - Обновить баланс банковского аккаунта
export async function PATCH(
  request: Request,
  { params }: { params: { accountId: string } }
) {
  try {
    const supabase = await createClient()
    const accountId = params.accountId
    
    // Проверка аутентификации и роли
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, role')
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

    // Проверяем, что аккаунт существует
    const { data: account, error: accountError } = await supabase
      .from('bank_accounts')
      .select('id, holder_name, balance')
      .eq('id', accountId)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: 'Банковский аккаунт не найден' }, { status: 404 })
    }

    // Обновляем баланс через RPC функцию
    const { data: updateResult, error: updateError } = await supabase
      .rpc('update_bank_balance', {
        p_account_id: accountId,
        p_new_balance: balance,
        p_user_id: userData.id,
        p_comment: comment || `Обновлено через интерфейс ${userData.role}`
      })

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Получаем обновленные данные
    const { data: updatedAccount } = await supabase
      .from('bank_accounts')
      .select(`
        id,
        holder_name,
        balance,
        balance_updated_at,
        users!bank_accounts_balance_updated_by_fkey(
          first_name,
          last_name,
          role
        )
      `)
      .eq('id', accountId)
      .single()

    // Форматируем данные пользователя
    const formattedAccount = updatedAccount ? {
      ...updatedAccount,
      updated_by_user: updatedAccount.users ? {
        name: Array.isArray(updatedAccount.users) 
          ? `${updatedAccount.users[0]?.first_name || ''} ${updatedAccount.users[0]?.last_name || ''}`.trim()
          : `${updatedAccount.users.first_name || ''} ${updatedAccount.users.last_name || ''}`.trim(),
        role: Array.isArray(updatedAccount.users) ? updatedAccount.users[0]?.role : updatedAccount.users.role
      } : null
    } : null

    return NextResponse.json({
      success: true,
      message: `Баланс аккаунта "${account.holder_name}" обновлен`,
      account: formattedAccount,
      change: {
        old_balance: account.balance,
        new_balance: balance,
        change_amount: balance - account.balance
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
  { params }: { params: { accountId: string } }
) {
  try {
    const supabase = await createClient()
    const accountId = params.accountId
    
    // Проверка аутентификации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
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
      const user_info = Array.isArray(entry.users) ? entry.users[0] : entry.users
      
      return {
        ...entry,
        changed_by_user: user_info ? {
          name: `${user_info.first_name || ''} ${user_info.last_name || ''}`.trim(),
          role: user_info.role
        } : null
      }
    })

    return NextResponse.json({ history: formattedHistory })

  } catch (error) {
    console.error('Get balance history error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
