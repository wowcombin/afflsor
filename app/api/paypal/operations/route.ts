import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        console.log('PayPal operations API called:', { user: user.email })

        // Получаем данные пользователя
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, role, status')
            .eq('auth_id', user.id)
            .single()

        if (userError || !userData) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const { searchParams } = new URL(request.url)
        const paypalAccountId = searchParams.get('paypal_account_id')
        const operationType = searchParams.get('operation_type')
        const status = searchParams.get('status')
        const limit = parseInt(searchParams.get('limit') || '50')
        const offset = parseInt(searchParams.get('offset') || '0')

        let query = supabase
            .from('paypal_operations')
            .select(`
                *,
                paypal_accounts!inner(
                    id,
                    name,
                    email,
                    balance,
                    currency
                )
            `)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        // Фильтры
        if (paypalAccountId) {
            query = query.eq('paypal_account_id', paypalAccountId)
        }

        if (operationType) {
            query = query.eq('operation_type', operationType)
        }

        if (status) {
            query = query.eq('status', status)
        }

        // Для Junior показываем только его операции (RLS автоматически фильтрует)
        const { data: operations, error: operationsError } = await query

        if (operationsError) {
            console.error('Error fetching PayPal operations:', operationsError)
            return NextResponse.json({ 
                error: 'Failed to fetch operations',
                details: operationsError.message 
            }, { status: 500 })
        }

        // Получаем статистику
        const { data: stats, error: statsError } = await supabase
            .from('paypal_operations')
            .select('operation_type, status, amount, currency')

        let operationStats = {
            total: 0,
            pending: 0,
            completed: 0,
            failed: 0,
            totalAmount: 0,
            byType: {} as Record<string, number>
        }

        if (!statsError && stats) {
            operationStats = stats.reduce((acc, op) => {
                acc.total++
                acc[op.status as keyof typeof acc]++
                if (op.status === 'completed') {
                    acc.totalAmount += parseFloat(op.amount)
                }
                acc.byType[op.operation_type] = (acc.byType[op.operation_type] || 0) + 1
                return acc
            }, operationStats)
        }

        return NextResponse.json({
            operations: operations || [],
            stats: operationStats,
            pagination: {
                limit,
                offset,
                total: operations?.length || 0
            }
        })

    } catch (error) {
        console.error('PayPal operations API error:', error)
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
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

        // Получаем данные пользователя
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, role, status')
            .eq('auth_id', user.id)
            .single()

        if (userError || !userData) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const body = await request.json()
        const {
            paypal_account_id,
            operation_type,
            amount,
            currency = 'USD',
            recipient_paypal_email,
            recipient_card_number,
            casino_name,
            description
        } = body

        // Валидация обязательных полей
        if (!paypal_account_id || !operation_type || !amount) {
            return NextResponse.json({ 
                error: 'Missing required fields',
                details: 'paypal_account_id, operation_type, and amount are required'
            }, { status: 400 })
        }

        // Проверяем, что PayPal аккаунт принадлежит пользователю
        const { data: paypalAccount, error: paypalError } = await supabase
            .from('paypal_accounts')
            .select('id, junior_id, balance, currency')
            .eq('id', paypal_account_id)
            .single()

        if (paypalError || !paypalAccount) {
            return NextResponse.json({ error: 'PayPal account not found' }, { status: 404 })
        }

        if (paypalAccount.junior_id !== userData.id) {
            return NextResponse.json({ error: 'Access denied to this PayPal account' }, { status: 403 })
        }

        // Проверяем баланс для операций списания
        const debitOperations = ['send_money', 'withdraw_to_card', 'casino_deposit']
        if (debitOperations.includes(operation_type) && paypalAccount.balance < amount) {
            return NextResponse.json({ 
                error: 'Insufficient balance',
                details: `Current balance: ${paypalAccount.balance} ${paypalAccount.currency}`
            }, { status: 400 })
        }

        // Создаем операцию через функцию
        const { data: operationId, error: createError } = await supabase
            .rpc('create_paypal_operation', {
                p_paypal_account_id: paypal_account_id,
                p_operation_type: operation_type,
                p_amount: amount,
                p_currency: currency,
                p_recipient_paypal_email: recipient_paypal_email || null,
                p_recipient_card_number: recipient_card_number || null,
                p_casino_name: casino_name || null,
                p_description: description || null
            })

        if (createError) {
            console.error('Error creating PayPal operation:', createError)
            return NextResponse.json({ 
                error: 'Failed to create operation',
                details: createError.message 
            }, { status: 500 })
        }

        // Получаем созданную операцию
        const { data: newOperation, error: fetchError } = await supabase
            .from('paypal_operations')
            .select(`
                *,
                paypal_accounts!inner(
                    id,
                    name,
                    email,
                    balance,
                    currency
                )
            `)
            .eq('id', operationId)
            .single()

        if (fetchError) {
            console.error('Error fetching created operation:', fetchError)
            return NextResponse.json({ 
                error: 'Operation created but failed to fetch details',
                operation_id: operationId
            }, { status: 201 })
        }

        console.log('PayPal operation created:', { 
            operation_id: operationId, 
            type: operation_type, 
            amount, 
            user: user.email 
        })

        return NextResponse.json({
            message: 'Operation created successfully',
            operation: newOperation
        }, { status: 201 })

    } catch (error) {
        console.error('PayPal operations POST error:', error)
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
