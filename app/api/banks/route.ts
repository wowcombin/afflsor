import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить все банки с аккаунтами и статистикой
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
      .select('id, role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData || !['manager', 'hr', 'tester', 'cfo', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Получаем статистику
    const { data: stats, error: statsError } = await supabase
      .rpc('get_bank_statistics')

    if (statsError) {
      console.error('Ошибка получения статистики:', statsError)
    }

    // Сводка по банкам будет рассчитана из данных
    const bankSummary: any[] = []

    // Получаем детальную информацию по банкам, аккаунтам и картам
    const { data: banks, error: banksError } = await supabase
      .from('banks')
      .select(`
        id,
        name,
        country,
        currency,
        is_active,
        created_at,
        bank_accounts(
          id,
          holder_name,
          account_number,
          balance,
          currency,
          is_active,
          balance_updated_at,
          balance_updated_by,
          sort_code,
          bank_url,
          login_password,
          cards(
            id,
            card_number_mask,
            card_bin,
            card_type,
            status,
            assigned_to,
            exp_month,
            exp_year,
            daily_limit
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (banksError) {
      return NextResponse.json({ error: banksError.message }, { status: 500 })
    }

    // Получаем актуальные курсы валют
    let exchangeRates = {
      'USD': 1.0,
      'EUR': 1.11,   // Fallback
      'GBP': 1.31,   // Fallback
      'CAD': 0.71    // Fallback
    }
    
    try {
      // Получаем актуальные курсы с нашего API
      const ratesResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/currency-rates`)
      if (ratesResponse.ok) {
        const ratesData = await ratesResponse.json()
        if (ratesData.success && ratesData.rates) {
          exchangeRates = ratesData.rates
          console.log('Using fresh exchange rates:', ratesData.source)
        }
      }
    } catch (error) {
      console.log('Using fallback exchange rates due to API error')
    }

    // Форматируем данные и считаем правильные балансы
    const formattedBanks = banks.map(bank => ({
      ...bank,
      accounts: bank.bank_accounts
        .map(account => ({
          ...account,
          account_number: account.account_number || 'Не указан',
          cards_available: account.balance >= 10,
          last_updated: account.balance_updated_at,
          cards: account.cards || [],
          balance_usd: (account.balance || 0) * (exchangeRates[account.currency as keyof typeof exchangeRates] || 1)
        }))
    }))

    // Получаем все аккаунты
    const allAccounts = formattedBanks.flatMap(bank => bank.accounts)
    const activeAccounts = allAccounts.filter(account => account.is_active)
    const blockedAccounts = allAccounts.filter(account => !account.is_active)

    // Пересчитываем статистику с правильной конвертацией (только активные)
    const totalBalanceUSD = activeAccounts
      .reduce((sum, account) => sum + (account.balance_usd || 0), 0)

    const blockedBalanceUSD = blockedAccounts
      .reduce((sum, account) => sum + (account.balance_usd || 0), 0)

    // Карты только из активных аккаунтов
    const totalCards = activeAccounts
      .flatMap(account => account.cards)
      .length

    const activeCards = activeAccounts
      .flatMap(account => account.cards)
      .filter(card => card.status === 'active')
      .length

    const lowBalanceAccounts = activeAccounts
      .filter(account => account.balance < 10)
      .length

    return NextResponse.json({
      banks: formattedBanks,
      summary: bankSummary,
      statistics: {
        total_banks: formattedBanks.length,
        active_banks: formattedBanks.filter(bank => bank.is_active).length,
        total_accounts: allAccounts.length,
        active_accounts: activeAccounts.length,
        blocked_accounts: blockedAccounts.length,
        total_balance: totalBalanceUSD, // Только активные аккаунты
        blocked_balance: blockedBalanceUSD, // Баланс заблокированных аккаунтов
        total_cards: totalCards, // Только из активных аккаунтов
        available_cards: activeCards, // Только из активных аккаунтов
        low_balance_accounts: lowBalanceAccounts // Только активные с низким балансом
      },
      exchange_rates: {
        info: "Динамические курсы валют к USD (обновляются каждый час)",
        rates: exchangeRates,
        coefficient: 0.95,
        last_updated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Get banks error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Создать новый банк (только CFO/Admin)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
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
      return NextResponse.json({ error: 'Forbidden - только CFO и Admin могут создавать банки' }, { status: 403 })
    }

    const body = await request.json()
    const { name, country, currency } = body

    // Валидация
    if (!name) {
      return NextResponse.json({ error: 'Название банка обязательно' }, { status: 400 })
    }

    // Создаем банк
    const { data: newBank, error } = await supabase
      .from('banks')
      .insert({
        name,
        country: country || null,
        currency: currency || 'USD',
        is_active: true
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Логируем создание банка
    await supabase.rpc('log_action', {
      p_action_type: 'bank_created',
      p_entity_type: 'bank',
      p_entity_id: newBank.id,
      p_entity_name: name,
      p_new_values: { name, country, currency },
      p_change_description: `Создан новый банк: ${name} (${country}, ${currency})`,
      p_performed_by: userData.id,
      p_ip_address: request.headers.get('x-forwarded-for') || '127.0.0.1',
      p_user_agent: request.headers.get('user-agent') || ''
    })

    return NextResponse.json({
      success: true,
      bank: newBank,
      message: `Банк ${name} успешно создан`
    })

  } catch (error) {
    console.error('Create bank error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
