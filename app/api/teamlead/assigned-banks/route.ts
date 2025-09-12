import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET - Получить назначенные банки и аккаунты для TeamLead'а
export async function GET() {
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
        details: 'Только активные Team Lead могут просматривать назначенные банки'
      }, { status: 403 })
    }

    console.log('TeamLead requesting assigned banks:', userData.email)

    // Получаем банки, назначенные этому TeamLead'у
    const { data: bankAssignments, error: banksError } = await supabase
      .from('bank_teamlead_assignments')
      .select(`
        bank_id,
        assigned_at,
        is_active,
        banks!inner(
          id,
          name,
          country,
          currency,
          is_active,
          bank_accounts(
            id,
            holder_name,
            account_number,
            balance,
            currency,
            is_active,
            sort_code,
            bank_url,
            login_password,
            balance_updated_at,
            cards(
              id,
              card_number_mask,
              card_bin,
              card_type,
              status,
              assigned_to,
              exp_month,
              exp_year,
              daily_limit,
              notes,
              created_at
            )
          )
        )
      `)
      .eq('teamlead_id', userData.id)
      .eq('is_active', true)

    if (banksError) {
      console.error('TeamLead assigned banks error:', banksError)
      return NextResponse.json({ 
        error: 'Ошибка получения назначенных банков',
        details: banksError.message
      }, { status: 500 })
    }

    if (!bankAssignments || bankAssignments.length === 0) {
      return NextResponse.json({
        success: true,
        banks: [],
        stats: {
          totalBanks: 0,
          totalAccounts: 0,
          totalBalance: 0,
          totalCards: 0,
          activeCards: 0
        },
        message: 'Нет назначенных банков'
      })
    }

    // Форматируем данные и считаем статистику
    const assignedBanks = bankAssignments.map(assignment => ({
      ...assignment.banks,
      assigned_at: assignment.assigned_at,
      accounts: (assignment.banks as any).bank_accounts || []
    }))

    // Подсчитываем статистику
    let totalAccounts = 0
    let totalBalance = 0
    let totalCards = 0
    let activeCards = 0

    assignedBanks.forEach((bank: any) => {
      totalAccounts += bank.accounts.length
      bank.accounts.forEach((account: any) => {
        totalBalance += account.balance || 0
        totalCards += account.cards?.length || 0
        activeCards += account.cards?.filter((card: any) => card.status === 'active').length || 0
      })
    })

    console.log(`TeamLead ${userData.email} has ${assignedBanks.length} assigned banks`)

    return NextResponse.json({
      success: true,
      banks: assignedBanks,
      stats: {
        totalBanks: assignedBanks.length,
        totalAccounts,
        totalBalance,
        totalCards,
        activeCards
      }
    })

  } catch (error) {
    console.error('TeamLead assigned banks API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}