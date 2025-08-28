import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Отключаем статическую генерацию для этого API route
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    // Проверка роли Manager
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', user.id)
      .single()
    
    if (userData?.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all' // all, assigned, unassigned, available

    // Получаем карты с полной информацией
    let query = supabase
      .from('cards')
      .select(`
        id,
        card_number_mask,
        card_bin,
        card_last4,
        exp_month,
        exp_year,
        type,
        status,
        created_at,
        bank_accounts!inner (
          id,
          holder_name,
          balance,
          status,
          banks!inner (
            id,
            name,
            country,
            currency
          )
        ),
        card_assignments (
          id,
          junior_id,
          casino_id,
          status,
          assigned_at,
          users!inner (
            id,
            first_name,
            last_name,
            email
          ),
          casinos (
            id,
            name
          )
        )
      `)

    // Применяем фильтры
    if (filter === 'available') {
      // Карты с балансом >= 10 и активным статусом
      query = query
        .eq('status', 'active')
        .eq('bank_accounts.status', 'active')
        .gte('bank_accounts.balance', 10)
    } else if (filter === 'assigned') {
      // Карты с активными назначениями
      query = query.not('card_assignments', 'is', null)
    } else if (filter === 'unassigned') {
      // Карты без назначений
      query = query.is('card_assignments', null)
    }

    const { data: cards, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Обрабатываем данные для удобства фронтенда
    const processedCards = cards?.map(card => ({
      ...card,
      bank: card.bank_accounts.banks,
      bank_account: {
        id: card.bank_accounts.id,
        holder_name: card.bank_accounts.holder_name,
        balance: card.bank_accounts.balance,
        status: card.bank_accounts.status
      },
      assignments: card.card_assignments || [],
      is_available: card.status === 'active' && 
                   card.bank_accounts.status === 'active' && 
                   card.bank_accounts.balance >= 10,
      active_assignments: card.card_assignments?.filter(a => a.status === 'assigned') || []
    })) || []

    return NextResponse.json({ cards: processedCards })

  } catch (error) {
    console.error('Error fetching cards:', error)
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера' 
    }, { status: 500 })
  }
}
