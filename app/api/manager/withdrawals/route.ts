import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить все выводы для проверки менеджером
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

    // Получаем выводы с полной информацией
    const { data: withdrawals, error } = await supabase
      .from('test_withdrawals')
      .select(`
        *,
        work:casino_tests (
          id,
          deposit_amount,
          deposit_date,
          casino:casinos (
            id,
            name,
            company,
            url
          ),
          tester:users (
            id,
            first_name,
            last_name,
            email,
            telegram_username
          ),
          card:cards (
            id,
            card_number_mask,
            card_bin,
            status,
            card_type
          )
        )
      `)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data: withdrawals || [],
      count: withdrawals?.length || 0
    })

  } catch (error) {
    console.error('Manager withdrawals error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Массовые операции с выводами
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Проверка аутентификации и роли
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, role, status')
      .eq('auth_id', user.id)
      .single()

    if (!userData || userData.status !== 'active' || userData.role !== 'manager') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { action, withdrawal_ids, comment } = body

    if (!action || !withdrawal_ids || !Array.isArray(withdrawal_ids)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    let updateData: any = { updated_at: new Date().toISOString() }
    
    switch (action) {
      case 'bulk_approve':
        updateData.withdrawal_status = 'approved'
        break
      case 'bulk_reject':
        updateData.withdrawal_status = 'rejected'
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Обновляем выводы
    const { error: updateError } = await supabase
      .from('test_withdrawals')
      .update(updateData)
      .in('id', withdrawal_ids)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update withdrawals' }, { status: 500 })
    }

    // Логируем действие
    for (const withdrawalId of withdrawal_ids) {
      await supabase
        .from('action_history')
        .insert({
          action_type: action === 'bulk_approve' ? 'approve' : 'reject',
          entity_type: 'test_withdrawal',
          entity_id: withdrawalId,
          change_description: `Manager ${action} withdrawal${comment ? `: ${comment}` : ''}`,
          performed_by: userData.id
        })
    }

    return NextResponse.json({ 
      success: true, 
      message: `${withdrawal_ids.length} withdrawals ${action === 'bulk_approve' ? 'approved' : 'rejected'}`,
      updated_count: withdrawal_ids.length
    })

  } catch (error) {
    console.error('Bulk withdrawals error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
