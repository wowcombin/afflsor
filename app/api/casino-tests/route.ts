import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить все тесты казино
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const tester_id = searchParams.get('tester_id')
    const casino_id = searchParams.get('casino_id')
    
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

    // Получаем тесты с информацией о казино и тестерах
    let query = supabase
      .from('casino_tests')
      .select(`
        id,
        test_type,
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
        started_at,
        completed_at,
        created_at,
        casinos!inner(id, name, url, status),
        users!inner(id, first_name, last_name, email),
        cards(id, card_number_mask, card_bin)
      `)

    // Фильтрация
    if (userData.role === 'tester') {
      // Tester видит только свои тесты
      query = query.eq('tester_id', userData.id)
    } else if (tester_id && ['manager', 'admin'].includes(userData.role)) {
      // Manager+ может фильтровать по тестеру
      query = query.eq('tester_id', tester_id)
    }

    if (casino_id) {
      query = query.eq('casino_id', casino_id)
    }

    const { data: tests, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Форматируем данные
    const formattedTests = tests.map(test => {
      const casino = Array.isArray(test.casinos) ? test.casinos[0] : test.casinos
      const tester = Array.isArray(test.users) ? test.users[0] : test.users
      const card = Array.isArray(test.cards) ? test.cards[0] : test.cards

      return {
        ...test,
        casino: casino,
        tester: tester,
        card: card
      }
    })

    return NextResponse.json({ tests: formattedTests })

  } catch (error) {
    console.error('Get casino tests error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Создать новый тест казино
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
      return NextResponse.json({ error: 'Forbidden - только Tester могут создавать тесты' }, { status: 403 })
    }

    const body = await request.json()
    const {
      casino_id,
      card_id,
      test_type
    } = body

    // Валидация
    if (!casino_id) {
      return NextResponse.json({ error: 'Выберите казино для тестирования' }, { status: 400 })
    }

    // Проверяем что казино существует
    const { data: casino, error: casinoError } = await supabase
      .from('casinos')
      .select('id, name, status')
      .eq('id', casino_id)
      .single()

    if (casinoError || !casino) {
      return NextResponse.json({ error: 'Казино не найдено' }, { status: 404 })
    }

    // Проверяем что нет активного теста для этого казино
    const { data: activeTest } = await supabase
      .from('casino_tests')
      .select('id')
      .eq('casino_id', casino_id)
      .in('status', ['pending', 'in_progress'])
      .single()

    if (activeTest) {
      return NextResponse.json({ error: 'У этого казино уже есть активный тест' }, { status: 400 })
    }

    // Если указана карта, проверяем её доступность
    if (card_id) {
      const { data: card, error: cardError } = await supabase
        .from('cards')
        .select('id, status, assigned_to')
        .eq('id', card_id)
        .single()

      if (cardError || !card) {
        return NextResponse.json({ error: 'Карта не найдена' }, { status: 404 })
      }

      if (card.status !== 'active') {
        return NextResponse.json({ error: 'Карта недоступна для тестирования' }, { status: 400 })
      }
    }

    // Создаем тест
    const { data: newTest, error } = await supabase
      .from('casino_tests')
      .insert({
        casino_id,
        tester_id: userData.id,
        card_id: card_id || null,
        test_type: test_type || 'full',
        status: 'pending',
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Обновляем статус казино на "testing"
    await supabase
      .from('casinos')
      .update({ status: 'testing' })
      .eq('id', casino_id)

    return NextResponse.json({
      success: true,
      test: newTest,
      message: `Тест казино ${casino.name} создан`
    })

  } catch (error) {
    console.error('Create casino test error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
