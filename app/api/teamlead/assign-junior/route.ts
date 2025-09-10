import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST - Назначить junior сотрудника Team Lead
export async function POST(request: NextRequest) {
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

    // Только HR и Admin могут назначать Junior к Team Lead
    if (!userData || !['hr', 'admin'].includes(userData.role)) {
      return NextResponse.json({ 
        error: 'Access denied', 
        details: 'Только HR и Admin могут назначать Junior сотрудников к Team Lead'
      }, { status: 403 })
    }

    if (userData.status !== 'active') {
      return NextResponse.json({ error: 'Account inactive' }, { status: 403 })
    }

    const body = await request.json()
    const { junior_id } = body

    if (!junior_id) {
      return NextResponse.json({ error: 'Junior ID is required' }, { status: 400 })
    }

    // Проверяем, что junior существует и доступен для назначения
    const { data: juniorData, error: juniorError } = await supabase
      .from('users')
      .select('id, role, status, team_lead_id, first_name, last_name, email')
      .eq('id', junior_id)
      .single()

    if (juniorError || !juniorData) {
      return NextResponse.json({ error: 'Junior not found' }, { status: 404 })
    }

    if (juniorData.role !== 'junior') {
      return NextResponse.json({ error: 'User is not a junior' }, { status: 400 })
    }

    if (juniorData.status !== 'active') {
      return NextResponse.json({ error: 'Junior is not active' }, { status: 400 })
    }

    if (juniorData.team_lead_id) {
      return NextResponse.json({ error: 'Junior is already assigned to another Team Lead' }, { status: 400 })
    }

    // Назначаем junior сотрудника Team Lead
    const { error: updateError } = await supabase
      .from('users')
      .update({ team_lead_id: userData.id })
      .eq('id', junior_id)

    if (updateError) {
      console.error('Junior assignment error:', updateError)
      return NextResponse.json({ error: 'Failed to assign junior' }, { status: 500 })
    }

    // Логируем действие
    await supabase
      .from('action_history')
      .insert({
        user_id: userData.id,
        action_type: 'assign',
        target_type: 'user',
        target_id: junior_id,
        description: `Team Lead назначил junior сотрудника ${juniorData.first_name} ${juniorData.last_name} (${juniorData.email}) в свою команду`
      })

    return NextResponse.json({
      success: true,
      message: 'Junior сотрудник успешно назначен в команду'
    })

  } catch (error) {
    console.error('Assign junior API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
