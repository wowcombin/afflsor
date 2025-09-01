import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST - Создать вывод для тестовой работы
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

    if (!userData || userData.role !== 'tester') {
      return NextResponse.json({ error: 'Forbidden - только Tester может создавать выводы' }, { status: 403 })
    }

    const body = await request.json()
    const { work_id, withdrawal_amount, notes } = body

    console.log('💰 Creating withdrawal:', {
      work_id,
      withdrawal_amount,
      notes: notes ? 'PROVIDED' : 'EMPTY',
      userRole: userData.role
    })

    // Валидация
    if (!work_id || !withdrawal_amount || withdrawal_amount <= 0) {
      return NextResponse.json({ error: 'Укажите работу и сумму вывода' }, { status: 400 })
    }

    // Проверяем что работа существует и принадлежит тестеру
    const { data: work, error: workError } = await supabase
      .from('casino_tests')
      .select('id, casino_id, status, deposit_amount, withdrawal_amount, tester_id')
      .eq('id', work_id)
      .eq('tester_id', userData.id)
      .single()

    if (workError || !work) {
      console.error('❌ Work not found:', { work_id, workError })
      return NextResponse.json({ error: 'Тестовая работа не найдена' }, { status: 404 })
    }

    console.log('🔍 Found work for withdrawal:', {
      workId: work.id,
      status: work.status,
      withdrawal_amount: work.withdrawal_amount,
      tester_id: work.tester_id,
      current_user: userData.id
    })

    // Создаем новый вывод в отдельной таблице (множественные выводы)
    console.log('✅ Creating new withdrawal in test_withdrawals table')

    const { data: newWithdrawal, error: withdrawalError } = await supabase
      .from('test_withdrawals')
      .insert({
        work_id: work_id,
        withdrawal_amount: parseFloat(withdrawal_amount),
        withdrawal_status: 'new',
        withdrawal_notes: notes || null,
        requested_at: new Date().toISOString()
      })
      .select()
      .single()

    if (withdrawalError) {
      console.error('❌ Withdrawal creation error:', withdrawalError)
      return NextResponse.json({ error: withdrawalError.message }, { status: 500 })
    }

    console.log('✅ Withdrawal created successfully:', {
      workId: work_id,
      amount: withdrawal_amount,
      status: 'new'
    })

    return NextResponse.json({
      success: true,
      withdrawal: newWithdrawal,
      message: `Вывод $${withdrawal_amount} создан со статусом "Новый"`
    })

  } catch (error) {
    console.error('Create withdrawal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
