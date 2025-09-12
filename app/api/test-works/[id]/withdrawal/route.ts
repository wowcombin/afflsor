import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// PATCH - Обновить статус вывода
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { id: workId } = params
    
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

    if (!userData || userData.role !== 'tester') {
      return NextResponse.json({ error: 'Forbidden - только Tester может обновлять статусы выводов' }, { status: 403 })
    }

    const body = await request.json()
    const { withdrawal_status } = body

    console.log('🔄 Updating withdrawal status:', {
      workId,
      newStatus: withdrawal_status,
      userRole: userData.role
    })

    // Валидация статуса
    const validStatuses = ['new', 'waiting', 'received', 'blocked']
    if (!validStatuses.includes(withdrawal_status)) {
      return NextResponse.json({ error: 'Неверный статус вывода' }, { status: 400 })
    }

    // Проверяем что работа существует и принадлежит тестеру
    const { data: work, error: workError } = await supabase
      .from('casino_tests')
      .select('id, withdrawal_amount, withdrawal_status, tester_id')
      .eq('id', workId)
      .eq('tester_id', userData.id)
      .single()

    if (workError || !work) {
      console.error('❌ Work not found:', { workId, workError })
      return NextResponse.json({ error: 'Тестовая работа не найдена' }, { status: 404 })
    }

    if (!work.withdrawal_amount) {
      return NextResponse.json({ error: 'Для этой работы не создан вывод' }, { status: 400 })
    }

    // Обновляем статус вывода
    const { data: updatedWork, error: updateError } = await supabase
      .from('casino_tests')
      .update({
        withdrawal_status: withdrawal_status,
        updated_at: new Date().toISOString()
      })
      .eq('id', workId)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    console.log('✅ Withdrawal status updated:', {
      workId,
      oldStatus: work.withdrawal_status,
      newStatus: withdrawal_status
    })

    const statusMessages = {
      'new': 'Новый',
      'waiting': 'В ожидании',
      'received': 'Получен',
      'blocked': 'Заблокирован'
    }

    return NextResponse.json({
      success: true,
      work: updatedWork,
      message: `Статус вывода изменен на "${statusMessages[withdrawal_status as keyof typeof statusMessages]}"`
    })

  } catch (error) {
    console.error('Update withdrawal status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
