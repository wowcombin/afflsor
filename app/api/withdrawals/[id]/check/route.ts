import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { status, comment } = await request.json()
  
  // Проверка роли
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_id', user?.id)
    .single()
  
  if (userData?.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // КРИТИЧНО: Используем функцию с advisory lock для предотвращения race conditions
  const { data, error } = await supabase.rpc('check_withdrawal_safe', {
    p_withdrawal_id: params.id,
    p_checker_id: userData.id,
    p_new_status: status,
    p_comment: comment || null
  })
  
  if (error || !data) {
    return NextResponse.json({ 
      error: 'Не удалось проверить вывод. Возможно, он уже обработан.' 
    }, { status: 400 })
  }
  
  return NextResponse.json({ success: true })
}
