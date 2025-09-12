import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const operationId = params.id

        // Получаем операцию с деталями
        const { data: operation, error: operationError } = await supabase
            .from('paypal_operations')
            .select(`
                *,
                paypal_accounts!inner(
                    id,
                    name,
                    email,
                    balance,
                    currency,
                    phone_number,
                    authenticator_url
                ),
                users!paypal_operations_junior_id_fkey(
                    id,
                    name,
                    email
                )
            `)
            .eq('id', operationId)
            .single()

        if (operationError || !operation) {
            return NextResponse.json({ error: 'Operation not found' }, { status: 404 })
        }

        return NextResponse.json({ operation })

    } catch (error) {
        console.error('PayPal operation GET error:', error)
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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

        const operationId = params.id
        const body = await request.json()
        const { status, transaction_id, fee_amount, description } = body

        // Валидация статуса
        const validStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled']
        if (status && !validStatuses.includes(status)) {
            return NextResponse.json({ 
                error: 'Invalid status',
                details: `Status must be one of: ${validStatuses.join(', ')}`
            }, { status: 400 })
        }

        // Получаем текущую операцию для проверки прав
        const { data: currentOperation, error: fetchError } = await supabase
            .from('paypal_operations')
            .select('junior_id, status, paypal_account_id')
            .eq('id', operationId)
            .single()

        if (fetchError || !currentOperation) {
            return NextResponse.json({ error: 'Operation not found' }, { status: 404 })
        }

        // Проверяем права доступа
        const isOwner = currentOperation.junior_id === userData.id
        const isManager = ['manager', 'teamlead', 'hr', 'cfo', 'admin'].includes(userData.role)

        if (!isOwner && !isManager) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // Junior может только отменить свои операции в статусе pending
        if (userData.role === 'junior' && 
            (currentOperation.status !== 'pending' || status !== 'cancelled')) {
            return NextResponse.json({ 
                error: 'Junior can only cancel pending operations' 
            }, { status: 403 })
        }

        // Подготавливаем данные для обновления
        const updateData: any = {}
        
        if (status) updateData.status = status
        if (transaction_id) updateData.transaction_id = transaction_id
        if (fee_amount !== undefined) updateData.fee_amount = fee_amount
        if (description) updateData.description = description

        // Обновляем операцию
        const { data: updatedOperation, error: updateError } = await supabase
            .from('paypal_operations')
            .update(updateData)
            .eq('id', operationId)
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
            .single()

        if (updateError) {
            console.error('Error updating PayPal operation:', updateError)
            return NextResponse.json({ 
                error: 'Failed to update operation',
                details: updateError.message 
            }, { status: 500 })
        }

        console.log('PayPal operation updated:', { 
            operation_id: operationId, 
            new_status: status,
            updated_by: user.email 
        })

        return NextResponse.json({
            message: 'Operation updated successfully',
            operation: updatedOperation
        })

    } catch (error) {
        console.error('PayPal operation PATCH error:', error)
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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

        // Только админы и HR могут удалять операции
        if (!['admin', 'hr'].includes(userData.role)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const operationId = params.id

        // Проверяем, что операция существует и не завершена
        const { data: operation, error: fetchError } = await supabase
            .from('paypal_operations')
            .select('status')
            .eq('id', operationId)
            .single()

        if (fetchError || !operation) {
            return NextResponse.json({ error: 'Operation not found' }, { status: 404 })
        }

        if (operation.status === 'completed') {
            return NextResponse.json({ 
                error: 'Cannot delete completed operation' 
            }, { status: 400 })
        }

        // Удаляем операцию
        const { error: deleteError } = await supabase
            .from('paypal_operations')
            .delete()
            .eq('id', operationId)

        if (deleteError) {
            console.error('Error deleting PayPal operation:', deleteError)
            return NextResponse.json({ 
                error: 'Failed to delete operation',
                details: deleteError.message 
            }, { status: 500 })
        }

        console.log('PayPal operation deleted:', { 
            operation_id: operationId, 
            deleted_by: user.email 
        })

        return NextResponse.json({
            message: 'Operation deleted successfully'
        })

    } catch (error) {
        console.error('PayPal operation DELETE error:', error)
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
