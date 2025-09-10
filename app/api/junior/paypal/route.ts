import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить PayPal аккаунты Junior'а
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Проверка аутентификации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Получаем данные пользователя
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role, status')
      .eq('auth_id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ 
        error: 'Пользователь не найден',
        details: userError?.message 
      }, { status: 404 })
    }

    if (userData.role !== 'junior') {
      return NextResponse.json({ 
        error: 'Access denied',
        details: 'Только Junior могут управлять своими PayPal аккаунтами'
      }, { status: 403 })
    }

    if (userData.status !== 'active') {
      return NextResponse.json({ 
        error: 'Аккаунт не активен'
      }, { status: 403 })
    }

    // Получаем PayPal аккаунты Junior'а
    const { data: accounts, error: accountsError } = await supabase
      .from('paypal_accounts')
      .select('*')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false })

    if (accountsError) {
      console.error('PayPal accounts query error:', accountsError)
      return NextResponse.json({ 
        error: 'Ошибка получения PayPal аккаунтов',
        details: accountsError.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      accounts: accounts || []
    })

  } catch (error: any) {
    console.error('Junior PayPal API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}

// POST - Создать новый PayPal аккаунт
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Проверка аутентификации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Получаем данные пользователя
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role, status, email')
      .eq('auth_id', user.id)
      .single()

    if (userError || !userData || userData.role !== 'junior' || userData.status !== 'active') {
      return NextResponse.json({ 
        error: 'Access denied',
        details: 'Только активные Junior могут создавать PayPal аккаунты'
      }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      email,
      password,
      phone_number,
      authenticator_url,
      date_created,
      balance,
      sender_paypal_email,
      balance_send,
      send_paypal_balance,
      info
    } = body

    // Валидация
    if (!name || !email || !password) {
      return NextResponse.json({ 
        error: 'Заполните обязательные поля',
        details: 'Имя, email и пароль обязательны'
      }, { status: 400 })
    }

    // Создаем PayPal аккаунт
    const { data: newAccount, error: createError } = await supabase
      .from('paypal_accounts')
      .insert({
        user_id: userData.id,
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        phone_number: phone_number?.trim() || null,
        authenticator_url: authenticator_url?.trim() || null,
        date_created: date_created || new Date().toISOString().split('T')[0],
        balance: balance || 0,
        sender_paypal_email: sender_paypal_email?.trim() || null,
        balance_send: balance_send || 0,
        send_paypal_balance: send_paypal_balance?.trim() || null,
        info: info?.trim() || null,
        status: 'active'
      })
      .select()
      .single()

    if (createError) {
      console.error('PayPal account creation error:', createError)
      return NextResponse.json({ 
        error: 'Ошибка создания PayPal аккаунта',
        details: createError.message 
      }, { status: 500 })
    }

    console.log('✅ PayPal account created:', {
      juniorEmail: userData.email,
      accountName: name,
      accountEmail: email
    })

    return NextResponse.json({
      success: true,
      account: newAccount,
      message: `PayPal аккаунт ${name} успешно создан`
    })

  } catch (error: any) {
    console.error('Create PayPal account error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}
