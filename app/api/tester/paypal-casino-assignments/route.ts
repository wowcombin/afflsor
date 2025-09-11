import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить PayPal отметки для казино
export async function GET() {
    try {
        const supabase = await createClient()

        // Проверка аутентификации
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Проверка роли Tester
        const { data: userData } = await supabase
            .from('users')
            .select('id, role, status, email')
            .eq('auth_id', user.id)
            .single()

        if (!userData || userData.role !== 'tester' || userData.status !== 'active') {
            return NextResponse.json({
                error: 'Access denied',
                details: 'Только активные Tester могут просматривать PayPal отметки'
            }, { status: 403 })
        }

        // Получаем PayPal отметки для казино
        const { data: assignments, error } = await supabase
            .from('casino_paypal_assignments')
            .select(`
        id,
        assigned_at,
        is_active,
        test_result,
        notes,
        deposit_test_amount,
        deposit_test_success,
        withdrawal_test_amount,
        withdrawal_test_success,
        test_completed_at,
        casino:casino_id (
          id,
          name,
          url,
          paypal_compatible,
          paypal_notes
        ),
        paypal_account:paypal_account_id (
          id,
          name,
          email,
          status,
          user:user_id (
            email,
            first_name,
            last_name
          )
        ),
        assigned_by_user:assigned_by (
          email,
          first_name,
          last_name
        )
      `)
            .eq('is_active', true)
            .order('assigned_at', { ascending: false })

        if (error) {
            console.error('PayPal casino assignments fetch error:', error)
            return NextResponse.json({
                error: 'Ошибка получения PayPal отметок',
                details: error.message
            }, { status: 500 })
        }

        console.log(`Tester ${userData.email} has ${assignments?.length || 0} PayPal casino assignments`)

        return NextResponse.json({
            success: true,
            assignments: assignments || []
        })

    } catch (error: any) {
        console.error('Tester PayPal assignments API error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}

// POST - Создать PayPal отметку для казино (назначить PayPal для тестирования)
export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // Проверка аутентификации
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Проверка роли Tester
        const { data: userData } = await supabase
            .from('users')
            .select('id, role, status, email')
            .eq('auth_id', user.id)
            .single()

        if (!userData || userData.role !== 'tester' || userData.status !== 'active') {
            return NextResponse.json({
                error: 'Access denied',
                details: 'Только активные Tester могут создавать PayPal отметки'
            }, { status: 403 })
        }

        const body = await request.json()
        const { casino_id, paypal_account_id, notes } = body

        if (!casino_id || !paypal_account_id) {
            return NextResponse.json({
                error: 'Заполните обязательные поля',
                details: 'casino_id и paypal_account_id обязательны'
            }, { status: 400 })
        }

        // Проверяем, что казино существует
        const { data: casino, error: casinoError } = await supabase
            .from('casinos')
            .select('id, name, url, paypal_compatible')
            .eq('id', casino_id)
            .single()

        if (casinoError || !casino) {
            return NextResponse.json({
                error: 'Казино не найдено',
                details: 'Указанное казино не существует'
            }, { status: 404 })
        }

        // Проверяем, что PayPal аккаунт существует
        const { data: paypalAccount, error: paypalError } = await supabase
            .from('paypal_accounts')
            .select('id, name, email, status')
            .eq('id', paypal_account_id)
            .single()

        if (paypalError || !paypalAccount) {
            return NextResponse.json({
                error: 'PayPal аккаунт не найден',
                details: 'Указанный PayPal аккаунт не существует'
            }, { status: 404 })
        }

        // Проверяем, не назначен ли уже этот PayPal аккаунт к этому казино
        const { data: existingAssignment } = await supabase
            .from('casino_paypal_assignments')
            .select('id')
            .eq('casino_id', casino_id)
            .eq('paypal_account_id', paypal_account_id)
            .eq('is_active', true)
            .single()

        if (existingAssignment) {
            return NextResponse.json({
                error: 'PayPal уже назначен для тестирования',
                details: 'Этот PayPal аккаунт уже назначен для тестирования с данным казино'
            }, { status: 400 })
        }

        // Создаем отметку
        const { data: assignment, error: createError } = await supabase
            .from('casino_paypal_assignments')
            .insert({
                casino_id,
                paypal_account_id,
                assigned_by: userData.id,
                notes: notes?.trim() || null
            })
            .select()
            .single()

        if (createError) {
            console.error('PayPal casino assignment creation error:', createError)
            return NextResponse.json({
                error: 'Ошибка создания PayPal отметки',
                details: createError.message
            }, { status: 500 })
        }

        console.log('✅ Tester assigned PayPal for casino testing:', {
            testerEmail: userData.email,
            casinoName: casino.name,
            paypalAccount: paypalAccount.name
        })

        return NextResponse.json({
            success: true,
            assignment,
            message: `PayPal аккаунт ${paypalAccount.name} назначен для тестирования казино ${casino.name}`
        })

    } catch (error: any) {
        console.error('Tester PayPal assignment creation error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}

// PATCH - Обновить результат тестирования PayPal
export async function PATCH(request: Request) {
    try {
        const supabase = await createClient()

        // Проверка аутентификации
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Проверка роли Tester
        const { data: userData } = await supabase
            .from('users')
            .select('id, role, status, email')
            .eq('auth_id', user.id)
            .single()

        if (!userData || userData.role !== 'tester' || userData.status !== 'active') {
            return NextResponse.json({
                error: 'Access denied',
                details: 'Только активные Tester могут обновлять результаты тестирования'
            }, { status: 403 })
        }

        const body = await request.json()
        const {
            assignment_id,
            test_result,
            deposit_test_amount,
            deposit_test_success,
            withdrawal_test_amount,
            withdrawal_test_success,
            notes
        } = body

        if (!assignment_id || !test_result) {
            return NextResponse.json({
                error: 'Заполните обязательные поля',
                details: 'assignment_id и test_result обязательны'
            }, { status: 400 })
        }

        // Проверяем, что отметка существует
        const { data: assignment, error: assignmentError } = await supabase
            .from('casino_paypal_assignments')
            .select('id, casino_id, paypal_account_id')
            .eq('id', assignment_id)
            .eq('is_active', true)
            .single()

        if (assignmentError || !assignment) {
            return NextResponse.json({
                error: 'Отметка не найдена',
                details: 'Указанная отметка не существует или неактивна'
            }, { status: 404 })
        }

        // Обновляем результат тестирования
        const { data: updatedAssignment, error: updateError } = await supabase
            .from('casino_paypal_assignments')
            .update({
                test_result,
                deposit_test_amount: deposit_test_amount || null,
                deposit_test_success: deposit_test_success || null,
                withdrawal_test_amount: withdrawal_test_amount || null,
                withdrawal_test_success: withdrawal_test_success || null,
                test_completed_at: test_result !== 'pending' ? new Date().toISOString() : null,
                notes: notes?.trim() || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', assignment_id)
            .select()
            .single()

        if (updateError) {
            console.error('PayPal assignment update error:', updateError)
            return NextResponse.json({
                error: 'Ошибка обновления результата тестирования',
                details: updateError.message
            }, { status: 500 })
        }

        console.log('✅ Tester updated PayPal test result:', {
            testerEmail: userData.email,
            assignmentId: assignment_id,
            testResult: test_result
        })

        return NextResponse.json({
            success: true,
            assignment: updatedAssignment,
            message: `Результат тестирования обновлен: ${test_result}`
        })

    } catch (error: any) {
        console.error('Tester PayPal assignment update error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}
