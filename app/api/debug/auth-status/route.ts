import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Проверка аутентификации
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError) {
            return NextResponse.json({
                authenticated: false,
                error: 'Auth error',
                details: authError.message,
                timestamp: new Date().toISOString()
            })
        }

        if (!user) {
            return NextResponse.json({
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
                authenticated: true,
                user_found: false,
                auth_user: {
                    id: user.id,
                    email: user.email,
                    created_at: user.created_at
                },
                error: 'User not found in database',
                details: userError?.message,
                timestamp: new Date().toISOString()
            })
        }

        return NextResponse.json({
            authenticated: true,
            user_found: true,
            auth_user: {
                id: user.id,
                email: user.email,
                created_at: user.created_at
            },
            user_data: userData,
            permissions: {
                is_active: userData.status === 'active',
                can_access_teamlead: userData.role === 'teamlead',
                has_team_lead: !!userData.team_lead_id
            },
            timestamp: new Date().toISOString()
        })

    } catch (error: any) {
        return NextResponse.json({
            authenticated: false,
            error: 'Internal server error',
            details: error.message,
            timestamp: new Date().toISOString()
        }, { status: 500 })
    }
}
