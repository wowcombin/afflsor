import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить все банки с аккаунтами
export async function GET() {
  try {
    const supabase = await createClient()
    
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

    // Получаем банки с аккаунтами
    const { data: banks, error } = await supabase
      .from('banks')
      .select(`
        id,
        name,
        country,
        currency,
        is_active,
        bank_accounts(
          id,
          holder_name,
          account_number,
          balance,
          currency,
          is_active,
          balance_updated_at,
          balance_updated_by,
          users!bank_accounts_balance_updated_by_fkey(
            first_name,
            last_name,
            role
          )
        )
      `)
      .eq('is_active', true)
      .order('name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Форматируем данные
    const formattedBanks = banks.map(bank => ({
      ...bank,
      accounts: bank.bank_accounts.filter(acc => acc.is_active).map(account => ({
        ...account,
        updated_by_user: account.users ? {
          name: `${account.users.first_name || ''} ${account.users.last_name || ''}`.trim(),
          role: account.users.role
        } : null,
        cards_available: account.balance >= 10
      }))
    }))

    return NextResponse.json({ banks: formattedBanks })

  } catch (error) {
    console.error('Get banks error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
