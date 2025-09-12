import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// POST - Выпустить розовую карту TeamLead'ом
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Проверка аутентификации
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Проверка роли TeamLead
        const { data: userData } = await supabase
            .from('users')
            .select('id, role, status, email')
            .eq('auth_id', user.id)
            .single()

        if (!userData || userData.role !== 'teamlead' || userData.status !== 'active') {
            return NextResponse.json({
                error: 'Access denied',
                details: 'Только активные Team Lead могут выпускать карты'
            }, { status: 403 })
        }

        const body = await request.json()
        const {
            bank_account_id,
            card_number_mask,
            card_bin,
            exp_month,
            exp_year,
            daily_limit,
            notes,
            pan_encrypted,
            cvv_encrypted,
            encryption_key_id
        } = body

        // Валидация обязательных полей
        if (!bank_account_id || !card_number_mask || !card_bin || !exp_month || !exp_year) {
            return NextResponse.json({
                error: 'Отсутствуют обязательные поля',
                details: 'bank_account_id, card_number_mask, card_bin, exp_month, exp_year обязательны'
            }, { status: 400 })
        }

        // Проверяем, что банковский аккаунт назначен этому TeamLead'у
        const { data: bankCheck, error: bankCheckError } = await supabase
            .from('bank_teamlead_assignments')
            .select(`
        bank_id,
        banks!inner(
          id,
          name,
          bank_accounts!inner(
            id,
            holder_name
          )
        )
      `)
            .eq('teamlead_id', userData.id)
            .eq('is_active', true)

        if (bankCheckError) {
            console.error('Bank check error:', bankCheckError)
            return NextResponse.json({
                error: 'Ошибка проверки доступа к банку',
                details: bankCheckError.message
            }, { status: 500 })
        }

        // Проверяем, что аккаунт принадлежит назначенному банку
        const hasAccess = bankCheck?.some((assignment: any) =>
            assignment.banks.bank_accounts.some((account: any) => account.id === bank_account_id)
        )

        if (!hasAccess) {
            return NextResponse.json({
                error: 'Доступ запрещен',
                details: 'Этот банковский аккаунт не назначен вам'
            }, { status: 403 })
        }

        console.log(`TeamLead ${userData.email} issuing pink card for account ${bank_account_id}`)

        // Создаем розовую карту
        const { data: newCard, error: cardError } = await supabase
            .from('cards')
            .insert({
                bank_account_id,
                card_number_mask,
                card_bin,
                card_type: 'pink',
                exp_month: parseInt(exp_month),
                exp_year: parseInt(exp_year),
                status: 'active',
                daily_limit: daily_limit ? parseFloat(daily_limit) : null,
                notes: notes || `Выпущена TeamLead ${userData.email}`,
                created_at: new Date().toISOString()
            })
            .select()
            .single()

        if (cardError) {
            console.error('Card creation error:', cardError)
            return NextResponse.json({
                error: 'Ошибка создания карты',
                details: cardError.message
            }, { status: 500 })
        }

        // Если предоставлены зашифрованные данные, сохраняем их
        if (pan_encrypted && cvv_encrypted && encryption_key_id) {
            const { error: secretsError } = await supabase
                .from('card_secrets')
                .insert({
                    card_id: newCard.id,
                    pan_encrypted,
                    cvv_encrypted,
                    encryption_key_id
                })

            if (secretsError) {
                console.error('Card secrets error:', secretsError)
                // Не возвращаем ошибку, так как карта уже создана
                console.log('Card created but secrets not saved:', secretsError.message)
            }
        }

        // Логируем создание карты
        const { error: logError } = await supabase
            .from('card_access_log')
            .insert({
                card_id: newCard.id,
                user_id: userData.id,
                access_type: 'create',
                success: true,
                context: {
                    action: 'card_issued_by_teamlead',
                    bank_account_id,
                    card_type: 'pink'
                }
            })

        if (logError) {
            console.error('Access log error:', logError)
        }

        return NextResponse.json({
            success: true,
            card: newCard,
            message: 'Розовая карта успешно выпущена'
        })

    } catch (error) {
        console.error('TeamLead issue card API error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
