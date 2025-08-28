import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const casino_id = searchParams.get('casino_id')
    const published_only = searchParams.get('published_only') === 'true'
    
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

    if (!userData || !['tester', 'manager', 'junior', 'hr', 'cfo', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Построение запроса
    let query = supabase
      .from('casino_manuals')
      .select(`
        *,
        casinos!inner(name, url, status),
        users!inner(first_name, last_name)
      `)
      .order('created_at', { ascending: false })

    // Если не tester/manager/admin, показываем только опубликованные
    if (!['tester', 'manager', 'admin'].includes(userData.role) || published_only) {
      query = query.eq('is_published', true)
    }

    if (casino_id) {
      query = query.eq('casino_id', casino_id)
    }

    const { data: manuals, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ manuals })

  } catch (error) {
    console.error('Casino manuals API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    // Проверка роли (только tester может создавать мануалы)
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
    const { casino_id, content } = body

    if (!casino_id || !content) {
      return NextResponse.json({ error: 'Casino ID and content are required' }, { status: 400 })
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

    // Получаем следующий номер версии для этого казино
    const { data: lastManual } = await supabase
      .from('casino_manuals')
      .select('version')
      .eq('casino_id', casino_id)
      .order('version', { ascending: false })
      .limit(1)
      .single()

    const nextVersion = (lastManual?.version || 0) + 1

    // Создание мануала
    const { data: manual, error } = await supabase
      .from('casino_manuals')
      .insert({
        casino_id,
        version: nextVersion,
        content,
        created_by: userData.id,
        is_published: false
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ manual }, { status: 201 })

  } catch (error) {
    console.error('Create casino manual API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
