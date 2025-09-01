import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить все тестовые работы
export async function GET(request: Request) {
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

    if (!userData || userData.status !== 'active') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Получаем тестовые работы с информацией о казино и картах
    let query = supabase
      .from('casino_tests')
      .select(`
        id,
        casino_id,
        card_id,
        status,
        deposit_amount,
        withdrawal_amount,
        withdrawal_status,
        withdrawal_requested_at,
        withdrawal_notes,
        registration_time,
        deposit_success,
        withdrawal_success,
        withdrawal_time,
        test_notes,
        rating,
        created_at,
        completed_at,
        casinos!inner(id, name, url, company, currency, promo),
        cards!inner(
          id, 
          card_number_mask, 
          card_bin,
          full_card_number,
          cvv,
          exp_month,
          exp_year,
          bank_accounts!inner(
            holder_name,
            banks!inner(name, country)
          )
        ),
        test_withdrawals!left(
          id,
          withdrawal_amount,
          withdrawal_status,
          withdrawal_notes,
          requested_at
        )
      `)

    // Tester видит только свои работы
    if (userData.role === 'tester') {
      query = query.eq('tester_id', userData.id)
    }

    const { data: works, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Форматируем данные
    const formattedWorks = works.map(work => {
      const casino = Array.isArray(work.casinos) ? work.casinos[0] : work.casinos
      const card = Array.isArray(work.cards) ? work.cards[0] : work.cards
      const bankAccount = card?.bank_accounts ? (Array.isArray(card.bank_accounts) ? card.bank_accounts[0] : card.bank_accounts) : null
      const bank = bankAccount?.banks ? (Array.isArray(bankAccount.banks) ? bankAccount.banks[0] : bankAccount.banks) : null

      return {
        ...work,
        casino: casino,
        card: {
          ...card,
          account_holder: bankAccount?.holder_name,
          bank_name: bank?.name,
          bank_country: bank?.country,
          account_balance: 0, // Баланс не нужен в таблице работ
          account_currency: 'USD'
        },
        // Добавляем информацию о выводах
        withdrawals: work.test_withdrawals || [],
        // Для совместимости - берем последний вывод
        latest_withdrawal: work.test_withdrawals && work.test_withdrawals.length > 0 
          ? work.test_withdrawals[work.test_withdrawals.length - 1]
          : null
      }
    })

    return NextResponse.json({ works: formattedWorks })

  } catch (error) {
    console.error('Get test works error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Создать новую тестовую работу
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

    if (!userData || userData.role !== 'tester') {
      return NextResponse.json({ error: 'Forbidden - только Tester может создавать тестовые работы' }, { status: 403 })
    }

    const body = await request.json()
    const {
      casino_id,
      card_id,
      login,
      password,
      deposit_amount
    } = body

    console.log('🚀 Test work creation request:', {
      casino_id,
      card_id,
      login,
      password: password ? '***' : 'EMPTY',
      deposit_amount,
      userRole: userData.role
    })

    // Валидация
    if (!casino_id || !card_id || !login || !password || !deposit_amount) {
      console.error('❌ Validation failed:', {
        casino_id: !!casino_id,
        card_id: !!card_id,
        login: !!login,
        password: !!password,
        deposit_amount: !!deposit_amount
      })
      return NextResponse.json({ error: 'Все поля обязательны' }, { status: 400 })
    }

    // Проверяем что казино существует
    const { data: casino, error: casinoError } = await supabase
      .from('casinos')
      .select('id, name, status')
      .eq('id', casino_id)
      .single()

    if (casinoError || !casino) {
      return NextResponse.json({ error: 'Казино не найдено' }, { status: 404 })
    }

    // Проверяем что карта доступна и назначена для этого казино
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select(`
        id, 
        card_number_mask, 
        status, 
        assigned_casino_id,
        card_casino_assignments!left(
          id,
          casino_id,
          status
        )
      `)
      .eq('id', card_id)
      .single()

    if (cardError || !card) {
      console.error('❌ Card not found:', { card_id, cardError })
      return NextResponse.json({ error: 'Карта не найдена' }, { status: 404 })
    }

    console.log('🃏 Found card for test work:', {
      cardId: card.id,
      mask: card.card_number_mask,
      status: card.status,
      assigned_casino_id: card.assigned_casino_id,
      casino_assignments: card.card_casino_assignments
    })

    // Проверяем назначение карты на казино (новая и старая система)
    const isAssignedToCasino = 
      card.assigned_casino_id === casino_id ||
      card.card_casino_assignments?.some((a: any) => 
        a.casino_id === casino_id && a.status === 'active'
      )

    if (card.status !== 'active') {
      console.error('❌ Card not active:', { status: card.status })
      return NextResponse.json({ error: 'Карта неактивна' }, { status: 400 })
    }

    if (!isAssignedToCasino) {
      console.error('❌ Card not assigned to casino:', {
        casino_id,
        assigned_casino_id: card.assigned_casino_id,
        casino_assignments: card.card_casino_assignments
      })
      return NextResponse.json({ error: 'Карта не назначена для этого казино' }, { status: 400 })
    }

    // Создаем тестовую работу
    const { data: newWork, error } = await supabase
      .from('casino_tests')
      .insert({
        casino_id,
        tester_id: userData.id,
        card_id,
        test_type: 'full',
        status: 'pending',
        deposit_amount: parseFloat(deposit_amount),
        test_notes: `Логин: ${login}`, // Сохраняем логин в заметках (пароль не сохраняем в БД)
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      work: newWork,
      message: `Тестовая работа для казино "${casino.name}" создана`
    })

  } catch (error) {
    console.error('Create test work error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
