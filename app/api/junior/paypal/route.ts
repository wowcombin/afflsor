import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, role')
            .eq('auth_id', user.id)
            .single()

        if (userError || !userData || userData.role !== 'junior') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // Получаем PayPal аккаунты пользователя
        const { data: paypalAccounts, error: paypalError } = await supabase
            .from('paypal_accounts')
            .select('*')
            .eq('user_id', userData.id)
            .order('created_at', { ascending: false })

        if (paypalError) {
            console.error('Error fetching PayPal accounts:', paypalError)
            return NextResponse.json({
                error: 'Failed to fetch PayPal accounts',
                details: paypalError.message
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            paypal_accounts: paypalAccounts || []
        })

    } catch (error: any) {
        console.error('API Error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, role')
            .eq('auth_id', user.id)
            .single()

        if (userError || !userData || userData.role !== 'junior') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const body = await request.json()
        const {
            name,
            email,
            password,
            phone_number,
            authenticator_url,
            balance,
            currency,
            sender_paypal_email,
            balance_send,
            send_paypal_balance,
            info
        } = body

        // Проверяем обязательные поля
        if (!name || !email || !password || !phone_number || !authenticator_url) {
            return NextResponse.json({
                error: 'Missing required fields',
                details: 'Имя, email, пароль, телефон и ссылка аутентификатора обязательны'
            }, { status: 400 })
        }

        // Создаем PayPal аккаунт
        const { data: newPayPal, error: createError } = await supabase
            .from('paypal_accounts')
            .insert({
                user_id: userData.id,
                name: name.trim(),
                email: email.trim(),
                password,
                phone_number: phone_number.trim(),
                authenticator_url: authenticator_url.trim(),
                balance: parseFloat(balance) || 0,
                currency: currency || 'GBP',
                sender_paypal_email: sender_paypal_email?.trim() || null,
                balance_send: parseFloat(balance_send) || 0,
                send_paypal_balance: send_paypal_balance?.trim() || null,
                info: info?.trim() || null,
                status: 'active'
            })
            .select()
            .single()

        if (createError) {
            console.error('Error creating PayPal account:', createError)
            return NextResponse.json({
                error: 'Failed to create PayPal account',
                details: createError.message
            }, { status: 500 })
        }

        console.log('PayPal account created:', {
            id: newPayPal.id,
            name,
            email,
            balance,
            currency,
            created_by: user.email
        })

        return NextResponse.json({
            success: true,
            paypal: newPayPal
        })

    } catch (error: any) {
        console.error('API Error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}
