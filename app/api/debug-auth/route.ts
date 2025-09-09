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

        // Проверяем RLS политики - пытаемся создать тестовую запись
        let insertTestResult = null
        try {
            const testInsertQuery = await supabase
                .from('users')
                .insert({
                    auth_id: 'test-auth-id-' + Date.now(),
                    email: 'test@test.com',
                    role: 'junior',
                    status: 'active'
                })
                .select()

            insertTestResult = {
                success: true,
                message: 'RLS allows INSERT operation'
            }
        } catch (insertError: any) {
            insertTestResult = {
                success: false,
                error: insertError.message,
                message: 'RLS blocks INSERT operation'
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
            rls_test: insertTestResult,
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
