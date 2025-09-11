import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Проверка аутентификации
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({
                step: 'auth',
                success: false,
                error: 'Not authenticated',
                details: authError?.message
            })
        }

        // Получение пользователя
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('auth_id', user.id)
            .single()

        if (userError || !userData) {
            return NextResponse.json({
                step: 'user_fetch',
                success: false,
                error: 'User not found',
                details: userError?.message
            })
        }

        // Тест обновления (простое изменение updated_at)
        const { data: updateResult, error: updateError } = await supabase
            .from('users')
            .update({
                updated_at: new Date().toISOString(),
                first_name: userData.first_name // Оставляем то же значение
            })
            .eq('auth_id', user.id)
            .select()
            .single()

        return NextResponse.json({
            step: 'complete',
            success: !updateError,
            auth_user: {
                id: user.id,
                email: user.email
            },
            user_data: userData,
            update_test: {
                success: !updateError,
                error: updateError?.message || null,
                result: updateResult
            },
            rls_check: {
                can_select: !!userData,
                can_update: !updateError,
                user_role: userData.role,
                user_status: userData.status
            },
            timestamp: new Date().toISOString()
        })

    } catch (error: any) {
        return NextResponse.json({
            step: 'error',
            success: false,
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}
