import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST - Массовое назначение карт на казино (система многие ко многим)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Проверка аутентификации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData || userData.status !== 'active') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (userData.role !== 'tester') {
      return NextResponse.json({ error: 'Forbidden - только Tester может назначать карты' }, { status: 403 })
    }

    const body = await request.json()
    const { card_ids, casino_id } = body

    console.log('🎯 Mass assignment request:', {
      card_ids,
      casino_id,
      userRole: userData.role
    })

    if (!card_ids || !Array.isArray(card_ids) || card_ids.length === 0) {
      return NextResponse.json({ error: 'Укажите карты для назначения' }, { status: 400 })
    }

    if (!casino_id) {
      return NextResponse.json({ error: 'Укажите казино для назначения' }, { status: 400 })
    }

    // Проверяем что казино существует
    const { data: casino, error: casinoError } = await supabase
      .from('casinos')
      .select('id, name, status')
      .eq('id', casino_id)
      .single()

    if (casinoError || !casino) {
      return NextResponse.json({ error: 'Казино не найдено' }, { status: 404 })
    }

    let assignedCount = 0
    let errors = []

    // Назначаем карты через card_casino_assignments (система многие ко многим)
    for (const cardId of card_ids) {
      try {
        // Проверяем что карта существует и доступна
        const { data: card, error: cardError } = await supabase
          .from('cards')
          .select('id, card_number_mask, status, assigned_to')
          .eq('id', cardId)
          .single()

        if (cardError || !card) {
          errors.push(`Карта ${cardId} не найдена`)
          continue
        }

        if (card.status !== 'active') {
          errors.push(`Карта ${card.card_number_mask} неактивна`)
          continue
        }

        // Проверяем нет ли уже назначения на это казино
        const { data: existingAssignment } = await supabase
          .from('card_casino_assignments')
          .select('id')
          .eq('card_id', cardId)
          .eq('casino_id', casino_id)
          .eq('status', 'active')
          .single()

        if (existingAssignment) {
          errors.push(`Карта ${card.card_number_mask} уже назначена на это казино`)
          continue
        }

        // Создаем назначение
        const { error: assignError } = await supabase
          .from('card_casino_assignments')
          .insert({
            card_id: cardId,
            casino_id: casino_id,
            assigned_by: userData.id,
            assignment_type: 'testing',
            status: 'active'
          })

        if (assignError) {
          errors.push(`Ошибка назначения карты ${card.card_number_mask}: ${assignError.message}`)
          continue
        }

        assignedCount++
        
      } catch (error: any) {
        errors.push(`Ошибка обработки карты ${cardId}: ${error.message}`)
      }
    }

    console.log('✅ Mass assignment result:', {
      totalRequested: card_ids.length,
      assignedCount,
      errorsCount: errors.length
    })

    return NextResponse.json({
      success: true,
      assigned_count: assignedCount,
      total_requested: card_ids.length,
      errors: errors,
      message: `Назначено ${assignedCount} из ${card_ids.length} карт на казино "${casino.name}"`
    })

  } catch (error) {
    console.error('Mass assignment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
