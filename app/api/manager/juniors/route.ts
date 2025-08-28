import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Отключаем статическую генерацию для этого API route
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    // Проверка роли Manager
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', user.id)
      .single()
    
    if (userData?.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Получаем всех активных Junior'ов
    const { data: juniors, error } = await supabase
      .from('users')
      .select(`
        id,
        auth_id,
        email,
        first_name,
        last_name,
        status,
        created_at,
        card_assignments (
          id,
          card_id,
          casino_id,
          status,
          assigned_at,
          cards (
            id,
            card_number_mask,
            status
          ),
          casinos (
            id,
            name
          )
        )
      `)
      .eq('role', 'junior')
      .eq('status', 'active')
      .order('first_name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Обрабатываем данные для удобства фронтенда
    const processedJuniors = juniors?.map(junior => ({
      ...junior,
      full_name: `${junior.first_name || ''} ${junior.last_name || ''}`.trim() || junior.email,
      active_assignments: junior.card_assignments?.filter(a => a.status === 'assigned') || [],
      total_assignments: junior.card_assignments?.length || 0
    })) || []

    return NextResponse.json({ juniors: processedJuniors })

  } catch (error) {
    console.error('Error fetching juniors:', error)
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера' 
    }, { status: 500 })
  }
}
