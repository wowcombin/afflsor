import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить конкретного пользователя
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const userId = params.id
    
    // Проверка аутентификации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверка роли или собственные данные
    const { data: userData } = await supabase
      .from('users')
      .select('id, role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Пользователь может видеть свои данные или HR/Admin могут видеть всех
    const canView = userData.id === userId || ['hr', 'admin'].includes(userData.role)
    
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Получаем данные пользователя
    const { data: targetUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !targetUser) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    return NextResponse.json({ user: targetUser })

  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Обновить пользователя
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const userId = params.id
    
    // Проверка аутентификации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверка роли (HR, Admin)
    const { data: userData } = await supabase
      .from('users')
      .select('role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData || !['hr', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      first_name,
      last_name,
      role,
      status,
      telegram_username,
      usdt_wallet,
      salary_percentage,
      salary_bonus
    } = body

    // Валидация роли
    if (role && !['junior', 'manager', 'tester', 'hr', 'cfo', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Некорректная роль' }, { status: 400 })
    }

    // Валидация статуса
    if (status && !['active', 'inactive', 'terminated'].includes(status)) {
      return NextResponse.json({ error: 'Некорректный статус' }, { status: 400 })
    }

    // Обновляем пользователя
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        first_name: first_name || null,
        last_name: last_name || null,
        role: role || undefined,
        status: status || undefined,
        telegram_username: telegram_username || null,
        usdt_wallet: usdt_wallet || null,
        salary_percentage: salary_percentage !== undefined ? salary_percentage : undefined,
        salary_bonus: salary_bonus !== undefined ? salary_bonus : undefined
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'Пользователь успешно обновлен'
    })

  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Удалить пользователя (только Admin)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const userId = params.id
    
    // Проверка аутентификации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверка роли (только Admin)
    const { data: userData } = await supabase
      .from('users')
      .select('role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - только Admin может удалять пользователей' }, { status: 403 })
    }

    // Получаем данные удаляемого пользователя
    const { data: targetUser, error: getUserError } = await supabase
      .from('users')
      .select('auth_id, email, first_name, last_name')
      .eq('id', userId)
      .single()

    if (getUserError || !targetUser) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    // Удаляем из нашей системы
    const { error: deleteUserError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (deleteUserError) {
      return NextResponse.json({ error: deleteUserError.message }, { status: 500 })
    }

    // Удаляем из Supabase Auth
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(targetUser.auth_id)
    
    if (deleteAuthError) {
      console.error('Ошибка удаления из Auth:', deleteAuthError)
      // Не возвращаем ошибку, так как пользователь уже удален из нашей системы
    }

    return NextResponse.json({
      success: true,
      message: `Пользователь ${targetUser.email} успешно удален`
    })

  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
