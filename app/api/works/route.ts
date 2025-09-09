import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить работы пользователя
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const junior_id = searchParams.get('junior_id')
    
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

    // Получаем работы с полной информацией
    let query = supabase
      .from('works')
      .select(`
        id,
        deposit_amount,
        status,
        casino_login,
        casino_password,
        notes,
        work_date,
        created_at,
        casinos!inner(id, name, url, currency, promo, auto_approve_limit),
        cards!inner(
          id, 
          card_number_mask, 
          card_bin, 
          card_type,
          bank_account:bank_accounts(
            id,
            holder_name,
            currency,
            bank:banks(name, country)
          )
        ),
        users!inner(id, first_name, last_name, email),
        work_withdrawals(
          id,
          withdrawal_amount,
          status,
          checked_at,
          alarm_message,
          manager_notes,
          created_at
        )
      `)

    // Фильтрация по роли
    if (userData.role === 'junior') {
      // Junior видит только свои работы
      query = query.eq('junior_id', userData.id)
    } else if (junior_id && ['manager', 'hr', 'cfo', 'admin'].includes(userData.role)) {
      // Manager+ может фильтровать по Junior
      query = query.eq('junior_id', junior_id)
    }

    const { data: works, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Форматируем данные
    const formattedWorks = works.map(work => {
      const casino = Array.isArray(work.casinos) ? work.casinos[0] : work.casinos
      const card = Array.isArray(work.cards) ? work.cards[0] : work.cards
      const junior = Array.isArray(work.users) ? work.users[0] : work.users
      const withdrawals = work.work_withdrawals || []

      return {
        ...work,
        casino,
        card,
        junior,
        withdrawals,
        total_withdrawals: withdrawals.reduce((sum: number, w: any) => sum + w.withdrawal_amount, 0),
        total_profit: withdrawals
          .filter((w: any) => w.status === 'received')
          .reduce((sum: number, w: any) => sum + (w.withdrawal_amount - work.deposit_amount), 0)
      }
    })

    return NextResponse.json({ works: formattedWorks })

  } catch (error) {
    console.error('Get works error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Создать новую работу
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

    if (!userData || userData.role !== 'junior') {
      return NextResponse.json({ error: 'Forbidden - только Junior могут создавать работы' }, { status: 403 })
    }

    const body = await request.json()
    const {
      casino_id,
      card_id,
      deposit_amount,
      casino_login,
      casino_password,
      notes
    } = body

    // Валидация
    if (!casino_id || !card_id || !deposit_amount) {
      return NextResponse.json({ error: 'Заполните все обязательные поля' }, { status: 400 })
    }

    if (deposit_amount <= 0) {
      return NextResponse.json({ error: 'Сумма депозита должна быть больше 0' }, { status: 400 })
    }

    // Проверяем казино
    const { data: casino, error: casinoError } = await supabase
      .from('casinos')
      .select('id, name, status, currency')
      .eq('id', casino_id)
      .single()

    if (casinoError || !casino || casino.status !== 'approved') {
      return NextResponse.json({ error: 'Казино недоступно для работы' }, { status: 400 })
    }

    // Проверяем карту
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select('id, status, assigned_to, bank_account_id')
      .eq('id', card_id)
      .single()

    if (cardError || !card) {
      return NextResponse.json({ error: 'Карта не найдена' }, { status: 404 })
    }

    if (card.assigned_to !== userData.id) {
      return NextResponse.json({ error: 'Карта не назначена вам' }, { status: 403 })
    }

    if (card.status !== 'active') {
      return NextResponse.json({ error: 'Карта недоступна' }, { status: 400 })
    }

    // Проверяем баланс банковского аккаунта
    const { data: bankAccount, error: bankError } = await supabase
      .from('bank_accounts')
      .select('balance')
      .eq('id', card.bank_account_id)
      .single()

    if (bankError || !bankAccount || bankAccount.balance < 10) {
      return NextResponse.json({ error: 'Недостаточный баланс банковского аккаунта' }, { status: 400 })
    }

    // Создаем работу
    const { data: newWork, error } = await supabase
      .from('works')
      .insert({
        junior_id: userData.id,
        casino_id,
        card_id,
        deposit_amount,
        status: 'active',
        casino_login: casino_login || null,
        casino_password: casino_password || null, // В реальности будет зашифрован
        notes: notes || null
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      work: newWork,
      message: `Работа с ${casino.name} создана. Депозит: ${deposit_amount} ${casino.currency || 'USD'}`
    })

  } catch (error) {
    console.error('Create work error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
