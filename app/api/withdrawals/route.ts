import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Отключаем статическую генерацию для этого API route
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { work_id, withdrawal_amount } = await request.json()

    // Проверка авторизации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверяем, что работа принадлежит текущему пользователю
    const { data: work, error: workError } = await supabase
      .from('works')
      .select('id, junior_id, deposit_amount, status')
      .eq('id', work_id)
      .eq('junior_id', user.id)
      .single()

    if (workError || !work) {
      return NextResponse.json({ error: 'Работа не найдена' }, { status: 404 })
    }

    if (work.status !== 'active') {
      return NextResponse.json({ error: 'Работа не активна' }, { status: 400 })
    }

    // Валидация суммы вывода
    if (!withdrawal_amount || withdrawal_amount <= 0) {
      return NextResponse.json({ error: 'Сумма вывода должна быть больше 0' }, { status: 400 })
    }

    // Создаем вывод
    const { data: withdrawal, error } = await supabase
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
      withdrawal,
      message: 'Вывод успешно создан'
    })

  } catch (error) {
    console.error('Error creating withdrawal:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const workId = searchParams.get('work_id')

    // Проверка авторизации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('work_withdrawals')
      .select(`
        *,
        works!inner(
          id,
          deposit_amount,
          casino_username,
          junior_id,
          casinos(name),
          cards(card_number_mask)
        )
      `)
      .eq('works.junior_id', user.id)

    // Если указан work_id, фильтруем по нему
    if (workId) {
      query = query.eq('work_id', workId)
    }

    const { data: withdrawals, error } = await query
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ withdrawals })

  } catch (error) {
    console.error('Error fetching withdrawals:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
