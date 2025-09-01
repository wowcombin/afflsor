import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Получить статистику для дашборда
export async function GET(request: Request) {
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
      .select('role, status, id')
      .eq('auth_id', user.id)
      .single()

    if (!userData || userData.status !== 'active') {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') || userData.role

    let stats = {}

    switch (role) {
      case 'junior':
        // Статистика для Junior
        stats = await getJuniorStats(supabase, userData.id)
        break
        
      case 'manager':
        // Статистика для Manager
        stats = await getManagerStats(supabase)
        break
        
      case 'hr':
        // Статистика для HR
        stats = await getHRStats(supabase)
        break
        
      case 'cfo':
        // Статистика для CFO
        stats = await getCFOStats(supabase)
        break
        
      case 'tester':
        // Статистика для Tester
        stats = await getTesterStats(supabase)
        break
        
      case 'admin':
        // Статистика для Admin
        stats = await getAdminStats(supabase)
        break
        
      default:
        stats = { message: 'No stats available for this role' }
    }

    return NextResponse.json({ success: true, stats, role })

  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getJuniorStats(supabase: any, userId: string) {
  // Пока возвращаем заглушку
  return {
    profit_month: 0,
    success_rate: 0,
    ranking: 0,
    days_to_payout: 0,
    total_works: 0,
    pending_withdrawals: 0
  }
}

async function getManagerStats(supabase: any) {
  // Пока возвращаем заглушку
  return {
    pending_withdrawals: 0,
    team_size: 0,
    team_profit: 0,
    critical_alerts: 0
  }
}

async function getHRStats(supabase: any) {
  try {
    // Получаем количество активных пользователей
    const { count: activeUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    // Получаем количество пользователей созданных в этом месяце
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: newUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString())

    return {
      active_employees: activeUsers || 0,
      new_employees: newUsers || 0,
      avg_efficiency: 0,
      nda_signed: 0
    }
  } catch (error) {
    console.error('HR stats error:', error)
    return {
      active_employees: 0,
      new_employees: 0,
      avg_efficiency: 0,
      nda_signed: 0
    }
  }
}

async function getCFOStats(supabase: any) {
  return {
    profit_loss: 0,
    expenses: 0,
    payouts_pending: 0,
    roi: 0
  }
}

async function getTesterStats(supabase: any) {
  return {
    casinos_tested: 0,
    approved: 0,
    rejected: 0,
    in_progress: 0
  }
}

async function getAdminStats(supabase: any) {
  return {
    active_sessions: 0,
    system_alerts: 0,
    operations_per_day: 0,
    avg_response_time: 0
  }
}
