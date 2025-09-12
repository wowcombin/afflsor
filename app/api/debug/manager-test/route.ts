import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Проверка аутентификации
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError) {
            return NextResponse.json({
                step: 'auth_check',
                authenticated: false,
                error: 'Auth error',
                details: authError.message,
                timestamp: new Date().toISOString()
            })
        }

        if (!user) {
            return NextResponse.json({
                step: 'auth_check',
                authenticated: false,
                error: 'No user session',
                timestamp: new Date().toISOString()
            })
        }

        // Получение данных пользователя
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, email, first_name, last_name, role, status, team_lead_id')
            .eq('auth_id', user.id)
            .single()

        if (userError || !userData) {
            return NextResponse.json({
                step: 'user_data',
                authenticated: true,
                user_found: false,
                auth_user: {
                    id: user.id,
                    email: user.email
                },
                error: 'User not found in database',
                details: userError?.message,
                timestamp: new Date().toISOString()
            })
        }

        // Тест доступа к Manager API
        let managerApiTest: any = { success: false, error: 'Not tested' }

        if (userData.role === 'manager') {
            try {
                // Простой тест запроса работ
                const { data: testWorks, error: worksError } = await supabase
                    .from('works')
                    .select('id, junior_id')
                    .limit(1)

                managerApiTest = {
                    success: !worksError,
                    error: worksError?.message || 'No error',
                    works_count: testWorks?.length || 0
                }
            } catch (error: any) {
                managerApiTest = {
                    success: false,
                    error: error.message
                }
            }
        }

        return NextResponse.json({
            step: 'complete',
            authenticated: true,
            user_found: true,
            auth_user: {
                id: user.id,
                email: user.email
            },
            user_data: userData,
            permissions: {
                is_active: userData.status === 'active',
                is_manager: userData.role === 'manager',
                can_access_withdrawals: ['manager', 'teamlead', 'hr', 'admin', 'cfo', 'tester'].includes(userData.role)
            },
            manager_api_test: managerApiTest,
            route_check: {
                current_path: '/dashboard/manager/withdrawals',
                expected_role: 'manager',
                user_role: userData.role,
                access_granted: userData.role === 'manager' || userData.role === 'admin'
            },
            timestamp: new Date().toISOString()
        })

    } catch (error: any) {
        return NextResponse.json({
            step: 'error',
            authenticated: false,
            error: 'Internal server error',
            details: error.message,
            timestamp: new Date().toISOString()
        }, { status: 500 })
    }
}
