import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить банки, назначенные Team Lead'у
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Проверка аутентификации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверка роли Team Lead
    const { data: userData } = await supabase
      .from('users')
      .select('id, role, status, email')
      .eq('auth_id', user.id)
      .single()

    if (!userData || userData.role !== 'teamlead' || userData.status !== 'active') {
      return NextResponse.json({ 
        error: 'Access denied',
        details: 'Только активные Team Lead могут просматривать назначенные банки'
      }, { status: 403 })
    }

    // Получаем банки, назначенные этому Team Lead'у
    const { data: assignments, error } = await supabase
      .from('bank_teamlead_assignments')
      .select(`
        id,
        assigned_at,
        notes,
        bank:bank_id (
          id,
          name,
          country,
          is_active,
          created_at
        )
      `)
      .eq('teamlead_id', userData.id)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false })

    if (error) {
      console.error('Team Lead assigned banks error:', error)
      return NextResponse.json({ 
        error: 'Ошибка получения назначенных банков',
        details: error.message
      }, { status: 500 })
    }

    console.log(`Team Lead ${userData.email} has ${assignments?.length || 0} assigned banks`)

    return NextResponse.json({
      success: true,
      banks: assignments || []
    })

  } catch (error: any) {
    console.error('Team Lead assigned banks API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}
