import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить конкретный тест
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { id } = params
    
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

    // Получаем тест с информацией о казино и тестере
    let query = supabase
      .from('casino_tests')
      .select(`
        *,
        casinos!inner(id, name, url, status),
        users!inner(id, first_name, last_name, email),
        cards(id, card_number_mask, card_bin)
      `)
      .eq('id', id)

    // Tester может видеть только свои тесты
    if (userData.role === 'tester') {
      query = query.eq('tester_id', userData.id)
    }

    const { data: test, error } = await query.single()

    if (error || !test) {
      return NextResponse.json({ error: 'Тест не найден' }, { status: 404 })
    }

    // Форматируем данные
    const casino = Array.isArray(test.casinos) ? test.casinos[0] : test.casinos
    const tester = Array.isArray(test.users) ? test.users[0] : test.users
    const card = Array.isArray(test.cards) ? test.cards[0] : test.cards

    const formattedTest = {
      ...test,
      casino: casino,
      tester: tester,
      card: card
    }

    return NextResponse.json({ test: formattedTest })

  } catch (error) {
    console.error('Get casino test error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Обновить тест (для продолжения тестирования)
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { id } = params
    
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
      return NextResponse.json({ error: 'Forbidden - только Tester может обновлять тесты' }, { status: 403 })
    }

    const body = await request.json()
    const {
      status,
      registration_time,
      deposit_amount,
      deposit_success,
      withdrawal_amount,
      withdrawal_success,
      withdrawal_time,
      issues_found,
      recommended_bins,
      test_result,
      rating,
      test_notes,
      final_report
    } = body

    // Проверяем что тест существует и принадлежит текущему тестеру
    const { data: existingTest, error: testError } = await supabase
      .from('casino_tests')
      .select('id, casino_id, status')
      .eq('id', id)
      .eq('tester_id', userData.id)
      .single()

    if (testError || !existingTest) {
      return NextResponse.json({ error: 'Тест не найден' }, { status: 404 })
    }

    // Подготавливаем данные для обновления
    const updateData: any = {}
    
    if (status !== undefined) updateData.status = status
    if (registration_time !== undefined) updateData.registration_time = registration_time
    if (deposit_amount !== undefined) updateData.deposit_amount = deposit_amount
    if (deposit_success !== undefined) updateData.deposit_success = deposit_success
    if (withdrawal_amount !== undefined) updateData.withdrawal_amount = withdrawal_amount
    if (withdrawal_success !== undefined) updateData.withdrawal_success = withdrawal_success
    if (withdrawal_time !== undefined) updateData.withdrawal_time = withdrawal_time
    if (issues_found !== undefined) updateData.issues_found = issues_found
    if (recommended_bins !== undefined) updateData.recommended_bins = recommended_bins
    if (test_result !== undefined) updateData.test_result = test_result
    if (rating !== undefined) updateData.rating = rating
    if (test_notes !== undefined) updateData.test_notes = test_notes
    if (final_report !== undefined) updateData.final_report = final_report

    // Если тест завершается, устанавливаем completed_at
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
      
      // Обновляем статус казино на основе результата теста
      if (test_result) {
        const casinoStatus = test_result === 'approved' ? 'approved' : 
                           test_result === 'rejected' ? 'rejected' : 'new'
        
        await supabase
          .from('casinos')
          .update({ status: casinoStatus })
          .eq('id', existingTest.casino_id)
      }
    }

    // Обновляем тест
    const { data: updatedTest, error } = await supabase
      .from('casino_tests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Логируем обновление теста
    await supabase.rpc('log_action', {
      p_user_id: userData.id,
      p_action: 'UPDATE',
      p_entity_type: 'casino_test',
      p_entity_id: id,
      p_details: `Обновлен тест: статус ${status || 'не изменен'}`
    })

    return NextResponse.json({
      success: true,
      test: updatedTest,
      message: 'Тест обновлен'
    })

  } catch (error) {
    console.error('Update casino test error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Удалить тест (только для admin)
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { id } = params
    
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

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - только Admin может удалять тесты' }, { status: 403 })
    }

    // Проверяем что тест существует
    const { data: existingTest, error: testError } = await supabase
      .from('casino_tests')
      .select('id, casino_id')
      .eq('id', id)
      .single()

    if (testError || !existingTest) {
      return NextResponse.json({ error: 'Тест не найден' }, { status: 404 })
    }

    // Удаляем тест
    const { error } = await supabase
      .from('casino_tests')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Логируем удаление теста
    await supabase.rpc('log_action', {
      p_user_id: userData.id,
      p_action: 'DELETE',
      p_entity_type: 'casino_test',
      p_entity_id: id,
      p_details: 'Тест удален администратором'
    })

    return NextResponse.json({
      success: true,
      message: 'Тест удален'
    })

  } catch (error) {
    console.error('Delete casino test error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
