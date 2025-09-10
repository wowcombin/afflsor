import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST - Изменить пароль пользователя
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Проверка аутентификации
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Не авторизован',
        details: authError?.message 
      }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    // Валидация
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ 
        error: 'Заполните все поля',
        details: 'Текущий и новый пароль обязательны'
      }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ 
        error: 'Пароль слишком короткий',
        details: 'Пароль должен содержать минимум 6 символов'
      }, { status: 400 })
    }

    console.log('🔐 Password change request:', {
      userId: user.id,
      email: user.email,
      newPasswordLength: newPassword.length
    })

    // Сначала проверим текущий пароль, попытавшись войти с ним
    const testClient = await createClient()
    const { error: signInError } = await testClient.auth.signInWithPassword({
      email: user.email || '',
      password: currentPassword
    })

    if (signInError) {
      console.error('Current password verification failed:', signInError)
      return NextResponse.json({ 
        error: 'Неверный текущий пароль',
        details: 'Введенный текущий пароль не совпадает'
      }, { status: 400 })
    }

    // Используем admin клиент для смены пароля
    const adminSupabase = createAdminClient()
    
    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )

    if (updateError) {
      console.error('Password update error:', updateError)
      return NextResponse.json({ 
        error: 'Ошибка обновления пароля',
        details: updateError.message
      }, { status: 500 })
    }

    console.log('✅ Password updated successfully for:', user.email)

    // Обновляем время последнего изменения в нашей таблице
    const { error: timestampError } = await supabase
      .from('users')
      .update({ 
        updated_at: new Date().toISOString()
      })
      .eq('auth_id', user.id)

    if (timestampError) {
      console.error('Timestamp update error:', timestampError)
      // Не возвращаем ошибку, так как пароль уже изменен
    }

    return NextResponse.json({
      success: true,
      message: 'Пароль успешно изменен'
    })

  } catch (error: any) {
    console.error('Change password API error:', error)
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера',
      details: error.message
    }, { status: 500 })
  }
}
