import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Получаем данные пользователя
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, role, first_name, last_name, auth_id')
            .eq('auth_id', user.id)
            .single()

        if (userError || !userData) {
            return NextResponse.json({ 
                error: 'User not found',
                details: userError?.message,
                auth_user_id: user.id
            }, { status: 404 })
        }

        // Получаем все PayPal аккаунты пользователя
        const { data: paypalAccounts, error: paypalError } = await supabase
            .from('paypal_accounts')
            .select('id, name, email, junior_id, status, created_at')
            .eq('junior_id', userData.id)

        if (paypalError) {
            return NextResponse.json({ 
                error: 'Failed to fetch PayPal accounts',
                details: paypalError.message
            }, { status: 500 })
        }

        // Получаем все PayPal аккаунты в системе для сравнения
        const { data: allPaypalAccounts, error: allPaypalError } = await supabase
            .from('paypal_accounts')
            .select('id, name, email, junior_id, status')
            .limit(10)

        return NextResponse.json({
            debug_info: {
                auth_user: {
                    id: user.id,
                    email: user.email
                },
                db_user: userData,
                user_paypal_accounts: paypalAccounts,
                sample_all_paypal_accounts: allPaypalAccounts,
                comparison: {
                    auth_id_vs_db_id: {
                        auth_id: user.id,
                        db_user_id: userData.id,
                        are_different: user.id !== userData.id
                    }
                }
            }
        })

    } catch (error: any) {
        console.error('Debug API Error:', error)
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error.message 
        }, { status: 500 })
    }
}
