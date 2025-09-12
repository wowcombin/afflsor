import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Проверка аутентификации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('PayPal Works API called:', { user: user.email })

    const { data: userData } = await supabase
      .from('users')
      .select('id, role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData || userData.status !== 'active') {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 403 })
    }

    // Получаем параметры запроса
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('paypal_works')
      .select(`
        *,
        paypal_accounts (
          id,
          name,
          email,
          balance
        ),
        casinos (
          id,
          name,
          url,
          currency
        ),
        users (
          id,
          email,
          first_name,
          last_name
        )
      `)

    // Фильтрация по роли
    if (userData.role === 'junior') {
      query = query.eq('user_id', userData.id)
    } else if (['manager', 'teamlead', 'hr', 'admin'].includes(userData.role)) {
      // Менеджеры и выше видят все PayPal работы
    } else {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Фильтрация по статусу
    if (status) {
      query = query.eq('status', status)
    }

    // Сортировка по дате создания (новые сначала)
    query = query.order('created_at', { ascending: false })

    const { data: paypalWorks, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ 
        error: 'Database error', 
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      paypal_works: paypalWorks || [],
      count: paypalWorks?.length || 0
    })

  } catch (error) {
    console.error('PayPal Works API Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: 'Forbidden - только Junior могут создавать PayPal работы' }, { status: 403 })
    }

    const body = await request.json()
    const {
      casino_id,
      paypal_account_id,
      deposit_amount,
      casino_login,
      casino_password,
      notes
    } = body

    // Валидация
    if (!casino_id || !paypal_account_id || !deposit_amount) {
      return NextResponse.json({ error: 'Заполните все обязательные поля' }, { status: 400 })
    }

    if (deposit_amount <= 0) {
      return NextResponse.json({ error: 'Сумма депозита должна быть больше 0' }, { status: 400 })
    }

    // Проверяем казино
    const { data: casino, error: casinoError } = await supabase
      .from('casinos')
      .select('id, name, status, currency, payment_methods')
      .eq('id', casino_id)
      .single()

    if (casinoError || !casino || casino.status !== 'approved') {
      return NextResponse.json({ error: 'Казино недоступно для работы' }, { status: 400 })
    }

    // Проверяем поддержку PayPal в казино
    if (!casino.payment_methods || !casino.payment_methods.includes('paypal')) {
      return NextResponse.json({ error: 'Казино не поддерживает PayPal платежи' }, { status: 400 })
    }

    // Проверяем PayPal аккаунт
    const { data: paypalAccount, error: paypalError } = await supabase
      .from('paypal_accounts')
      .select('id, name, email, balance, status')
      .eq('id', paypal_account_id)
      .eq('user_id', userData.id)
      .single()

    if (paypalError || !paypalAccount || paypalAccount.status !== 'active') {
      return NextResponse.json({ error: 'PayPal аккаунт недоступен' }, { status: 400 })
    }

    // Проверяем баланс PayPal (предупреждение, но не блокируем)
    if (paypalAccount.balance < deposit_amount) {
      console.warn(`PayPal balance insufficient: ${paypalAccount.balance} < ${deposit_amount}`)
    }

    // Создаем PayPal работу
    const { data: newPayPalWork, error: createError } = await supabase
      .from('paypal_works')
      .insert({
        user_id: userData.id,
        paypal_account_id,
        casino_id,
        casino_email: casino_login || '',
        casino_password: casino_password || '',
        deposit_amount,
        currency: casino.currency || 'USD',
        notes: notes || '',
        status: 'active'
      })
      .select(`
        *,
        paypal_accounts (
          id,
          name,
          email,
          balance
        ),
        casinos (
          id,
          name,
          url,
          currency
        )
      `)
      .single()

    if (createError) {
      console.error('Error creating PayPal work:', createError)
      return NextResponse.json({ 
        error: 'Ошибка создания PayPal работы', 
        details: createError.message 
      }, { status: 500 })
    }

    // Логируем создание работы
    console.log('PayPal work created:', {
      id: newPayPalWork.id,
      user: user.email,
      casino: casino.name,
      paypal: paypalAccount.name,
      amount: deposit_amount,
      currency: casino.currency
    })

    return NextResponse.json({
      message: `PayPal работа создана для казино ${casino.name}`,
      paypal_work: newPayPalWork
    })

  } catch (error) {
    console.error('PayPal Works POST API Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
