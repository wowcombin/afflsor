import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить карты (с фильтрацией по роли)
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const assigned_to = searchParams.get('assigned_to') // Для фильтрации карт Junior
    
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

    // Получаем карты с полной информацией о банках и назначениях
    let query = supabase
      .from('cards')
      .select(`
        *,
        bank_accounts!inner(
          id,
          holder_name,
          balance,
          currency,
          banks!inner(
            id,
            name,
            country
          )
        ),
        card_casino_assignments!left(
          id,
          casino_id,
          assignment_type,
          status,
          deposit_amount,
          casinos!inner(id, name, company, currency)
        )
      `)

    // Фильтрация по роли
    if (userData.role === 'junior') {
      // Junior видит только свои назначенные карты
      query = query.eq('assigned_to', userData.id)
    } else if (assigned_to && ['manager', 'tester', 'hr', 'cfo', 'admin'].includes(userData.role)) {
      // Manager+ может фильтровать по пользователю
      query = query.eq('assigned_to', assigned_to)
    }

    const { data: cards, error } = await query.order('created_at', { ascending: false })

    console.log('🃏 Cards API query result:', {
      userRole: userData.role,
      cardsCount: cards?.length || 0,
      error: error?.message,
      firstCard: cards?.[0] ? {
        id: cards[0].id,
        mask: cards[0].card_number_mask,
        bankAccount: cards[0].bank_accounts
      } : null
    })

    if (error) {
      console.error('❌ Cards query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Форматируем данные для правильного отображения
    const formattedCards = (cards || []).map(card => {
      const bankAccount = Array.isArray(card.bank_accounts) ? card.bank_accounts[0] : card.bank_accounts
      const bank = bankAccount?.banks ? (Array.isArray(bankAccount.banks) ? bankAccount.banks[0] : bankAccount.banks) : null
      
      // Обрабатываем назначения на казино
      const assignments = card.card_casino_assignments || []
      const activeAssignments = assignments.filter((a: any) => a.status === 'active')

      return {
        ...card,
        account_balance: bankAccount?.balance || 0,
        account_currency: bankAccount?.currency || 'USD',
        bank_account: {
          id: bankAccount?.id,
          holder_name: bankAccount?.holder_name,
          currency: bankAccount?.currency,
          bank: bank ? {
            name: bank.name,
            country: bank.country
          } : null
        },
        casino_assignments: activeAssignments.map((a: any) => {
          const casino = Array.isArray(a.casinos) ? a.casinos[0] : a.casinos
          return {
            assignment_id: a.id,
            casino_id: a.casino_id,
            casino_name: casino?.name,
            casino_company: casino?.company,
            casino_currency: casino?.currency,
            assignment_type: a.assignment_type,
            status: a.status,
            deposit_amount: a.deposit_amount,
            has_deposit: !!a.deposit_amount
          }
        })
      }
    })

    return NextResponse.json({ cards: formattedCards })

  } catch (error) {
    console.error('Get cards error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Создать новую карту (только CFO/Admin)
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

    if (!userData || !['manager', 'cfo', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden - только Manager, CFO и Admin могут создавать карты' }, { status: 403 })
    }

    const body = await request.json()
    const {
      bank_account_id,
      card_number, // Полный номер для маскирования
      cvv,
      exp_month,
      exp_year,
      card_type,
      daily_limit
    } = body

    // Валидация
    if (!bank_account_id || !card_number || !cvv || !exp_month || !exp_year) {
      return NextResponse.json({ error: 'Заполните все обязательные поля' }, { status: 400 })
    }

    // Валидация номера карты (должен быть 16 цифр)
    if (!/^\d{16}$/.test(card_number)) {
      return NextResponse.json({ error: 'Номер карты должен содержать 16 цифр' }, { status: 400 })
    }

    // Валидация CVV (должен быть 3-4 цифры)
    if (!/^\d{3,4}$/.test(cvv)) {
      return NextResponse.json({ error: 'CVV должен содержать 3-4 цифры' }, { status: 400 })
    }

    // Валидация даты истечения
    if (exp_month < 1 || exp_month > 12) {
      return NextResponse.json({ error: 'Некорректный месяц истечения' }, { status: 400 })
    }

    if (exp_year < new Date().getFullYear()) {
      return NextResponse.json({ error: 'Карта уже истекла' }, { status: 400 })
    }

    // Проверяем что банковский аккаунт существует
    const { data: bankAccount, error: bankError } = await supabase
      .from('bank_accounts')
      .select('id, holder_name, balance')
      .eq('id', bank_account_id)
      .single()

    if (bankError || !bankAccount) {
      return NextResponse.json({ error: 'Банковский аккаунт не найден' }, { status: 404 })
    }

    // Создаем маску номера карты
    const cardMask = card_number.substring(0, 4) + '****' + card_number.substring(card_number.length - 4)
    const cardBin = card_number.substring(0, 8)

    // Проверяем уникальность маски карты
    const { data: existingCard } = await supabase
      .from('cards')
      .select('id')
      .eq('card_number_mask', cardMask)
      .single()

    if (existingCard) {
      return NextResponse.json({ error: 'Карта с таким номером уже существует' }, { status: 400 })
    }

    // Определяем статус карты на основе баланса аккаунта
    const initialStatus = bankAccount.balance >= 10 ? 'active' : 'low_balance'

    // Создаем карту
    const { data: newCard, error: cardError } = await supabase
      .from('cards')
      .insert({
        bank_account_id,
        card_number_mask: cardMask,
        card_bin: cardBin,
        card_type: card_type || 'grey',
        exp_month,
        exp_year,
        status: initialStatus,
        daily_limit: daily_limit || null
      })
      .select()
      .single()

    if (cardError) {
      return NextResponse.json({ error: cardError.message }, { status: 500 })
    }

    // Сохраняем зашифрованные секреты (в реальности здесь будет настоящее шифрование)
    const { error: secretError } = await supabase
      .from('card_secrets')
      .insert({
        card_id: newCard.id,
        pan_encrypted: `ENCRYPTED_${card_number}`, // Заглушка шифрования
        cvv_encrypted: `ENCRYPTED_${cvv}`, // Заглушка шифрования
        encryption_key_id: 'test_key_v1'
      })

    if (secretError) {
      console.error('Ошибка сохранения секретов:', secretError)
      // Не возвращаем ошибку, так как карта уже создана
    }

    // Логируем создание карты в новую систему истории
    await supabase.rpc('log_action', {
      p_action_type: 'card_created',
      p_entity_type: 'card',
      p_entity_id: newCard.id,
      p_entity_name: cardMask,
      p_new_values: { 
        card_type: card_type, 
        card_mask: cardMask, 
        bank_account_id: bank_account_id,
        daily_limit: card_type === 'pink' ? daily_limit : null
      },
      p_change_description: `Создана новая карта: ${cardMask} (${card_type === 'pink' ? 'Розовая' : 'Серая'}) для аккаунта ${bankAccount.holder_name}`,
      p_performed_by: userData.id,
      p_ip_address: request.headers.get('x-forwarded-for') || '127.0.0.1',
      p_user_agent: request.headers.get('user-agent') || ''
    })

    return NextResponse.json({
      success: true,
      card: newCard,
      message: `Карта ${cardMask} успешно создана для аккаунта ${bankAccount.holder_name}`
    })

  } catch (error) {
    console.error('Create card error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
