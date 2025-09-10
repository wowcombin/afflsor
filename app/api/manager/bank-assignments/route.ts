import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить назначения банков Team Lead'ам
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Проверка аутентификации и роли
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData || !['manager', 'cfo', 'tester', 'hr', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Получаем все назначения банков
    const { data: assignments, error } = await supabase
      .from('bank_teamlead_assignments')
      .select(`
        id,
        bank_id,
        teamlead_id,
        assigned_at,
        is_active,
        notes,
        bank:bank_id (
          name,
          country,
          is_active
        ),
        teamlead:teamlead_id (
          email,
          first_name,
          last_name
        ),
        assigned_by_user:assigned_by (
          email,
          role
        )
      `)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ assignments: assignments || [] })

  } catch (error: any) {
    console.error('Bank assignments API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Назначить банк Team Lead'у
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Проверка аутентификации и роли
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, role, status, email')
      .eq('auth_id', user.id)
      .single()

    if (!userData || !['manager', 'cfo', 'tester', 'admin'].includes(userData.role)) {
      return NextResponse.json({ 
        error: 'Forbidden',
        details: 'Только Manager, CFO, Tester и Admin могут назначать банки Team Lead\'ам'
      }, { status: 403 })
    }

    const body = await request.json()
    const { bank_id, teamlead_id, notes } = body

    if (!bank_id || !teamlead_id) {
      return NextResponse.json({ 
        error: 'Заполните обязательные поля',
        details: 'bank_id и teamlead_id обязательны'
      }, { status: 400 })
    }

    // Проверяем, что Team Lead существует и активен
    const { data: teamlead, error: teamleadError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, status')
      .eq('id', teamlead_id)
      .eq('role', 'teamlead')
      .eq('status', 'active')
      .single()

    if (teamleadError || !teamlead) {
      return NextResponse.json({ 
        error: 'Team Lead не найден',
        details: 'Указанный Team Lead не существует или неактивен'
      }, { status: 404 })
    }

    // Проверяем, что банк существует и активен
    const { data: bank, error: bankError } = await supabase
      .from('banks')
      .select('id, name, country, is_active')
      .eq('id', bank_id)
      .eq('is_active', true)
      .single()

    if (bankError || !bank) {
      return NextResponse.json({ 
        error: 'Банк не найден',
        details: 'Указанный банк не существует или неактивен'
      }, { status: 404 })
    }

    // Проверяем, не назначен ли банк уже другому Team Lead'у
    const { data: existingAssignment } = await supabase
      .from('bank_teamlead_assignments')
      .select('id, teamlead_id')
      .eq('bank_id', bank_id)
      .eq('is_active', true)
      .single()

    if (existingAssignment) {
      return NextResponse.json({ 
        error: 'Банк уже назначен',
        details: 'Этот банк уже назначен другому Team Lead\'у'
      }, { status: 400 })
    }

    // Создаем назначение
    const { data: assignment, error: createError } = await supabase
      .from('bank_teamlead_assignments')
      .insert({
        bank_id,
        teamlead_id,
        assigned_by: userData.id,
        notes: notes?.trim() || null
      })
      .select()
      .single()

    if (createError) {
      return NextResponse.json({ 
        error: 'Ошибка создания назначения',
        details: createError.message
      }, { status: 500 })
    }

    console.log('✅ Bank assigned to Team Lead:', {
      bankName: bank.name,
      teamleadEmail: teamlead.email,
      assignedBy: userData.email
    })

    return NextResponse.json({
      success: true,
      assignment,
      message: `Банк ${bank.name} назначен Team Lead ${teamlead.email}`
    })

  } catch (error: any) {
    console.error('Bank assignment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
