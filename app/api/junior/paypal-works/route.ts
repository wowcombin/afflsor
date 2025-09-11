import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить PayPal работы Junior'а
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Проверка аутентификации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверка роли Junior
    const { data: userData } = await supabase
      .from('users')
      .select('id, role, status, email')
      .eq('auth_id', user.id)
      .single()

    if (!userData || userData.role !== 'junior' || userData.status !== 'active') {
      return NextResponse.json({ 
        error: 'Access denied',
        details: 'Только активные Junior могут просматривать PayPal работы'
      }, { status: 403 })
    }

    // Получаем PayPal работы Junior'а
    const { data: works, error } = await supabase
      .from('paypal_works')
      .select(`
        id,
        casino_email,
        deposit_amount,
        currency,
        status,
        created_at,
        updated_at,
        notes,
        paypal_account:paypal_account_id (
          id,
          name,
          email,
          balance
        ),
        casino:casino_id (
          id,
          name,
          url
        )
      `)
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('PayPal works fetch error:', error)
      return NextResponse.json({ 
        error: 'Ошибка получения PayPal работ',
        details: error.message
      }, { status: 500 })
    }

    console.log(`Junior ${userData.email} has ${works?.length || 0} PayPal works`)

    return NextResponse.json({
      success: true,
      works: works || []
    })

  } catch (error: any) {
    console.error('PayPal works API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}

// POST - Создать новую PayPal работу
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Проверка аутентификации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверка роли Junior
    const { data: userData } = await supabase
      .from('users')
      .select('id, role, status, email')
      .eq('auth_id', user.id)
      .single()

    if (!userData || userData.role !== 'junior' || userData.status !== 'active') {
      return NextResponse.json({ 
        error: 'Access denied',
        details: 'Только активные Junior могут создавать PayPal работы'
      }, { status: 403 })
    }

    const body = await request.json()
    const { 
      paypal_account_id, 
      casino_id, 
      casino_email, 
      casino_password, 
      deposit_amount,
      currency = 'USD',
      notes 
    } = body

    // Валидация обязательных полей
    if (!paypal_account_id || !casino_id || !casino_email || !casino_password || !deposit_amount) {
      return NextResponse.json({ 
        error: 'Заполните обязательные поля',
        details: 'PayPal аккаунт, казино, данные для входа и сумма депозита обязательны'
      }, { status: 400 })
    }

    // Проверка суммы депозита
    if (deposit_amount <= 0) {
      return NextResponse.json({ 
        error: 'Некорректная сумма',
        details: 'Сумма депозита должна быть больше 0'
      }, { status: 400 })
    }

    // Проверяем, что PayPal аккаунт принадлежит этому Junior'у
    const { data: paypalAccount, error: paypalError } = await supabase
      .from('paypal_accounts')
      .select('id, name, email, status')
      .eq('id', paypal_account_id)
      .eq('user_id', userData.id)
      .single()

    if (paypalError || !paypalAccount) {
      return NextResponse.json({ 
        error: 'PayPal аккаунт не найден',
        details: 'Указанный PayPal аккаунт не найден или не принадлежит вам'
      }, { status: 404 })
    }

    if (paypalAccount.status !== 'active') {
      return NextResponse.json({ 
        error: 'PayPal аккаунт неактивен',
        details: 'Нельзя создавать работы с неактивным PayPal аккаунтом'
      }, { status: 400 })
    }

    // Проверяем, что казино существует
    const { data: casino, error: casinoError } = await supabase
      .from('casinos')
      .select('id, name, url, status')
      .eq('id', casino_id)
      .single()

    if (casinoError || !casino) {
      return NextResponse.json({ 
        error: 'Казино не найдено',
        details: 'Указанное казино не существует'
      }, { status: 404 })
    }

    // Проверяем, назначен ли Junior к этому казино (если есть система назначений)
    const { data: casinoAssignment } = await supabase
      .from('junior_casino_assignments')
      .select('id')
      .eq('casino_id', casino_id)
      .eq('junior_id', userData.id)
      .eq('is_active', true)
      .single()

    if (!casinoAssignment) {
      return NextResponse.json({ 
        error: 'Казино не назначено',
        details: 'Вы не назначены для работы с этим казино'
      }, { status: 403 })
    }

    // Создаем PayPal работу
    const { data: work, error: createError } = await supabase
      .from('paypal_works')
      .insert({
        user_id: userData.id,
        paypal_account_id,
        casino_id,
        casino_email: casino_email.trim(),
        casino_password: casino_password.trim(),
        deposit_amount: parseFloat(deposit_amount),
        currency,
        notes: notes?.trim() || null
      })
      .select()
      .single()

    if (createError) {
      console.error('PayPal work creation error:', createError)
      return NextResponse.json({ 
        error: 'Ошибка создания PayPal работы',
        details: createError.message
      }, { status: 500 })
    }

    console.log('✅ PayPal work created:', {
      juniorEmail: userData.email,
      paypalAccount: paypalAccount.name,
      casino: casino.name,
      depositAmount: deposit_amount,
      currency
    })

    return NextResponse.json({
      success: true,
      work,
      message: `PayPal работа создана для казино ${casino.name}`
    })

  } catch (error: any) {
    console.error('PayPal work creation error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}
