import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить назначения Junior'ов к казино для Team Lead'а
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
        details: 'Только активные Team Lead могут просматривать назначения Junior\'ов'
      }, { status: 403 })
    }

    // Получаем назначения Junior'ов к казино для этого Team Lead'а
    const { data: assignments, error } = await supabase
      .from('junior_casino_assignments')
      .select(`
        id,
        assigned_at,
        is_active,
        notes,
        casino:casino_id (
          id,
          name,
          url,
          status
        ),
        junior:junior_id (
          id,
          email,
          first_name,
          last_name,
          status
        )
      `)
      .eq('teamlead_id', userData.id)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false })

    if (error) {
      console.error('Team Lead junior casino assignments error:', error)
      return NextResponse.json({ 
        error: 'Ошибка получения назначений Junior\'ов',
        details: error.message
      }, { status: 500 })
    }

    console.log(`Team Lead ${userData.email} has ${assignments?.length || 0} junior casino assignments`)

    return NextResponse.json({
      success: true,
      assignments: assignments || []
    })

  } catch (error: any) {
    console.error('Team Lead junior casino assignments API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}

// DELETE - Отозвать назначение Junior'а от казино
export async function DELETE(request: Request) {
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
        details: 'Только активные Team Lead могут отзывать назначения Junior\'ов'
      }, { status: 403 })
    }

    const { assignment_id } = await request.json()

    if (!assignment_id) {
      return NextResponse.json({ 
        error: 'Не указан ID назначения',
        details: 'assignment_id обязателен'
      }, { status: 400 })
    }

    // Проверяем, что назначение принадлежит этому Team Lead'у
    const { data: assignment, error: assignmentError } = await supabase
      .from('junior_casino_assignments')
      .select('id, teamlead_id, casino_id, junior_id')
      .eq('id', assignment_id)
      .eq('teamlead_id', userData.id)
      .eq('is_active', true)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json({ 
        error: 'Назначение не найдено',
        details: 'Указанное назначение не найдено или не принадлежит вашей команде'
      }, { status: 404 })
    }

    // Отзываем назначение (делаем неактивным)
    const { error: updateError } = await supabase
      .from('junior_casino_assignments')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', assignment_id)

    if (updateError) {
      console.error('Junior casino assignment revoke error:', updateError)
      return NextResponse.json({ 
        error: 'Ошибка отзыва назначения',
        details: updateError.message
      }, { status: 500 })
    }

    console.log('✅ Team Lead revoked junior casino assignment:', {
      teamLeadEmail: userData.email,
      assignmentId: assignment_id
    })

    return NextResponse.json({
      success: true,
      message: 'Назначение Junior\'а к казино отозвано'
    })

  } catch (error: any) {
    console.error('Team Lead revoke junior casino assignment error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}
