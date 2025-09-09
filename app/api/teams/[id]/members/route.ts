import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - добавить участника в команду
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
    const { user_id, role = 'member' } = body

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Проверяем, что пользователь существует
    const { data: targetUser, error: targetUserError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .eq('id', user_id)
      .single()

    if (targetUserError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Получаем ID текущего пользователя из таблицы users
    const { data: currentUser, error: currentUserError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (currentUserError || !currentUser) {
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 })
    }

    // Добавляем участника в команду
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: params.id,
        user_id: user_id,
        role: role,
        added_by: currentUser.id
      })
      .select(`
        *,
        user:user_id (
          id,
          first_name,
          last_name,
          email,
          role
        )
      `)
      .single()

    if (memberError) {
      if (memberError.code === '23505') { // unique constraint violation
        return NextResponse.json({ error: 'User is already a member of this team' }, { status: 409 })
      }
      console.error('Error adding team member:', memberError)
      return NextResponse.json({ error: 'Failed to add team member' }, { status: 500 })
    }

    return NextResponse.json({ member })

  } catch (error) {
    console.error('Add team member API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE - удалить участника из команды
export async function DELETE(
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

    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Получаем ID текущего пользователя из таблицы users
    const { data: currentUser, error: currentUserError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (currentUserError || !currentUser) {
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 })
    }

    // Деактивируем участника команды (не удаляем для истории)
    const { error: deleteError } = await supabase
      .from('team_members')
      .update({
        is_active: false,
        left_at: new Date().toISOString(),
        removed_by: currentUser.id
      })
      .eq('team_id', params.id)
      .eq('user_id', user_id)
      .eq('is_active', true)

    if (deleteError) {
      console.error('Error removing team member:', deleteError)
      return NextResponse.json({ error: 'Failed to remove team member' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Remove team member API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
