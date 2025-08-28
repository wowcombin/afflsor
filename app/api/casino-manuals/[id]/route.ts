import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

    if (!userData) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Получение мануала
    let query = supabase
      .from('casino_manuals')
      .select(`
        *,
        casinos!inner(name, url, status),
        users!inner(first_name, last_name)
      `)
      .eq('id', params.id)

    // Если не tester/manager/admin, показываем только опубликованные
    if (!['tester', 'manager', 'admin'].includes(userData.role)) {
      query = query.eq('is_published', true)
    }

    const { data: manual, error } = await query.single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!manual) {
      return NextResponse.json({ error: 'Manual not found' }, { status: 404 })
    }

    return NextResponse.json({ manual })

  } catch (error) {
    console.error('Get casino manual API error:', error)
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
    
    // Проверка роли (только tester может обновлять мануалы)
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

    // Проверяем, что мануал существует и принадлежит этому тестеру
    const { data: existingManual } = await supabase
      .from('casino_manuals')
      .select('id, created_by')
      .eq('id', params.id)
      .single()

    if (!existingManual) {
      return NextResponse.json({ error: 'Manual not found' }, { status: 404 })
    }

    if (existingManual.created_by !== userData.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Подготовка данных для обновления
    const updateData: any = {}
    
    if (body.content !== undefined) {
      updateData.content = body.content
    }

    if (body.is_published !== undefined) {
      updateData.is_published = body.is_published
    }

    // Обновление мануала
    const { data: updatedManual, error } = await supabase
      .from('casino_manuals')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ manual: updatedManual })

  } catch (error) {
    console.error('Update casino manual API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Проверка роли (только tester может удалять свои мануалы, или admin)
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

    // Если tester, проверяем что мануал принадлежит ему
    let query = supabase
      .from('casino_manuals')
      .delete()
      .eq('id', params.id)

    if (userData.role === 'tester') {
      query = query.eq('created_by', userData.id)
    }

    const { error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete casino manual API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
