import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить все мануалы
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const casino_id = searchParams.get('casino_id')
    const published_only = searchParams.get('published_only') === 'true'
    
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

    // Получаем мануалы с информацией о казино и авторах
    let query = supabase
      .from('casino_manuals')
      .select(`
        id,
        title,
        content,
        version,
        is_published,
        published_at,
        created_at,
        updated_at,
        casinos!inner(id, name, url, status),
        created_by_user:users!casino_manuals_created_by_fkey(id, first_name, last_name),
        published_by_user:users!casino_manuals_published_by_fkey(id, first_name, last_name)
      `)

    // Фильтрация
    if (casino_id) {
      query = query.eq('casino_id', casino_id)
    }

    // Junior видят только опубликованные мануалы
    if (userData.role === 'junior' || published_only) {
      query = query.eq('is_published', true)
    }

    const { data: manuals, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Форматируем данные
    const formattedManuals = manuals.map(manual => {
      const casino = Array.isArray(manual.casinos) ? manual.casinos[0] : manual.casinos
      const created_by = Array.isArray(manual.created_by_user) ? manual.created_by_user[0] : manual.created_by_user
      const published_by = Array.isArray(manual.published_by_user) ? manual.published_by_user[0] : manual.published_by_user

      return {
        ...manual,
        casino: casino,
        created_by: created_by,
        published_by: published_by
      }
    })

    return NextResponse.json({ manuals: formattedManuals })

  } catch (error) {
    console.error('Get casino manuals error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Создать новый мануал
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
      return NextResponse.json({ error: 'Forbidden - только Tester, Manager и Admin могут создавать мануалы' }, { status: 403 })
    }

    const body = await request.json()
    const {
      casino_id,
      title,
      content,
      is_published
    } = body

    // Валидация
    if (!casino_id || !title || !content) {
      return NextResponse.json({ error: 'Казино, заголовок и содержимое обязательны' }, { status: 400 })
    }

    // Проверяем что казино существует
    const { data: casino, error: casinoError } = await supabase
      .from('casinos')
      .select('id, name')
      .eq('id', casino_id)
      .single()

    if (casinoError || !casino) {
      return NextResponse.json({ error: 'Казино не найдено' }, { status: 404 })
    }

    // Создаем мануал
    const manualData: any = {
      casino_id,
      title,
      content,
      version: 1,
      is_published: is_published || false,
      created_by: userData.id
    }

    // Если публикуется сразу
    if (is_published) {
      manualData.published_by = userData.id
      manualData.published_at = new Date().toISOString()
    }

    const { data: newManual, error } = await supabase
      .from('casino_manuals')
      .insert(manualData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Логируем создание мануала
    await supabase.rpc('log_action', {
      p_user_id: userData.id,
      p_action: 'CREATE',
      p_entity_type: 'casino_manual',
      p_entity_id: newManual.id,
      p_details: `Создан мануал "${title}" для казино "${casino.name}"`
    })

    return NextResponse.json({
      success: true,
      manual: newManual,
      message: `Мануал "${title}" создан`
    })

  } catch (error) {
    console.error('Create casino manual error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
