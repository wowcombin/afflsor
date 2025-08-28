import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Отключаем статическую генерацию для этого API route
export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Проверка авторизации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, role')
      .eq('auth_id', user.id)
      .single()

    if (!userData || !['tester', 'manager', 'hr', 'cfo', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Получение теста
    let query = supabase
      .from('casino_tests')
      .select(`
        *,
        casinos!inner(name, url, status, allowed_bins, auto_approve_limit),
        users!inner(first_name, last_name)
      `)
      .eq('id', params.id)

    // Если tester, может видеть только свои тесты
    if (userData.role === 'tester') {
      query = query.eq('tester_id', userData.id)
    }

    const { data: test, error } = await query.single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 })
    }

    return NextResponse.json({ test })

  } catch (error) {
    console.error('Get casino test API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    // Проверка роли (только tester может обновлять свои тесты)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, role')
      .eq('auth_id', user.id)
      .single()

    if (!userData || userData.role !== 'tester') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Проверяем, что тест принадлежит этому тестеру
    const { data: existingTest } = await supabase
      .from('casino_tests')
      .select('id, tester_id, status')
      .eq('id', params.id)
      .eq('tester_id', userData.id)
      .single()

    if (!existingTest) {
      return NextResponse.json({ error: 'Test not found or access denied' }, { status: 404 })
    }

    // Подготовка данных для обновления
    const updateData: any = {}
    
    if (body.status !== undefined) {
      updateData.status = body.status
      
      // Если тест завершается, устанавливаем время завершения
      if (body.status === 'completed' || body.status === 'failed') {
        updateData.completed_at = new Date().toISOString()
      }
    }

    if (body.registration_time !== undefined) {
      updateData.registration_time = body.registration_time
    }

    if (body.deposit_success !== undefined) {
      updateData.deposit_success = body.deposit_success
    }

    if (body.withdrawal_time !== undefined) {
      updateData.withdrawal_time = body.withdrawal_time
    }

    if (body.issues_found !== undefined) {
      updateData.issues_found = body.issues_found
    }

    if (body.recommended_bins !== undefined) {
      updateData.recommended_bins = body.recommended_bins
    }

    if (body.test_result !== undefined) {
      updateData.test_result = body.test_result
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes
    }

    // Обновление теста
    const { data: updatedTest, error } = await supabase
      .from('casino_tests')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ test: updatedTest })

  } catch (error) {
    console.error('Update casino test API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Проверка роли (только tester может удалять свои тесты, или admin)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, role')
      .eq('auth_id', user.id)
      .single()

    if (!userData || !['tester', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Если tester, проверяем что тест принадлежит ему
    let query = supabase
      .from('casino_tests')
      .delete()
      .eq('id', params.id)

    if (userData.role === 'tester') {
      query = query.eq('tester_id', userData.id)
    }

    const { error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete casino test API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
