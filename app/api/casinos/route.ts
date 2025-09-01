import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить все казино
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // Фильтр по статусу
    
    // Проверка аутентификации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData || userData.status !== 'active') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Получаем казино с информацией о последних тестах
    let query = supabase
      .from('casinos_with_latest_test')
      .select('*')

    if (status) {
      query = query.eq('status', status)
    }

    const { data: casinos, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ casinos: casinos || [] })

  } catch (error) {
    console.error('Get casinos error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Создать новое казино
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

    if (!userData || !['tester', 'manager', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden - только Tester, Manager и Admin могут создавать казино' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      url,
      promo,
      company,
      currency,
      allowed_bins,
      auto_approve_limit,
      withdrawal_time_value,
      withdrawal_time_unit,
      notes
    } = body

    // Валидация
    if (!name || !url) {
      return NextResponse.json({ error: 'Название и URL обязательны' }, { status: 400 })
    }

    // Проверяем URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Некорректный URL' }, { status: 400 })
    }

    // Создаем казино
    const { data: newCasino, error } = await supabase
      .from('casinos')
      .insert({
        name,
        url,
        promo: promo || null,
        company: company || null,
        currency: currency || 'USD',
        status: 'new',
        allowed_bins: allowed_bins || [],
        auto_approve_limit: auto_approve_limit || 100,
        withdrawal_time_value: withdrawal_time_value || 0,
        withdrawal_time_unit: withdrawal_time_unit || 'instant',
        notes: notes || null,
        created_by: userData.id
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      casino: newCasino,
      message: `Казино ${name} успешно создано`
    })

  } catch (error) {
    console.error('Create casino error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
