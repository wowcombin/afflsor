import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Отключаем статическую генерацию для этого API route
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const casino_id = searchParams.get('casino_id')
    
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

    // Построение запроса
    let query = supabase
      .from('casino_tests')
      .select(`
        *,
        casinos!inner(name, url, status),
        users!inner(first_name, last_name)
      `)
      .order('created_at', { ascending: false })

    // Если tester, показываем только его тесты
    if (userData.role === 'tester') {
      query = query.eq('tester_id', userData.id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (casino_id) {
      query = query.eq('casino_id', casino_id)
    }

    const { data: tests, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ tests })

  } catch (error) {
    console.error('Casino tests API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    // Проверка роли (только tester может создавать тесты)
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

    // Валидация данных
    const { casino_id } = body

    if (!casino_id) {
      return NextResponse.json({ error: 'Casino ID is required' }, { status: 400 })
    }

    // Проверяем, что казино существует
    const { data: casino, error: casinoError } = await supabase
      .from('casinos')
      .select('id, status')
      .eq('id', casino_id)
      .single()

    if (casinoError || !casino) {
      return NextResponse.json({ error: 'Casino not found' }, { status: 404 })
    }

    // Проверяем, что нет активного теста для этого казино от этого тестера
    const { data: existingTest } = await supabase
      .from('casino_tests')
      .select('id')
      .eq('casino_id', casino_id)
      .eq('tester_id', userData.id)
      .in('status', ['pending', 'in_progress'])
      .single()

    if (existingTest) {
      return NextResponse.json({ error: 'Active test already exists for this casino' }, { status: 400 })
    }

    // Создание теста
    const { data: test, error } = await supabase
      .from('casino_tests')
      .insert({
        casino_id,
        tester_id: userData.id,
        status: 'pending',
        deposit_success: false
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Обновляем статус казино на 'testing'
    await supabase
      .from('casinos')
      .update({ status: 'testing' })
      .eq('id', casino_id)

    return NextResponse.json({ test }, { status: 201 })

  } catch (error) {
    console.error('Create casino test API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
