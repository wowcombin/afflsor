import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить все карты для менеджера
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Проверка аутентификации и роли
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData || userData.status !== 'active' || userData.role !== 'manager') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Получаем все карты с полной информацией
    const { data: cards, error } = await supabase
      .from('cards')
      .select(`
        *,
        bank_account:bank_accounts (
          id,
          holder_name,
          balance,
          currency,
          is_active,
          balance_updated_at,
          bank:banks (
            id,
            name,
            country,
            currency
          )
        ),
        assigned_user:users (
          id,
          first_name,
          last_name,
          email,
          telegram_username,
          status
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Группируем статистику
    const stats = {
      total_cards: cards?.length || 0,
      available_cards: cards?.filter(c => 
        !c.assigned_to && 
        c.status === 'active' && 
        (c.bank_account?.balance || 0) >= 10
      ).length || 0,
      assigned_cards: cards?.filter(c => c.assigned_to).length || 0,
      blocked_cards: cards?.filter(c => c.status === 'blocked').length || 0,
      total_balance: cards?.reduce((sum, c) => sum + (c.bank_account?.balance || 0), 0) || 0
    }

    return NextResponse.json({ 
      success: true, 
      data: cards || [],
      stats
    })

  } catch (error) {
    console.error('Manager cards error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
