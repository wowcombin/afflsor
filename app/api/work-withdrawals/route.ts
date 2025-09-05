import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET - Получить все выводы
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: withdrawals, error } = await supabase
      .from('work_withdrawals')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: withdrawals,
      count: withdrawals?.length || 0
    })

  } catch (error) {
    console.error('Get withdrawals error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Создать новый вывод для работы
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
      return NextResponse.json({ error: 'Заполните все обязательные поля' }, { status: 400 })
    }

    if (withdrawal_amount <= 0) {
      return NextResponse.json({ error: 'Сумма вывода должна быть больше 0' }, { status: 400 })
    }

    // Проверяем что работа существует и принадлежит пользователю
    const { data: work, error: workError } = await supabase
      .from('works')
      .select('id, status, junior_id, deposit_amount')
      .eq('id', work_id)
      .eq('junior_id', userData.id)
      .single()

    if (workError || !work) {
      return NextResponse.json({ error: 'Работа не найдена или не принадлежит вам' }, { status: 404 })
    }

    if (work.status !== 'active') {
      return NextResponse.json({ error: 'Можно создавать выводы только для активных работ' }, { status: 400 })
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

    return NextResponse.json({
      success: true,
      withdrawal: newWithdrawal,
      message: `Вывод на сумму ${withdrawal_amount} создан и добавлен в очередь`
    })

  } catch (error) {
    console.error('Create withdrawal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
