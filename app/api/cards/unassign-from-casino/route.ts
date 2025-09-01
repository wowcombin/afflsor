import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST - Отзыв карты с казино (система многие ко многим)
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
      return NextResponse.json({ error: 'Forbidden - только Tester может отзывать карты' }, { status: 403 })
    }

    const body = await request.json()
    const { card_id, casino_id } = body

    console.log('🎯 Unassign request:', {
      card_id,
      casino_id,
      userRole: userData.role
    })

    if (!card_id) {
      return NextResponse.json({ error: 'Укажите карту' }, { status: 400 })
    }

    if (!casino_id) {
      return NextResponse.json({ error: 'Укажите казино' }, { status: 400 })
    }

    // Удаляем назначение из card_casino_assignments
    const { error: deleteError } = await supabase
      .from('card_casino_assignments')
      .delete()
      .eq('card_id', card_id)
      .eq('casino_id', casino_id)
      .eq('status', 'active')

    if (deleteError) {
      console.error('❌ Delete error:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // Получаем информацию о карте и казино для логирования
    const { data: card } = await supabase
      .from('cards')
      .select('card_number_mask')
      .eq('id', card_id)
      .single()

    const { data: casino } = await supabase
      .from('casinos')
      .select('name')
      .eq('id', casino_id)
      .single()

    console.log('✅ Card unassigned successfully:', {
      cardId: card_id,
      casinoId: casino_id
    })

    return NextResponse.json({
      success: true,
      message: `Карта ${card?.card_number_mask || 'неизвестная'} отозвана с казино "${casino?.name || 'неизвестное'}"`
    })

  } catch (error) {
    console.error('Unassign error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
