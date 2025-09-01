import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST - Создать новый банковский аккаунт
export async function POST(
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
      return NextResponse.json({ error: 'Forbidden - только CFO и Admin могут создавать аккаунты' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      holder_name, 
      account_number, 
      balance, 
      currency,
      sort_code,
      bank_url,
      login_password
    } = body

    // Валидация
    if (!holder_name) {
      return NextResponse.json({ error: 'Имя держателя аккаунта обязательно' }, { status: 400 })
    }

    if (balance < 0) {
      return NextResponse.json({ error: 'Баланс не может быть отрицательным' }, { status: 400 })
    }

    // Проверяем что банк существует
    const { data: bank, error: bankError } = await supabase
      .from('banks')
      .select('id, name')
      .eq('id', bankId)
      .eq('is_active', true)
      .single()

    if (bankError || !bank) {
      return NextResponse.json({ error: 'Банк не найден' }, { status: 404 })
    }

    // Создаем аккаунт
    const { data: newAccount, error } = await supabase
      .from('bank_accounts')
      .insert({
        bank_id: bankId,
        holder_name,
        account_number: account_number || null,
        balance: balance || 0,
        currency: currency || 'USD',
        sort_code: sort_code || null,
        bank_url: bank_url || null,
        login_password: login_password || null,
        is_active: true,
        balance_updated_by: userData.id
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Логируем создание аккаунта
    if (newAccount.balance > 0) {
      await supabase
        .from('bank_balance_history')
        .insert({
          bank_account_id: newAccount.id,
          old_balance: 0,
          new_balance: newAccount.balance,
          change_amount: newAccount.balance,
          change_reason: 'Создание аккаунта с начальным балансом',
          changed_by: userData.id
        })
    }

    return NextResponse.json({
      success: true,
      account: newAccount,
      message: `Аккаунт ${holder_name} создан в банке ${bank.name}`
    })

  } catch (error) {
    console.error('Create bank account error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
