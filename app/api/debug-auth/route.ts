import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Диагностический API для проверки аутентификации и ролей
export async function GET() {
    try {
        const supabase = await createClient()

        // Проверка аутентификации
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError) {
            return NextResponse.json({
                error: 'Auth error',
                details: authError.message,
                step: 'authentication'
            }, { status: 401 })
        }

        if (!user) {
            return NextResponse.json({
                error: 'No authenticated user',
                step: 'authentication'
            }, { status: 401 })
        }

        console.log('🔍 Debug Auth - User authenticated:', user.email)

        // Получаем данные пользователя из нашей таблицы
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('auth_id', user.id)
            .single()

        if (userError) {
            console.error('🚨 User data query error:', userError)
            return NextResponse.json({
                error: 'User data query failed',
                details: userError.message,
                step: 'user_data_query',
                auth_user: {
                    id: user.id,
                    email: user.email,
                    created_at: user.created_at
                }
            }, { status: 500 })
        }

        if (!userData) {
            return NextResponse.json({
                error: 'User not found in users table',
                step: 'user_data_query',
                auth_user: {
                    id: user.id,
                    email: user.email,
                    created_at: user.created_at
                }
            }, { status: 404 })
        }

        console.log('✅ User data found:', {
            email: userData.email,
            role: userData.role,
            status: userData.status
        })

        // Проверяем RLS политики - проверяем существующие политики
        let rlsPolicyCheck = null
        try {
            // Проверяем, можем ли мы выполнить SELECT запрос (что указывает на корректные RLS политики)
            const { data: policyTest, error: policyError } = await supabase
                .from('users')
                .select('id, email, role, status')
                .limit(1)

            if (policyError) {
                rlsPolicyCheck = {
                    success: false,
                    error: policyError.message,
                    message: 'RLS политики блокируют SELECT операции'
                }
            } else {
                rlsPolicyCheck = {
                    success: true,
                    message: 'RLS политики работают корректно для SELECT операций'
                }
            }
        } catch (policyError: any) {
            rlsPolicyCheck = {
                success: false,
                error: policyError.message,
                message: 'Ошибка при проверке RLS политик'
            }
        }

        return NextResponse.json({
            success: true,
            step: 'complete',
            auth_user: {
                id: user.id,
                email: user.email,
                created_at: user.created_at
            },
            user_data: userData,
            permissions: {
                can_create_users: ['hr', 'admin', 'manager'].includes(userData.role),
                is_active: userData.status === 'active'
            },
            rls_test: rlsPolicyCheck,
            debug_info: {
                timestamp: new Date().toISOString(),
                role_check: userData.role,
                status_check: userData.status,
                required_roles: ['hr', 'admin', 'manager']
            }
        })

    } catch (error: any) {
        console.error('🚨 Debug auth error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message,
            step: 'catch_block'
        }, { status: 500 })
    }
}
