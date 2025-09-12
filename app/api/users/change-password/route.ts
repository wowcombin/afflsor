import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Получаем текущего пользователя
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { currentPassword, newPassword } = body

        // Валидация входных данных
        if (!currentPassword || !newPassword) {
            return NextResponse.json({
                error: 'Текущий пароль и новый пароль обязательны'
            }, { status: 400 })
        }

        if (newPassword.length < 6) {
            return NextResponse.json({
                error: 'Новый пароль должен содержать минимум 6 символов'
            }, { status: 400 })
        }

        // Проверяем текущий пароль через повторную аутентификацию
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email!,
            password: currentPassword
        })

        if (signInError) {
            return NextResponse.json({
                error: 'Неверный текущий пароль'
            }, { status: 400 })
        }

        // Обновляем пароль
        const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword
        })

        if (updateError) {
            console.error('Error updating password:', updateError)
            return NextResponse.json({
                error: 'Не удалось обновить пароль',
                details: updateError.message
            }, { status: 500 })
        }

        // Логируем смену пароля
        console.log('Password changed successfully for user:', user.email)

        return NextResponse.json({
            success: true,
            message: 'Пароль успешно изменен'
        })

    } catch (error: any) {
        console.error('Change password error:', error)
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error.message 
        }, { status: 500 })
    }
}