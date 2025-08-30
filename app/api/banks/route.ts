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

    // Получаем банки с аккаунтами (минимальный набор полей)
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
          balance,
          currency,
          is_active,
          balance_updated_at,
          balance_updated_by
        )
      `)
      .eq('is_active', true)
      .order('name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Форматируем данные (упрощенная версия без связей с пользователями)
    const formattedBanks = banks.map(bank => ({
      ...bank,
      accounts: bank.bank_accounts.filter(acc => acc.is_active).map(account => ({
        ...account,
        account_number: account.account_number || 'Не указан',
        updated_by_user: null, // Пока убираем связи с пользователями
        cards_available: account.balance >= 10
      }))
    }))

    return NextResponse.json({ banks: formattedBanks })

  } catch (error) {
    console.error('Get banks error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
