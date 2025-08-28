import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  
  // Проверка роли Manager
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', user?.id)
    .single()
  
  if (userData?.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // Получение очереди выводов
  const { data: withdrawals, error } = await supabase
    .from('work_withdrawals')
    .select(`
      *,
      works!inner(
        deposit_amount,
        junior_id,
        users!inner(first_name, last_name),
        casinos!inner(name),
        cards!inner(card_number_mask)
      )
    `)
    .in('status', ['new', 'waiting'])
    .order('created_at', { ascending: true })
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  // Добавляем расчет профита
  const withdrawalsWithProfit = withdrawals.map(w => ({
    ...w,
    profit: w.withdrawal_amount - w.works.deposit_amount,
    waiting_minutes: Math.floor((Date.now() - new Date(w.created_at).getTime()) / 60000)
  }))
  
  return NextResponse.json({ withdrawals: withdrawalsWithProfit })
}
