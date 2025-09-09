import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - получить созвоны команды
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Проверяем аутентификацию
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверяем роль пользователя
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', user.id)
      .single()

    if (userError || !userData || !['hr', 'admin', 'manager'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Получаем созвоны команды с программой
    const { data: calls, error: callsError } = await supabase
      .from('team_calls')
      .select(`
        *,
        team:team_id (
          id,
          name,
          description
        ),
        agenda_items:call_agenda_items (
          *,
          speaker_user:speaker_user_id (
            id,
            first_name,
            last_name,
            email,
            role
          )
        )
      `)
      .eq('team_id', params.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (callsError) {
      console.error('Error fetching team calls:', callsError)
      return NextResponse.json({ error: 'Failed to fetch team calls' }, { status: 500 })
    }

    // Сортируем agenda items по порядку
    const processedCalls = calls?.map(call => ({
      ...call,
      agenda_items: call.agenda_items?.sort((a: any, b: any) => a.order_number - b.order_number) || []
    })) || []

    return NextResponse.json({ calls: processedCalls })

  } catch (error) {
    console.error('Team calls API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - создать новый созвон
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Проверяем аутентификацию
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверяем роль пользователя
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', user.id)
      .single()

    if (userError || !userData || !['hr', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      name, 
      description, 
      duration_minutes, 
      schedule_time, 
      schedule_days,
      agenda_items 
    } = body

    if (!name) {
      return NextResponse.json({ error: 'Call name is required' }, { status: 400 })
    }

    // Создаем созвон
    const { data: call, error: createError } = await supabase
      .from('team_calls')
      .insert({
        team_id: params.id,
        name,
        description: description || null,
        duration_minutes: duration_minutes || 20,
        schedule_time: schedule_time || null,
        schedule_days: schedule_days || null
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating team call:', createError)
      return NextResponse.json({ error: 'Failed to create team call' }, { status: 500 })
    }

    // Добавляем пункты программы, если они есть
    if (agenda_items && Array.isArray(agenda_items) && agenda_items.length > 0) {
      const agendaData = agenda_items.map((item, index) => ({
        call_id: call.id,
        order_number: item.order_number || index + 1,
        title: item.title,
        description: item.description || null,
        duration_minutes: item.duration_minutes || 1,
        speaker_role: item.speaker_role || null,
        speaker_user_id: item.speaker_user_id || null
      }))

      const { error: agendaError } = await supabase
        .from('call_agenda_items')
        .insert(agendaData)

      if (agendaError) {
        console.error('Error creating agenda items:', agendaError)
        // Не возвращаем ошибку, так как созвон уже создан
      }
    }

    return NextResponse.json({ call })

  } catch (error) {
    console.error('Create team call API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
