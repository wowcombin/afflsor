import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить PayPal аккаунты (для всех ролей кроме Junior)
export async function GET() {
    try {
        const supabase = await createClient()

        // Проверка аутентификации
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Получаем данные пользователя
        const { data: userData } = await supabase
            .from('users')
            .select('id, role, status, email')
            .eq('auth_id', user.id)
            .single()

        if (!userData || userData.status !== 'active') {
            return NextResponse.json({
                error: 'Access denied',
                details: 'Пользователь неактивен'
            }, { status: 403 })
        }

        let query = supabase
            .from('paypal_accounts')
            .select(`
        id,
        name,
        email,
        phone_number,
        authenticator_url,
        date_created,
        balance,
        sender_paypal_email,
        balance_send,
        send_paypal_balance,
        info,
        status,
        created_at,
        updated_at,
        user:user_id (
          id,
          email,
          first_name,
          last_name,
          role,
          team_lead_id
        )
      `)

        // Фильтрация по ролям
        switch (userData.role) {
            case 'junior':
                // Junior видит только свои PayPal аккаунты
                query = query.eq('user_id', userData.id)
                break

            case 'teamlead':
                // Team Lead видит PayPal аккаунты своих Junior'ов
                const { data: teamJuniors } = await supabase
                    .from('users')
                    .select('id')
                    .eq('team_lead_id', userData.id)
                    .eq('role', 'junior')
                    .eq('status', 'active')

                const juniorIds = teamJuniors?.map(j => j.id) || []
                juniorIds.push(userData.id) // Включаем себя (если у Team Lead есть свои PayPal)

                if (juniorIds.length > 0) {
                    query = query.in('user_id', juniorIds)
                } else {
                    // Если нет Junior'ов, возвращаем пустой массив
                    return NextResponse.json({ success: true, accounts: [] })
                }
                break

            case 'manager':
            case 'cfo':
            case 'hr':
            case 'tester':
            case 'admin':
                // Эти роли видят все PayPal аккаунты
                // Запрос уже настроен для получения всех аккаунтов
                break

            default:
                return NextResponse.json({
                    error: 'Access denied',
                    details: 'Недостаточно прав для просмотра PayPal аккаунтов'
                }, { status: 403 })
        }

        const { data: accounts, error } = await query
            .order('created_at', { ascending: false })

        if (error) {
            console.error('PayPal accounts fetch error:', error)
            return NextResponse.json({
                error: 'Ошибка получения PayPal аккаунтов',
                details: error.message
            }, { status: 500 })
        }

        console.log(`User ${userData.email} (${userData.role}) fetched ${accounts?.length || 0} PayPal accounts`)

        return NextResponse.json({
            success: true,
            accounts: accounts || []
        })

    } catch (error: any) {
        console.error('PayPal accounts API error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}
