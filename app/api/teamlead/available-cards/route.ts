import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить доступные карты для Team Lead'а (из назначенных банков)
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Проверка аутентификации
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверка роли Team Lead
    const { data: userData } = await supabase
      .from('users')
      .select('id, role, status, email')
      .eq('auth_id', user.id)
      .single()

    if (!userData || userData.role !== 'teamlead' || userData.status !== 'active') {
      return NextResponse.json({ 
        error: 'Access denied',
        details: 'Только активные Team Lead могут просматривать доступные карты'
      }, { status: 403 })
    }

    // Получаем банки, назначенные этому Team Lead'у
    const { data: bankAssignments, error: banksError } = await supabase
      .from('bank_teamlead_assignments')
      .select('bank_id')
      .eq('teamlead_id', userData.id)
      .eq('is_active', true)

    if (banksError) {
      console.error('Team Lead banks error:', banksError)
      return NextResponse.json({ 
        error: 'Ошибка получения назначенных банков',
        details: banksError.message
      }, { status: 500 })
    }

    if (!bankAssignments || bankAssignments.length === 0) {
      return NextResponse.json({
        success: true,
        cards: [],
        message: 'Нет назначенных банков'
      })
    }

    const assignedBankIds = bankAssignments.map(ba => ba.bank_id)

    // Получаем доступные карты из назначенных банков
    const { data: availableCards, error: cardsError } = await supabase
      .from('cards')
      .select(`
        id,
        card_number,
        expiry_date,
        cvv,
        cardholder_name,
        status,
        bank_id,
        bin,
        created_at,
        banks!inner (
          id,
          name,
          country,
          is_active
        )
      `)
      .in('bank_id', assignedBankIds)
      .eq('status', 'available')
      .eq('banks.is_active', true)
      .order('created_at', { ascending: false })

    if (cardsError) {
      console.error('Available cards error:', cardsError)
      return NextResponse.json({ 
        error: 'Ошибка получения доступных карт',
        details: cardsError.message
      }, { status: 500 })
    }

    console.log(`Team Lead ${userData.email} has ${availableCards?.length || 0} available cards from ${assignedBankIds.length} assigned banks`)

    return NextResponse.json({
      success: true,
      cards: availableCards || [],
      assigned_banks_count: assignedBankIds.length
    })

  } catch (error: any) {
    console.error('Team Lead available cards API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}
