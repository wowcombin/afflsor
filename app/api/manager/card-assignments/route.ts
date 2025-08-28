import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Отключаем статическую генерацию для этого API route
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { card_id, junior_id, casino_id } = await request.json()
    
    // Проверка роли Manager
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, role')
      .eq('auth_id', user.id)
      .single()
    
    if (userData?.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Валидация входных данных
    if (!card_id || !junior_id || !casino_id) {
      return NextResponse.json({ 
        error: 'Необходимо указать карту, Junior\'а и казино' 
      }, { status: 400 })
    }

    // Проверяем, что карта доступна
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select(`
        id,
        status,
        card_bin,
        bank_accounts!inner (
          balance,
          status
        )
      `)
      .eq('id', card_id)
      .single()

    if (cardError || !card) {
      return NextResponse.json({ error: 'Карта не найдена' }, { status: 404 })
    }

    if (card.status !== 'active') {
      return NextResponse.json({ 
        error: 'Карта неактивна' 
      }, { status: 400 })
    }

    if (card.bank_accounts.balance < 10) {
      return NextResponse.json({ 
        error: 'Недостаточный баланс банка (минимум $10)' 
      }, { status: 400 })
    }

    // Проверяем, что Junior существует и активен
    const { data: junior, error: juniorError } = await supabase
      .from('users')
      .select('id, status')
      .eq('id', junior_id)
      .eq('role', 'junior')
      .single()

    if (juniorError || !junior) {
      return NextResponse.json({ error: 'Junior не найден' }, { status: 404 })
    }

    if (junior.status !== 'active') {
      return NextResponse.json({ 
        error: 'Junior неактивен' 
      }, { status: 400 })
    }

    // Проверяем, что казино существует
    const { data: casino, error: casinoError } = await supabase
      .from('casinos')
      .select('id, name, allowed_bins')
      .eq('id', casino_id)
      .single()

    if (casinoError || !casino) {
      return NextResponse.json({ error: 'Казино не найдено' }, { status: 404 })
    }

    // Проверяем BIN-совместимость
    if (casino.allowed_bins && casino.allowed_bins.length > 0) {
      if (!casino.allowed_bins.includes(card.card_bin)) {
        return NextResponse.json({ 
          error: `BIN карты ${card.card_bin} не поддерживается казино ${casino.name}` 
        }, { status: 400 })
      }
    }

    // Проверяем, нет ли уже активного назначения этой карты этому Junior'у в этом казино
    const { data: existingAssignment } = await supabase
      .from('card_assignments')
      .select('id')
      .eq('card_id', card_id)
      .eq('junior_id', junior_id)
      .eq('casino_id', casino_id)
      .eq('status', 'assigned')
      .single()

    if (existingAssignment) {
      return NextResponse.json({ 
        error: 'Карта уже назначена этому Junior\'у для этого казино' 
      }, { status: 400 })
    }

    // Создаем назначение
    const { data: assignment, error: assignmentError } = await supabase
      .from('card_assignments')
      .insert({
        card_id,
        junior_id,
        casino_id,
        assigned_by: userData.id,
        status: 'assigned'
      })
      .select(`
        id,
        status,
        assigned_at,
        cards (
          id,
          card_number_mask
        ),
        users (
          id,
          first_name,
          last_name,
          email
        ),
        casinos (
          id,
          name
        )
      `)
      .single()

    if (assignmentError) {
      return NextResponse.json({ 
        error: 'Ошибка создания назначения: ' + assignmentError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: `Карта ${assignment.cards.card_number_mask} назначена Junior'у ${assignment.users.first_name} ${assignment.users.last_name} для казино ${assignment.casinos.name}`,
      assignment
    })

  } catch (error) {
    console.error('Error creating card assignment:', error)
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера' 
    }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const assignmentId = searchParams.get('id')
    
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

    if (!assignmentId) {
      return NextResponse.json({ 
        error: 'ID назначения не указан' 
      }, { status: 400 })
    }

    // Проверяем, что назначение существует
    const { data: assignment, error: fetchError } = await supabase
      .from('card_assignments')
      .select(`
        id,
        status,
        cards (card_number_mask),
        users (first_name, last_name),
        casinos (name)
      `)
      .eq('id', assignmentId)
      .single()

    if (fetchError || !assignment) {
      return NextResponse.json({ error: 'Назначение не найдено' }, { status: 404 })
    }

    // Удаляем назначение
    const { error: deleteError } = await supabase
      .from('card_assignments')
      .delete()
      .eq('id', assignmentId)

    if (deleteError) {
      return NextResponse.json({ 
        error: 'Ошибка удаления назначения: ' + deleteError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: `Назначение карты ${assignment.cards.card_number_mask} отменено`
    })

  } catch (error) {
    console.error('Error deleting card assignment:', error)
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера' 
    }, { status: 500 })
  }
}
