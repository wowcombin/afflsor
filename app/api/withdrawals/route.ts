import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить выводы (с фильтрацией по роли)
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
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

    // Используем представление withdrawal_queue
    let query = supabase
      .from('withdrawal_queue')
      .select('*')

    // Фильтрация по роли
    if (userData.role === 'junior') {
      // Junior видит только свои выводы
      query = query.eq('junior_id', userData.id)
    } else if (userData.role === 'manager') {
      // Manager видит очередь для проверки
      if (!status) {
        query = query.in('status', ['new', 'waiting'])
      }
    } else if (['hr', 'admin'].includes(userData.role)) {
      // HR и Admin видят все выводы
      // Никаких дополнительных фильтров
    } else {
      // Другие роли не имеют доступа к выводам
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Дополнительные фильтры
    if (status) {
      query = query.eq('status', status)
    }

    if (junior_id && ['manager', 'hr', 'cfo', 'admin'].includes(userData.role)) {
      query = query.eq('junior_id', junior_id)
    }

    const { data: withdrawals, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ withdrawals: withdrawals || [] })

  } catch (error) {
    console.error('Get withdrawals error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Создать новый вывод
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
      return NextResponse.json({ error: 'Forbidden - только Junior могут создавать выводы' }, { status: 403 })
    }

    const body = await request.json()
    const { work_id, withdrawal_amount } = body

    // Валидация
    if (!work_id || !withdrawal_amount) {
      return NextResponse.json({ error: 'Укажите работу и сумму вывода' }, { status: 400 })
    }

    if (withdrawal_amount <= 0) {
      return NextResponse.json({ error: 'Сумма вывода должна быть больше 0' }, { status: 400 })
    }

    // Проверяем работу
    const { data: work, error: workError } = await supabase
      .from('works')
      .select('id, junior_id, deposit_amount, status')
      .eq('id', work_id)
      .single()

    if (workError || !work) {
      return NextResponse.json({ error: 'Работа не найдена' }, { status: 404 })
    }

    if (work.junior_id !== userData.id) {
      return NextResponse.json({ error: 'Это не ваша работа' }, { status: 403 })
    }

    if (work.status !== 'active') {
      return NextResponse.json({ error: 'Работа недоступна для создания выводов' }, { status: 400 })
    }

    // Проверяем что нет активных выводов для этой работы
    const { data: activeWithdrawal } = await supabase
      .from('work_withdrawals')
      .select('id')
      .eq('work_id', work_id)
      .in('status', ['new', 'waiting'])
      .single()

    if (activeWithdrawal) {
      return NextResponse.json({ error: 'У этой работы уже есть активный вывод' }, { status: 400 })
    }

    // Создаем вывод
    const { data: newWithdrawal, error } = await supabase
      .from('work_withdrawals')
      .insert({
        work_id,
        withdrawal_amount,
        status: 'new'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Логируем создание
    await supabase
      .from('work_status_history')
      .insert({
        work_id,
        withdrawal_id: newWithdrawal.id,
        old_status: null,
        new_status: 'new',
        changed_by: userData.id,
        change_reason: 'Создание вывода'
      })

    return NextResponse.json({
      success: true,
      withdrawal: newWithdrawal,
      message: `Вывод $${withdrawal_amount} создан`
    })

  } catch (error) {
    console.error('Create withdrawal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
