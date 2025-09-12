import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

        const paypalId = params.id
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

        // Проверяем, что PayPal аккаунт принадлежит пользователю
        const { data: existingPayPal, error: checkError } = await supabase
            .from('paypal_accounts')
            .select('junior_id')
            .eq('id', paypalId)
            .single()

        if (checkError || !existingPayPal) {
            console.error('PayPal account check error:', checkError)
            return NextResponse.json({ error: 'PayPal account not found' }, { status: 404 })
        }

        if (existingPayPal.junior_id !== userData.id) {
            console.error('Access denied:', { 
                paypal_junior_id: existingPayPal.junior_id, 
                user_id: userData.id 
            })
            return NextResponse.json({ error: 'Access denied - not your account' }, { status: 403 })
        }

        // Обновляем PayPal аккаунт
        const { data: updatedPayPal, error: updateError } = await supabase
            .from('paypal_accounts')
            .update({
                name,
                email,
                password,
                phone_number,
                authenticator_url,
                balance: parseFloat(balance) || 0,
                currency: currency || 'GBP',
                sender_paypal_email,
                balance_send: parseFloat(balance_send) || 0,
                send_paypal_balance,
                info,
                updated_at: new Date().toISOString()
            })
            .eq('id', paypalId)
            .select()
            .single()

        if (updateError) {
            console.error('Error updating PayPal account:', updateError)
            return NextResponse.json({ 
                error: 'Failed to update PayPal account',
                details: updateError.message
            }, { status: 500 })
        }

        // Логируем изменение баланса для отслеживания
        console.log('PayPal account updated:', {
            id: paypalId,
            name,
            email,
            balance,
            currency,
            updated_by: user.email
        })

        return NextResponse.json({
            success: true,
            paypal: updatedPayPal
        })

    } catch (error: any) {
        console.error('API Error:', error)
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error.message 
        }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

        const paypalId = params.id

        // Проверяем, что PayPal аккаунт принадлежит пользователю
        const { data: existingPayPal, error: checkError } = await supabase
            .from('paypal_accounts')
            .select('junior_id, name')
            .eq('id', paypalId)
            .single()

        console.log('DELETE PayPal Debug:', {
            paypalId,
            checkError,
            existingPayPal,
            userData: { id: userData.id, role: userData.role },
            auth_user: { id: user.id, email: user.email }
        })

        if (checkError || !existingPayPal) {
            console.error('PayPal account check error:', checkError)
            return NextResponse.json({ 
                error: 'PayPal account not found',
                debug: {
                    paypalId,
                    checkError: checkError?.message,
                    user_id: userData.id,
                    auth_id: user.id
                }
            }, { status: 404 })
        }

        if (existingPayPal.junior_id !== userData.id) {
            console.error('Access denied:', { 
                paypal_junior_id: existingPayPal.junior_id, 
                user_id: userData.id 
            })
            return NextResponse.json({ error: 'Access denied - not your account' }, { status: 403 })
        }

        // Блокируем аккаунт вместо удаления (для истории)
        const { error: blockError } = await supabase
            .from('paypal_accounts')
            .update({
                status: 'blocked',
                updated_at: new Date().toISOString()
            })
            .eq('id', paypalId)

        if (blockError) {
            console.error('Error blocking PayPal account:', blockError)
            return NextResponse.json({ 
                error: 'Failed to block PayPal account',
                details: blockError.message
            }, { status: 500 })
        }

        console.log('PayPal account blocked:', {
            id: paypalId,
            name: existingPayPal.name,
            blocked_by: user.email
        })

        return NextResponse.json({
            success: true,
            message: 'PayPal account blocked successfully'
        })

    } catch (error: any) {
        console.error('API Error:', error)
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error.message 
        }, { status: 500 })
    }
}
