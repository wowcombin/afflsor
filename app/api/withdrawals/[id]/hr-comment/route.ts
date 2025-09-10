import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// PATCH - Добавить HR комментарий к выводу
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient()
        const withdrawalId = params.id

        // Проверка аутентификации
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Проверка роли (HR, Admin)
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, role, status, email')
            .eq('auth_id', user.id)
            .single()

        console.log('HR Comment API - User check:', {
            userData,
            userError: userError?.message
        })

        if (userError || !userData) {
            return NextResponse.json({
                error: 'Пользователь не найден в системе',
                details: userError?.message
            }, { status: 404 })
        }

        if (!['hr', 'admin'].includes(userData.role)) {
            return NextResponse.json({
                error: 'Forbidden',
                details: `Роль '${userData.role}' не может добавлять HR комментарии`
            }, { status: 403 })
        }

        if (userData.status !== 'active') {
            return NextResponse.json({
                error: 'Аккаунт не активен',
                details: `Статус аккаунта: '${userData.status}'`
            }, { status: 403 })
        }

        const body = await request.json()
        const { hr_comment } = body

        if (typeof hr_comment !== 'string') {
            return NextResponse.json({
                error: 'Некорректный комментарий',
                details: 'hr_comment должен быть строкой'
            }, { status: 400 })
        }

        // Проверяем существование вывода
        const { data: withdrawal, error: getError } = await supabase
            .from('withdrawals')
            .select('id, user_id, amount, currency, status, hr_comment')
            .eq('id', withdrawalId)
            .single()

        if (getError || !withdrawal) {
            return NextResponse.json({
                error: 'Вывод не найден',
                details: getError?.message
            }, { status: 404 })
        }

        // Обновляем HR комментарий
        const { data: updatedWithdrawal, error: updateError } = await supabase
            .from('withdrawals')
            .update({
                hr_comment: hr_comment.trim() || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', withdrawalId)
            .select()
            .single()

        if (updateError) {
            console.error('HR comment update error:', updateError)
            return NextResponse.json({
                error: 'Ошибка обновления комментария',
                details: updateError.message
            }, { status: 500 })
        }

        console.log('✅ HR comment updated:', {
            withdrawalId,
            hrEmail: userData.email,
            commentLength: hr_comment.trim().length
        })

        return NextResponse.json({
            success: true,
            withdrawal: updatedWithdrawal,
            message: 'HR комментарий успешно сохранен'
        })

    } catch (error: any) {
        console.error('HR comment API error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}
