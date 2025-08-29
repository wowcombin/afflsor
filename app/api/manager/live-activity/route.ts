import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
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

    const now = new Date()
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000)

    // Последние 20 действий (последние 10 минут)
    const activities: Array<{
      id: string
      time: string
      user: string
      action: string
      details: string
      type: 'deposit' | 'withdrawal' | 'assignment' | 'other'
      status: string
      impact: 'positive' | 'negative' | 'neutral'
    }> = []

    // 1. Новые депозиты
    const { data: newDeposits } = await supabase
      .from('works')
      .select(`
        id,
        deposit_amount,
        created_at,
        users!inner(first_name, last_name),
        casinos!inner(name)
      `)
      .gte('created_at', tenMinutesAgo.toISOString())
      .order('created_at', { ascending: false })

    newDeposits?.forEach(deposit => {
      const user = Array.isArray(deposit.users) ? deposit.users[0] : deposit.users
      const casino = Array.isArray(deposit.casinos) ? deposit.casinos[0] : deposit.casinos
      
      activities.push({
        id: `deposit_${deposit.id}`,
        time: deposit.created_at,
        user: `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
        action: 'Создал депозит',
        details: `$${deposit.deposit_amount} в ${casino?.name}`,
        type: 'deposit',
        status: 'success',
        impact: 'positive'
      })
    })

    // 2. Новые выводы
    const { data: newWithdrawals } = await supabase
      .from('work_withdrawals')
      .select(`
        id,
        withdrawal_amount,
        status,
        created_at,
        works!inner(
          users!inner(first_name, last_name),
          casinos!inner(name)
        )
      `)
      .gte('created_at', tenMinutesAgo.toISOString())
      .order('created_at', { ascending: false })

    newWithdrawals?.forEach(withdrawal => {
      const work = Array.isArray(withdrawal.works) ? withdrawal.works[0] : withdrawal.works
      const user = Array.isArray(work?.users) ? work.users[0] : work?.users
      const casino = Array.isArray(work?.casinos) ? work.casinos[0] : work?.casinos
      
      activities.push({
        id: `withdrawal_${withdrawal.id}`,
        time: withdrawal.created_at,
        user: `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
        action: 'Создал вывод',
        details: `$${withdrawal.withdrawal_amount} из ${casino?.name}`,
        type: 'withdrawal',
        status: withdrawal.status,
        impact: withdrawal.status === 'received' ? 'positive' : 
                withdrawal.status === 'block' ? 'negative' : 'neutral'
      })
    })

    // 3. Назначения карт
    const { data: cardAssignments } = await supabase
      .from('card_assignments')
      .select(`
        id,
        assigned_at,
        users!inner(first_name, last_name),
        cards!inner(card_number_mask),
        casinos!inner(name)
      `)
      .gte('assigned_at', tenMinutesAgo.toISOString())
      .order('assigned_at', { ascending: false })

    cardAssignments?.forEach(assignment => {
      const user = Array.isArray(assignment.users) ? assignment.users[0] : assignment.users
      const card = Array.isArray(assignment.cards) ? assignment.cards[0] : assignment.cards
      const casino = Array.isArray(assignment.casinos) ? assignment.casinos[0] : assignment.casinos
      
      activities.push({
        id: `assignment_${assignment.id}`,
        time: assignment.assigned_at,
        user: 'Manager',
        action: 'Назначил карту',
        details: `${card?.card_number_mask} → ${user?.first_name} ${user?.last_name} (${casino?.name})`,
        type: 'assignment',
        status: 'success',
        impact: 'positive'
      })
    })

    // Сортируем по времени (новые первые)
    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

    // Берем только последние 20
    const recentActivities = activities.slice(0, 20)

    // Статистика активности
    const stats = {
      totalActivities: activities.length,
      depositsCount: activities.filter(a => a.type === 'deposit').length,
      withdrawalsCount: activities.filter(a => a.type === 'withdrawal').length,
      assignmentsCount: activities.filter(a => a.type === 'assignment').length,
      successfulActions: activities.filter(a => a.impact === 'positive').length,
      problematicActions: activities.filter(a => a.impact === 'negative').length
    }

    // Онлайн Junior (активность за последние 15 минут)
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000)
    
    const { data: onlineJuniors } = await supabase
      .from('works')
      .select('junior_id')
      .gte('created_at', fifteenMinutesAgo.toISOString())

    const onlineJuniorIds = new Set(onlineJuniors?.map(w => w.junior_id) || [])

    const { data: allJuniors } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('role', 'junior')
      .eq('status', 'active')

    const onlineCount = allJuniors?.filter(j => onlineJuniorIds.has(j.id)).length || 0
    const totalJuniors = allJuniors?.length || 0

    return NextResponse.json({
      activities: recentActivities,
      stats,
      teamStatus: {
        onlineJuniors: onlineCount,
        totalJuniors,
        onlinePercentage: totalJuniors > 0 ? Math.round((onlineCount / totalJuniors) * 100) : 0
      },
      lastUpdate: now.toISOString()
    })

  } catch (error) {
    console.error('Ошибка загрузки live activity:', error)
    return NextResponse.json({
      error: 'Ошибка загрузки активности'
    }, { status: 500 })
  }
}
