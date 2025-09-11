import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST - Team Lead назначает Junior'а к казино
export async function POST(request: Request) {
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
        details: 'Только активные Team Lead могут назначать Junior\'ов к казино'
      }, { status: 403 })
    }

    const body = await request.json()
    const { junior_id, casino_id, notes } = body

    if (!junior_id || !casino_id) {
      return NextResponse.json({ 
        error: 'Заполните обязательные поля',
        details: 'junior_id и casino_id обязательны'
      }, { status: 400 })
    }

    // Проверяем, что Junior принадлежит команде этого Team Lead'а
    const { data: junior, error: juniorError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, status, team_lead_id')
      .eq('id', junior_id)
      .eq('role', 'junior')
      .eq('status', 'active')
      .eq('team_lead_id', userData.id)
      .single()

    if (juniorError || !junior) {
      return NextResponse.json({ 
        error: 'Junior не найден',
        details: 'Указанный Junior не найден в вашей команде или неактивен'
      }, { status: 404 })
    }

    // Проверяем, что казино назначено этому Team Lead'у
    const { data: casinoAssignment } = await supabase
      .from('casino_teamlead_assignments')
      .select('id')
      .eq('casino_id', casino_id)
      .eq('teamlead_id', userData.id)
      .eq('is_active', true)
      .single()

    if (!casinoAssignment) {
      return NextResponse.json({ 
        error: 'Казино не назначено',
        details: 'Данное казино не назначено вашей команде'
      }, { status: 403 })
    }

    // Получаем информацию о казино
    const { data: casino, error: casinoError } = await supabase
      .from('casinos')
      .select('id, name, url, status')
      .eq('id', casino_id)
      .single()

    if (casinoError || !casino) {
      return NextResponse.json({ 
        error: 'Казино не найдено',
        details: 'Указанное казино не существует'
      }, { status: 404 })
    }

    // Проверяем, не назначен ли Junior уже к этому казино
    const { data: existingAssignment } = await supabase
      .from('junior_casino_assignments')
      .select('id')
      .eq('casino_id', casino_id)
      .eq('junior_id', junior_id)
      .eq('is_active', true)
      .single()

    if (existingAssignment) {
      return NextResponse.json({ 
        error: 'Junior уже назначен к этому казино',
        details: 'Данный Junior уже работает с этим казино'
      }, { status: 400 })
    }

    // Создаем назначение
    const { data: assignment, error: assignError } = await supabase
      .from('junior_casino_assignments')
      .insert({
        casino_id,
        junior_id,
        teamlead_id: userData.id,
        assigned_by: userData.id,
        notes: notes?.trim() || null
      })
      .select()
      .single()

    if (assignError) {
      console.error('Junior casino assignment error:', assignError)
      return NextResponse.json({ 
        error: 'Ошибка назначения Junior\'а к казино',
        details: assignError.message
      }, { status: 500 })
    }

    console.log('✅ Team Lead assigned Junior to casino:', {
      teamLeadEmail: userData.email,
      juniorEmail: junior.email,
      casinoName: casino.name
    })

    return NextResponse.json({
      success: true,
      assignment,
      message: `Junior ${junior.email} назначен к казино ${casino.name}`
    })

  } catch (error: any) {
    console.error('Team Lead junior casino assignment error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}
