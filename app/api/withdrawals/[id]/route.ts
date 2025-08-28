import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Отключаем статическую генерацию для этого API route
export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { status } = await request.json()
    const withdrawalId = params.id

    // Проверка авторизации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Получаем текущий вывод и проверяем права доступа
    const { data: withdrawal, error: fetchError } = await supabase
      .from('work_withdrawals')
      .select(`
        *,
        works!inner(junior_id)
      `)
      .eq('id', withdrawalId)
      .single()

    if (fetchError || !withdrawal) {
      return NextResponse.json({ error: 'Вывод не найден' }, { status: 404 })
    }

    // Проверяем, что вывод принадлежит текущему пользователю
    if (withdrawal.works.junior_id !== user.id) {
      return NextResponse.json({ error: 'Нет доступа к этому выводу' }, { status: 403 })
    }

    // Junior может изменять статус только между new и waiting
    const allowedStatuses = ['new', 'waiting']
    if (!allowedStatuses.includes(withdrawal.status) || !allowedStatuses.includes(status)) {
      return NextResponse.json({ 
        error: 'Нельзя изменить статус этого вывода' 
      }, { status: 400 })
    }

    // Обновляем статус
    const { data: updatedWithdrawal, error } = await supabase
      .from('work_withdrawals')
      .update({ status })
      .eq('id', withdrawalId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      withdrawal: updatedWithdrawal,
      message: `Статус изменен на ${status === 'new' ? 'Новый' : 'Ожидает'}`
    })

  } catch (error) {
    console.error('Error updating withdrawal status:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const withdrawalId = params.id

    // Проверка авторизации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Получаем детальную информацию о выводе
    const { data: withdrawal, error } = await supabase
      .from('work_withdrawals')
      .select(`
        *,
        works!inner(
          *,
          junior_id,
          casinos(name, url),
          cards(card_number_mask, bank_accounts(holder_name, banks(name)))
        )
      `)
      .eq('id', withdrawalId)
      .single()

    if (error || !withdrawal) {
      return NextResponse.json({ error: 'Вывод не найден' }, { status: 404 })
    }

    // Проверяем права доступа
    if (withdrawal.works.junior_id !== user.id) {
      return NextResponse.json({ error: 'Нет доступа к этому выводу' }, { status: 403 })
    }

    return NextResponse.json({ withdrawal })

  } catch (error) {
    console.error('Error fetching withdrawal:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
