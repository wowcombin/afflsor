import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  
  // Проверка роли HR
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', user?.id)
    .single()
  
  if (!['hr', 'admin'].includes(userData?.role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  try {
    // Всего активных сотрудников
    const { count: total_employees } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .eq('status', 'active')
    
    // Количество Junior
    const { count: juniors_count } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .eq('role', 'junior')
      .eq('status', 'active')
    
    // Средний профит за последний месяц
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    lastMonth.setDate(1)
    
    const { data: profits } = await supabase
      .from('work_withdrawals')
      .select(`
        withdrawal_amount,
        works!inner(
          deposit_amount,
          junior_id,
          users!inner(role)
        )
      `)
      .eq('status', 'received')
      .eq('works.users.role', 'junior')
      .gte('created_at', lastMonth.toISOString())
    
    const totalProfit = profits?.reduce((sum, w: any) => 
      sum + (w.withdrawal_amount - w.works.deposit_amount), 0) || 0
    const average_profit = juniors_count ? totalProfit / juniors_count : 0
    
    // Пользователи без подписанного NDA (заглушка)
    const { data: pending_nda } = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .eq('status', 'active')
      .is('nda_signed_at', null)
      .limit(10)
    
    // Новые сотрудники за 7 дней
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    
    const { data: recent_hires } = await supabase
      .from('users')
      .select('id, first_name, last_name, role, created_at')
      .gte('created_at', weekAgo.toISOString())
      .order('created_at', { ascending: false })
    
    return NextResponse.json({
      total_employees: total_employees || 0,
      juniors_count: juniors_count || 0,
      average_profit,
      pending_nda: pending_nda || [],
      recent_hires: recent_hires || []
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
