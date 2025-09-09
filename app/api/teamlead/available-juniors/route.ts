import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить доступных junior сотрудников для назначения Team Lead
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверяем роль пользователя
    const { data: userData } = await supabase
      .from('users')
      .select('id, role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData || userData.role !== 'teamlead') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (userData.status !== 'active') {
      return NextResponse.json({ error: 'Account inactive' }, { status: 403 })
    }

    // Получаем всех junior сотрудников, которые еще не назначены никому
    const { data: availableJuniors, error } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        telegram_username,
        status
      `)
      .eq('role', 'junior')
      .eq('status', 'active')
      .is('team_lead_id', null) // Только те, кто не назначен никому

    if (error) {
      console.error('Available juniors fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Форматируем данные
    const formattedJuniors = availableJuniors.map(junior => ({
      id: junior.id,
      name: `${junior.first_name || ''} ${junior.last_name || ''}`.trim() || 'Без имени',
      email: junior.email,
      telegram: junior.telegram_username || '',
      status: junior.status
    }))

    return NextResponse.json({
      success: true,
      data: formattedJuniors
    })

  } catch (error) {
    console.error('Available juniors API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
