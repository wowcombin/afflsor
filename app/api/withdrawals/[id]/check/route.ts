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
    const { status, alarm_message } = await request.json()
    
    // Проверка роли
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, role')
      .eq('auth_id', user.id)
      .single()
    
    if (userData?.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Валидация статуса
    const allowedStatuses = ['received', 'problem', 'block']
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ 
        error: 'Недопустимый статус. Разрешены: received, problem, block' 
      }, { status: 400 })
    }

    // Получаем текущий вывод для проверки
    const { data: withdrawal, error: fetchError } = await supabase
      .from('work_withdrawals')
      .select('id, status, work_id, withdrawal_amount')
      .eq('id', params.id)
      .single()

    if (fetchError || !withdrawal) {
      return NextResponse.json({ error: 'Вывод не найден' }, { status: 404 })
    }

    // Проверяем, что вывод можно проверить
    if (!['new', 'waiting'].includes(withdrawal.status)) {
      return NextResponse.json({ 
        error: 'Вывод уже проверен или имеет недопустимый статус' 
      }, { status: 400 })
    }

    // Обновляем статус вывода
    const updateData: any = {
      status,
      checked_by: userData.id,
      checked_at: new Date().toISOString()
    }

    // Добавляем сообщение если есть
    if (alarm_message && alarm_message.trim()) {
      updateData.alarm_message = alarm_message.trim()
    }

    const { error: updateError } = await supabase
      .from('work_withdrawals')
      .update(updateData)
      .eq('id', params.id)

    if (updateError) {
      return NextResponse.json({ 
        error: 'Ошибка обновления статуса: ' + updateError.message 
      }, { status: 500 })
    }

    // Возвращаем успешный ответ с информацией
    const statusLabels = {
      received: 'Одобрен',
      problem: 'Проблема',
      block: 'Заблокирован'
    }

    return NextResponse.json({ 
      success: true,
      message: `Вывод ${statusLabels[status as keyof typeof statusLabels]}`,
      withdrawal: {
        id: withdrawal.id,
        status,
        checked_by: userData.id,
        checked_at: updateData.checked_at,
        alarm_message: updateData.alarm_message
      }
    })

  } catch (error) {
    console.error('Error checking withdrawal:', error)
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера' 
    }, { status: 500 })
  }
}
