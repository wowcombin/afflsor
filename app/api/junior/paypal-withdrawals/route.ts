import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить PayPal выводы Junior'а
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
        details: 'Только активные Junior могут просматривать PayPal выводы'
      }, { status: 403 })
    }

    // Получаем PayPal выводы Junior'а
    const { data: withdrawals, error } = await supabase
      .from('paypal_withdrawals')
      .select(`
        id,
        withdrawal_amount,
        currency,
        status,
        manager_status,
        teamlead_status,
        manager_comment,
        teamlead_comment,
        hr_comment,
        cfo_comment,
        created_at,
        updated_at,
        checked_at,
        notes,
        paypal_account:paypal_account_id (
          id,
          name,
          email
        ),
        casino:casino_id (
          id,
          name,
          url
        ),
        paypal_work:paypal_work_id (
          id,
          deposit_amount
        )
      `)
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('PayPal withdrawals fetch error:', error)
      return NextResponse.json({ 
        error: 'Ошибка получения PayPal выводов',
        details: error.message
      }, { status: 500 })
    }

    console.log(`Junior ${userData.email} has ${withdrawals?.length || 0} PayPal withdrawals`)

    return NextResponse.json({
      success: true,
      withdrawals: withdrawals || []
    })

  } catch (error: any) {
    console.error('PayPal withdrawals API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}

// POST - Создать новый PayPal вывод
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
        details: 'Только активные Junior могут создавать PayPal выводы'
      }, { status: 403 })
    }

    const body = await request.json()
    const { 
      paypal_work_id,
      withdrawal_amount,
      currency = 'USD',
      notes 
    } = body

    // Валидация обязательных полей
    if (!paypal_work_id || !withdrawal_amount) {
      return NextResponse.json({ 
        error: 'Заполните обязательные поля',
        details: 'PayPal работа и сумма вывода обязательны'
      }, { status: 400 })
    }

    // Проверка суммы вывода
    if (withdrawal_amount <= 0) {
      return NextResponse.json({ 
        error: 'Некорректная сумма',
        details: 'Сумма вывода должна быть больше 0'
      }, { status: 400 })
    }

    // Проверяем, что PayPal работа принадлежит этому Junior'у
    const { data: paypalWork, error: workError } = await supabase
      .from('paypal_works')
      .select('id, paypal_account_id, casino_id, deposit_amount, status')
      .eq('id', paypal_work_id)
      .eq('user_id', userData.id)
      .single()

    if (workError || !paypalWork) {
      return NextResponse.json({ 
        error: 'PayPal работа не найдена',
        details: 'Указанная PayPal работа не найдена или не принадлежит вам'
      }, { status: 404 })
    }

    if (paypalWork.status !== 'active') {
      return NextResponse.json({ 
        error: 'PayPal работа неактивна',
        details: 'Нельзя создавать выводы для неактивной работы'
      }, { status: 400 })
    }

    // Проверяем, что сумма вывода не превышает депозит (базовая проверка)
    if (withdrawal_amount > paypalWork.deposit_amount * 10) { // Максимум 10x от депозита
      return NextResponse.json({ 
        error: 'Слишком большая сумма',
        details: 'Сумма вывода не может превышать депозит более чем в 10 раз'
      }, { status: 400 })
    }

    // Создаем PayPal вывод
    const { data: withdrawal, error: createError } = await supabase
      .from('paypal_withdrawals')
      .insert({
        user_id: userData.id,
        paypal_work_id,
        paypal_account_id: paypalWork.paypal_account_id,
        casino_id: paypalWork.casino_id,
        withdrawal_amount: parseFloat(withdrawal_amount),
        currency,
        notes: notes?.trim() || null
      })
      .select()
      .single()

    if (createError) {
      console.error('PayPal withdrawal creation error:', createError)
      return NextResponse.json({ 
        error: 'Ошибка создания PayPal вывода',
        details: createError.message
      }, { status: 500 })
    }

    console.log('✅ PayPal withdrawal created:', {
      juniorEmail: userData.email,
      withdrawalAmount: withdrawal_amount,
      currency,
      workId: paypal_work_id
    })

    return NextResponse.json({
      success: true,
      withdrawal,
      message: `PayPal вывод на сумму ${withdrawal_amount} ${currency} создан`
    })

  } catch (error: any) {
    console.error('PayPal withdrawal creation error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}
